"use client"

import { useState, useEffect } from "react"
import { LoadScript } from "@react-google-maps/api"
import MapView from "./components/MapView"
import Controls from "./components/Controls"
import { AVAILABLE_ROUTES } from "./lib/routes"
import "./App.css"

const libraries = ["geometry", "drawing"]

function App() {
  const [selectedRoute, setSelectedRoute] = useState("A")
  const [refreshInterval, setRefreshInterval] = useState(10000) // 10 seconds
  const [isLiveUpdatesEnabled, setIsLiveUpdatesEnabled] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleRouteChange = (routeId) => {
    console.log(`[v0] Route changed to: ${routeId}`)
    setSelectedRoute(routeId)
  }

  const handleIntervalChange = (interval) => {
    console.log(`[v0] Refresh interval changed to: ${interval}ms`)
    setRefreshInterval(interval)
  }

  const handleLiveUpdatesToggle = () => {
    const newState = !isLiveUpdatesEnabled
    console.log(`[v0] Live updates ${newState ? "enabled" : "disabled"}`)
    setIsLiveUpdatesEnabled(newState)
  }

  const handleDataUpdate = (timestamp) => {
    setLastUpdated(timestamp)
  }

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only handle shortcuts when not typing in an input
      if (event.target.tagName === "INPUT" || event.target.tagName === "SELECT") {
        return
      }

      switch (event.key) {
        case " ":
          event.preventDefault()
          handleLiveUpdatesToggle()
          break
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
          const numericRoute = event.key
          if (AVAILABLE_ROUTES.find((r) => r.id === numericRoute)) {
            handleRouteChange(numericRoute)
          }
          break
        case "a":
        case "A":
          handleRouteChange("A")
          break
        case "c":
        case "C":
          handleRouteChange("C")
          break
        case "e":
        case "E":
          handleRouteChange("E")
          break
        case "l":
        case "L":
          handleRouteChange("L")
          break
        case "n":
        case "N":
          handleRouteChange("N")
          break
        case "q":
        case "Q":
          handleRouteChange("Q")
          break
        case "r":
        case "R":
          handleRouteChange("R")
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isLiveUpdatesEnabled])

  const handleLoadError = (error) => {
    console.error("[v0] Google Maps failed to load:", error)
    setIsLoading(false)
  }

  const handleLoadSuccess = () => {
    console.log("[v0] Google Maps loaded successfully")
    setIsLoading(false)
  }

  return (
    <div className="App">
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
        onLoad={handleLoadSuccess}
        onError={handleLoadError}
        loadingElement={
          <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-lg text-gray-700">Loading Google Maps...</div>
              <div className="text-sm text-gray-500 mt-2">Make sure your API key is configured correctly</div>
            </div>
          </div>
        }
      >
        {!isLoading && (
          <div className="relative w-full h-screen">
            <MapView
              selectedRoute={selectedRoute}
              refreshInterval={refreshInterval}
              isLiveUpdatesEnabled={isLiveUpdatesEnabled}
              onDataUpdate={handleDataUpdate}
            />

            <div className="map-controls">
              <Controls
                selectedRoute={selectedRoute}
                onRouteChange={handleRouteChange}
                refreshInterval={refreshInterval}
                onIntervalChange={handleIntervalChange}
                isLiveUpdatesEnabled={isLiveUpdatesEnabled}
                onLiveUpdatesToggle={handleLiveUpdatesToggle}
                lastUpdated={lastUpdated}
                availableRoutes={AVAILABLE_ROUTES}
              />
            </div>

            {/* Keyboard shortcuts help */}
            <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs text-gray-600 max-w-xs">
              <div className="font-semibold mb-2">Keyboard Shortcuts</div>
              <div className="space-y-1">
                <div>
                  <kbd className="bg-gray-100 px-1 rounded">Space</kbd> Toggle live updates
                </div>
                <div>
                  <kbd className="bg-gray-100 px-1 rounded">1-7, A-R</kbd> Select route
                </div>
              </div>
            </div>
          </div>
        )}
      </LoadScript>
    </div>
  )
}

export default App
