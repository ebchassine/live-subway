"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Marker, InfoWindow } from "@react-google-maps/api"
import { getRouteColor, getRouteTextColor } from "../lib/routes"
import { interpolatePosition, calculateBearing, calculateDistance } from "../lib/animation"

function TrainMarkers({ vehicles, selectedRoute, isLoading }) {
  const [animatedVehicles, setAnimatedVehicles] = useState([])
  const [selectedTrain, setSelectedTrain] = useState(null)
  const previousVehiclesRef = useRef(new Map())
  const animationFrameRef = useRef()
  const lastUpdateRef = useRef(Date.now())

  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      setAnimatedVehicles([])
      return
    }

    const currentTime = Date.now()
    const timeSinceLastUpdate = currentTime - lastUpdateRef.current
    const animationDuration = Math.min(Math.max(timeSinceLastUpdate * 0.8, 1000), 5000) // 1-5 seconds

    const startTime = currentTime
    lastUpdateRef.current = currentTime

    // Create current vehicles map for quick lookup
    const currentVehiclesMap = new Map()
    vehicles.forEach((vehicle) => {
      currentVehiclesMap.set(vehicle.trainId, vehicle)
    })

    // Calculate initial positions and bearings
    const initialAnimatedVehicles = vehicles.map((vehicle) => {
      const previous = previousVehiclesRef.current.get(vehicle.trainId)

      if (!previous) {
        // New vehicle, no animation needed
        return {
          ...vehicle,
          isNew: true,
          calculatedBearing: vehicle.bearing || 0,
        }
      }

      // Calculate bearing if not provided
      let calculatedBearing = vehicle.bearing
      if (!calculatedBearing && previous) {
        calculatedBearing = calculateBearing(previous.lat, previous.lon, vehicle.lat, vehicle.lon)
      }

      return {
        ...vehicle,
        calculatedBearing: calculatedBearing || previous.calculatedBearing || 0,
        startPosition: {
          lat: previous.lat,
          lon: previous.lon,
          bearing: previous.calculatedBearing || 0,
        },
      }
    })

    setAnimatedVehicles(initialAnimatedVehicles)

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / animationDuration, 1)

      const interpolatedVehicles = initialAnimatedVehicles.map((vehicle) => {
        if (vehicle.isNew || !vehicle.startPosition || progress >= 1) {
          return {
            ...vehicle,
            lat: vehicle.lat,
            lon: vehicle.lon,
            bearing: vehicle.calculatedBearing,
          }
        }

        // Smooth interpolation
        const interpolated = interpolatePosition(
          vehicle.startPosition,
          {
            lat: vehicle.lat,
            lon: vehicle.lon,
            bearing: vehicle.calculatedBearing,
          },
          progress,
        )

        return {
          ...vehicle,
          lat: interpolated.lat,
          lon: interpolated.lon,
          bearing: interpolated.bearing,
        }
      })

      setAnimatedVehicles(interpolatedVehicles)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // Store final positions for next animation
        const finalPositions = new Map()
        interpolatedVehicles.forEach((vehicle) => {
          finalPositions.set(vehicle.trainId, {
            lat: vehicle.lat,
            lon: vehicle.lon,
            calculatedBearing: vehicle.bearing,
          })
        })
        previousVehiclesRef.current = finalPositions
      }
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [vehicles])

  const handleTrainClick = (vehicle) => {
    setSelectedTrain(vehicle)
  }

  const handleInfoWindowClose = () => {
    setSelectedTrain(null)
  }

  const createTrainIcon = useMemo(() => {
    const iconCache = new Map()

    return (routeId, bearing = 0) => {
      const cacheKey = `${routeId}-${Math.round(bearing / 10) * 10}` // Round to nearest 10 degrees

      if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey)
      }

      const color = getRouteColor(routeId)
      const textColor = getRouteTextColor(routeId)

      // Enhanced SVG with direction arrow
      const svg = `
        <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)"/>
            </filter>
          </defs>
          <circle cx="18" cy="18" r="16" fill="${color}" stroke="#FFFFFF" strokeWidth="2" filter="url(#shadow)"/>
          <text x="18" y="23" textAnchor="middle" fill="${textColor}" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold">
            ${routeId}
          </text>
          ${
            bearing
              ? `
            <path d="M18 4 L22 12 L14 12 Z" fill="${textColor}" opacity="0.8" transform="rotate(${bearing} 18 18)"/>
          `
              : ""
          }
        </svg>
      `

      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: window.google ? new window.google.maps.Size(36, 36) : { width: 36, height: 36 },
        anchor: window.google ? new window.google.maps.Point(18, 18) : { x: 18, y: 18 },
      }

      iconCache.set(cacheKey, icon)
      return icon
    }
  }, [])

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getTimeSinceUpdate = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const calculateSpeed = (vehicle) => {
    const previous = previousVehiclesRef.current.get(vehicle.trainId)
    if (!previous) return null

    const distance = calculateDistance(previous.lat, previous.lon, vehicle.lat, vehicle.lon)
    const timeDiff = (vehicle.timestamp - (previous.timestamp || Date.now())) / 1000 / 3600 // hours

    if (timeDiff <= 0) return null

    const speedKmh = distance / timeDiff
    const speedMph = speedKmh * 0.621371

    return speedMph > 0.1 ? speedMph : null
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      {animatedVehicles.map((vehicle) => (
        <Marker
          key={vehicle.trainId}
          position={{ lat: vehicle.lat, lng: vehicle.lon }}
          icon={createTrainIcon(vehicle.routeId, vehicle.bearing)}
          onClick={() => handleTrainClick(vehicle)}
          zIndex={10}
          title={`${vehicle.routeId} Train - ${vehicle.trainId}`}
        />
      ))}

      {selectedTrain && (
        <InfoWindow position={{ lat: selectedTrain.lat, lng: selectedTrain.lon }} onCloseClick={handleInfoWindowClose}>
          <div className="p-3 min-w-[220px]">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="route-badge"
                style={{
                  backgroundColor: getRouteColor(selectedTrain.routeId),
                  color: getRouteTextColor(selectedTrain.routeId),
                }}
              >
                {selectedTrain.routeId}
              </div>
              <span className="font-semibold">Train {selectedTrain.trainId}</span>
            </div>

            <div className="text-sm space-y-2">
              {selectedTrain.tripId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Trip ID:</span>
                  <span className="font-mono text-xs">{selectedTrain.tripId}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="capitalize">
                  {(selectedTrain.status || "In Transit").toLowerCase().replace("_", " ")}
                </span>
              </div>

              {selectedTrain.stopId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">At Stop:</span>
                  <span className="font-mono text-xs">{selectedTrain.stopId}</span>
                </div>
              )}

              {selectedTrain.bearing && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Heading:</span>
                  <span>{Math.round(selectedTrain.bearing)}°</span>
                </div>
              )}

              {(() => {
                const speed = calculateSpeed(selectedTrain)
                return (
                  speed && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Speed:</span>
                      <span>{Math.round(speed)} mph</span>
                    </div>
                  )
                )
              })()}

              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Update:</span>
                  <span>{formatTime(selectedTrain.timestamp)}</span>
                </div>

                <div className="text-xs text-gray-500 text-right">{getTimeSinceUpdate(selectedTrain.timestamp)}</div>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}

export default TrainMarkers
