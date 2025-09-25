"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { GoogleMap, Polyline, Marker, InfoWindow } from "@react-google-maps/api"
import TrainMarkers from "./TrainMarkers"
import { useVehicles, useShapes, useStops } from "../api/client"
import { getRouteColor } from "../lib/routes"

const containerStyle = {
  width: "100%",
  height: "100vh",
}

// NYC center coordinates
const center = {
  lat: 40.7589,
  lng: -73.9851,
}

const mapOptions = {
  zoom: 11,
  center: center,
  mapTypeId: "roadmap",
  styles: [
    {
      featureType: "transit",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit.line",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
}

function MapView({ selectedRoute, refreshInterval, isLiveUpdatesEnabled, onDataUpdate }) {
  const [map, setMap] = useState(null)
  const [selectedStop, setSelectedStop] = useState(null)
  const [showStations, setShowStations] = useState(true)
  const [showRouteLines, setShowRouteLines] = useState(true)
  const mapRef = useRef(null)

  // Fetch data using React Query
  const {
    data: vehicles,
    isLoading: vehiclesLoading,
    error: vehiclesError,
    dataUpdatedAt: vehiclesUpdatedAt,
  } = useVehicles(selectedRoute, isLiveUpdatesEnabled ? refreshInterval : 0)

  const { data: shapes, isLoading: shapesLoading } = useShapes(selectedRoute)

  const { data: stops, isLoading: stopsLoading } = useStops(selectedRoute)

  // Notify parent of data updates
  useEffect(() => {
    if (vehiclesUpdatedAt && onDataUpdate) {
      onDataUpdate(vehiclesUpdatedAt)
    }
  }, [vehiclesUpdatedAt, onDataUpdate])

  const onLoad = useCallback((map) => {
    setMap(map)
    mapRef.current = map
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
    mapRef.current = null
  }, [])

  const handleStopClick = useCallback((stop) => {
    setSelectedStop(stop)
  }, [])

  const handleInfoWindowClose = useCallback(() => {
    setSelectedStop(null)
  }, [])

  const renderRouteLines = () => {
    if (!shapes || shapesLoading || !showRouteLines) return null

    const routeColor = getRouteColor(selectedRoute)

    return Object.entries(shapes).map(([shapeId, points]) => (
      <Polyline
        key={shapeId}
        path={points.map((point) => ({ lat: point.lat, lng: point.lon }))}
        options={{
          strokeColor: routeColor,
          strokeOpacity: 0.8,
          strokeWeight: 5,
          zIndex: 1,
        }}
      />
    ))
  }

  const renderStationMarkers = () => {
    if (!stops || stopsLoading || !showStations) return null

    return stops.map((stop) => (
      <Marker
        key={stop.stopId}
        position={{ lat: stop.lat, lng: stop.lon }}
        onClick={() => handleStopClick(stop)}
        icon={{
          path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
          fillColor: "#FFFFFF",
          fillOpacity: 1,
          strokeColor: getRouteColor(selectedRoute),
          strokeWeight: 3,
          scale: 7,
        }}
        zIndex={2}
        title={stop.name}
      />
    ))
  }

  const MapControls = () => (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 space-y-2 z-10">
      <button
        onClick={() => setShowRouteLines(!showRouteLines)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors w-full
          ${showRouteLines ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}
        `}
      >
        <div className={`w-3 h-1 rounded ${showRouteLines ? "bg-blue-600" : "bg-gray-400"}`} />
        Route Lines
      </button>

      <button
        onClick={() => setShowStations(!showStations)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors w-full
          ${showStations ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}
        `}
      >
        <div
          className={`w-3 h-3 rounded-full border-2 ${
            showStations ? "bg-white border-blue-600" : "bg-gray-400 border-gray-400"
          }`}
        />
        Stations
      </button>
    </div>
  )

  if (vehiclesError) {
    console.error("[v0] Error loading vehicles:", vehiclesError)
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={11}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Route lines */}
        {renderRouteLines()}

        {/* Station markers */}
        {renderStationMarkers()}

        {/* Train markers with animation */}
        <TrainMarkers vehicles={vehicles || []} selectedRoute={selectedRoute} isLoading={vehiclesLoading} />

        {/* Info window for selected stop */}
        {selectedStop && (
          <InfoWindow position={{ lat: selectedStop.lat, lng: selectedStop.lon }} onCloseClick={handleInfoWindowClose}>
            <div className="p-3 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-2">{selectedStop.name}</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Route:</span>
                  <span className="font-mono">{selectedRoute}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stop ID:</span>
                  <span className="font-mono">{selectedStop.stopId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-mono">
                    {selectedStop.lat.toFixed(4)}, {selectedStop.lon.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map overlay controls */}
      <MapControls />

      {/* Loading indicator */}
      {(vehiclesLoading || shapesLoading || stopsLoading) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 z-10">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading map data...</span>
          </div>
        </div>
      )}

      {/* Vehicle count indicator */}
      {vehicles && vehicles.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 z-10">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-800">{vehicles.length}</span> active trains
          </div>
        </div>
      )}
    </div>
  )
}

export default MapView
