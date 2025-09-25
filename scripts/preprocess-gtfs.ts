import { promises as fs } from "fs"
import path from "path"

interface Stop {
  stop_id: string
  stop_name: string
  stop_lat: number
  stop_lon: number
  location_type?: number
  parent_station?: string
}

interface Route {
  route_id: string
  route_short_name: string
  route_long_name: string
  route_color: string
  route_text_color: string
}

interface Trip {
  trip_id: string
  route_id: string
  shape_id: string
  direction_id: number
  trip_headsign?: string
}

interface Shape {
  shape_id: string
  shape_pt_lat: number
  shape_pt_lon: number
  shape_pt_sequence: number
}

interface StopTime {
  trip_id: string
  stop_id: string
  stop_sequence: number
  arrival_time?: string
  departure_time?: string
}

/**
 * Preprocesses GTFS static data into optimized JSON files for the web app
 *
 * Usage:
 * 1. Download GTFS static data from http://web.mta.info/developers/data/nyct/subway/google_transit.zip
 * 2. Extract to a folder (e.g., ./gtfs-data/)
 * 3. Run: npm run preprocess
 *
 * This will generate optimized JSON files in the /data directory
 */

const GTFS_DATA_PATH = process.env.GTFS_DATA_PATH || "./gtfs-data"
const OUTPUT_PATH = "./data"

// Routes to process (can be expanded)
const TARGET_ROUTES = ["1", "4", "6", "A", "C", "E", "L", "N", "Q", "R"]

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    const lines = content.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""))

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.replace(/"/g, ""))
      const obj: any = {}

      headers.forEach((header, index) => {
        const value = values[index]
        // Convert numeric fields
        if (header.includes("lat") || header.includes("lon") || header.includes("sequence")) {
          obj[header] = Number.parseFloat(value) || 0
        } else if (header.includes("direction_id") || header.includes("location_type")) {
          obj[header] = Number.parseInt(value) || 0
        } else {
          obj[header] = value
        }
      })

      return obj as T
    })
  } catch (error) {
    console.error(`Error parsing CSV file ${filePath}:`, error)
    return []
  }
}

async function processRoutes() {
  console.log("Processing routes...")

  const routes = await parseCSV<Route>(path.join(GTFS_DATA_PATH, "routes.txt"))
  const filteredRoutes = routes.filter((route) => TARGET_ROUTES.includes(route.route_short_name || route.route_id))

  await fs.writeFile(path.join(OUTPUT_PATH, "routes.json"), JSON.stringify(filteredRoutes, null, 2))

  console.log(`Processed ${filteredRoutes.length} routes`)
  return filteredRoutes
}

async function processStops(routes: Route[]) {
  console.log("Processing stops...")

  const stops = await parseCSV<Stop>(path.join(GTFS_DATA_PATH, "stops.txt"))
  const trips = await parseCSV<Trip>(path.join(GTFS_DATA_PATH, "trips.txt"))
  const stopTimes = await parseCSV<StopTime>(path.join(GTFS_DATA_PATH, "stop_times.txt"))

  // Create route-specific stop files
  for (const route of routes) {
    const routeTrips = trips.filter((trip) => trip.route_id === route.route_id)
    const routeTripIds = new Set(routeTrips.map((trip) => trip.trip_id))

    const routeStopTimes = stopTimes.filter((st) => routeTripIds.has(st.trip_id))
    const routeStopIds = new Set(routeStopTimes.map((st) => st.stop_id))

    const routeStops = stops
      .filter((stop) => routeStopIds.has(stop.stop_id) && stop.location_type !== 1)
      .map((stop) => ({
        stopId: stop.stop_id,
        name: stop.stop_name,
        lat: stop.stop_lat,
        lon: stop.stop_lon,
      }))

    await fs.writeFile(
      path.join(OUTPUT_PATH, `stops.${route.route_short_name || route.route_id}.json`),
      JSON.stringify(routeStops, null, 2),
    )

    console.log(`Processed ${routeStops.length} stops for route ${route.route_short_name || route.route_id}`)
  }
}

async function processShapes(routes: Route[]) {
  console.log("Processing shapes...")

  const shapes = await parseCSV<Shape>(path.join(GTFS_DATA_PATH, "shapes.txt"))
  const trips = await parseCSV<Trip>(path.join(GTFS_DATA_PATH, "trips.txt"))

  // Create route-specific shape files
  for (const route of routes) {
    const routeTrips = trips.filter((trip) => trip.route_id === route.route_id)
    const routeShapeIds = new Set(routeTrips.map((trip) => trip.shape_id).filter(Boolean))

    const routeShapes = shapes
      .filter((shape) => routeShapeIds.has(shape.shape_id))
      .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)

    // Group by shape_id
    const shapeGroups: { [key: string]: any[] } = {}
    routeShapes.forEach((shape) => {
      if (!shapeGroups[shape.shape_id]) {
        shapeGroups[shape.shape_id] = []
      }
      shapeGroups[shape.shape_id].push({
        lat: shape.shape_pt_lat,
        lon: shape.shape_pt_lon,
        sequence: shape.shape_pt_sequence,
      })
    })

    await fs.writeFile(
      path.join(OUTPUT_PATH, `shapes.${route.route_short_name || route.route_id}.json`),
      JSON.stringify(shapeGroups, null, 2),
    )

    console.log(
      `Processed ${Object.keys(shapeGroups).length} shapes for route ${route.route_short_name || route.route_id}`,
    )
  }
}

async function main() {
  try {
    console.log("Starting GTFS preprocessing...")
    console.log(`Input directory: ${GTFS_DATA_PATH}`)
    console.log(`Output directory: ${OUTPUT_PATH}`)

    // Ensure output directory exists
    await ensureDirectoryExists(OUTPUT_PATH)

    // Check if GTFS data exists
    try {
      await fs.access(GTFS_DATA_PATH)
    } catch {
      console.error(`GTFS data directory not found: ${GTFS_DATA_PATH}`)
      console.log("Please download GTFS data from: http://web.mta.info/developers/data/nyct/subway/google_transit.zip")
      console.log("Extract it to ./gtfs-data/ or set GTFS_DATA_PATH environment variable")
      process.exit(1)
    }

    // Process data
    const routes = await processRoutes()
    await processStops(routes)
    await processShapes(routes)

    console.log("GTFS preprocessing completed successfully!")
    console.log(`Generated files in ${OUTPUT_PATH}/`)
  } catch (error) {
    console.error("Error during preprocessing:", error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
