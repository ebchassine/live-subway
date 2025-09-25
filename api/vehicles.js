import GtfsRealtimeBindings from "gtfs-realtime-bindings"

// Feed mapping for MTA GTFS-RT endpoints
const FEED_URLS = {
  "123456S": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  ACE: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  BDFM: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  G: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  JZ: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  NQRW: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  L: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
}

// Simple in-memory cache
const cache = new Map()
const CACHE_DURATION = 10000 // 10 seconds

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { feed } = req.query

  if (!feed || !FEED_URLS[feed]) {
    return res.status(400).json({
      error: "Invalid feed parameter",
      availableFeeds: Object.keys(FEED_URLS),
    })
  }

  const cacheKey = `vehicles_${feed}`
  const cached = cache.get(cacheKey)

  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return res.status(200).json({
      data: cached.data,
      timestamp: cached.timestamp,
      cached: true,
    })
  }

  try {
    console.log(`Fetching GTFS-RT data for feed: ${feed}`)

    const response = await fetch(FEED_URLS[feed], {
      headers: {
        "User-Agent": "NYC-Subway-Map/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const feed_message = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer))

    const vehicles = []
    const timestamp = Date.now()

    for (const entity of feed_message.entity) {
      if (entity.vehicle && entity.vehicle.position) {
        const vehicle = entity.vehicle
        const position = vehicle.position

        // Extract route ID from trip or vehicle
        let routeId = null
        if (vehicle.trip && vehicle.trip.routeId) {
          routeId = vehicle.trip.routeId
        }

        // Skip if no route ID or position
        if (!routeId || !position.latitude || !position.longitude) {
          continue
        }

        vehicles.push({
          trainId: entity.id || `${routeId}_${Date.now()}_${Math.random()}`,
          routeId: routeId,
          lat: position.latitude,
          lon: position.longitude,
          bearing: position.bearing || 0,
          timestamp: vehicle.timestamp ? vehicle.timestamp * 1000 : timestamp,
          tripId: vehicle.trip ? vehicle.trip.tripId : null,
          status: vehicle.currentStatus || "IN_TRANSIT_TO",
          stopId: vehicle.stopId || null,
        })
      }
    }

    // Cache the result
    cache.set(cacheKey, {
      data: vehicles,
      timestamp: timestamp,
    })

    console.log(`Found ${vehicles.length} vehicles for feed ${feed}`)

    res.status(200).json({
      data: vehicles,
      timestamp: timestamp,
      cached: false,
    })
  } catch (error) {
    console.error("Error fetching GTFS-RT data:", error)

    // Return cached data if available, even if expired
    if (cached) {
      return res.status(200).json({
        data: cached.data,
        timestamp: cached.timestamp,
        cached: true,
        warning: "Using stale data due to fetch error",
      })
    }

    res.status(500).json({
      error: "Failed to fetch vehicle data",
      message: error.message,
    })
  }
}
