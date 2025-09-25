"use client"

import { useState } from "react"
import { useConnectionStatus } from "../api/client"
import { getRouteTextColor } from "../lib/routes"

function Controls({
  selectedRoute,
  onRouteChange,
  refreshInterval,
  onIntervalChange,
  isLiveUpdatesEnabled,
  onLiveUpdatesToggle,
  lastUpdated,
  availableRoutes,
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const connectionStatus = useConnectionStatus(selectedRoute)

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return "Never"
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getConnectionStatusColor = () => {
    if (connectionStatus.isLoading) return "text-yellow-600"
    if (connectionStatus.isConnected) return "text-green-600"
    return "text-red-600"
  }

  const getConnectionStatusText = () => {
    if (connectionStatus.isLoading) return "Connecting..."
    if (connectionStatus.isConnected) return "Connected"
    return "Disconnected"
  }

  const intervalOptions = [
    { value: 5000, label: "5 seconds" },
    { value: 10000, label: "10 seconds" },
    { value: 15000, label: "15 seconds" },
    { value: 30000, label: "30 seconds" },
  ]

  return (
    <div className="control-panel w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">NYC Subway Live</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label={isExpanded ? "Collapse controls" : "Expand controls"}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus.isLoading
                    ? "bg-yellow-500"
                    : connectionStatus.isConnected
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>{getConnectionStatusText()}</span>
            </div>
            {connectionStatus.error && (
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Retry
              </button>
            )}
          </div>

          {/* Route Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Route</label>
            <div className="grid grid-cols-5 gap-2">
              {availableRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => onRouteChange(route.id)}
                  className={`
                    route-badge w-10 h-10 text-sm font-bold rounded-lg border-2 transition-all
                    ${
                      selectedRoute === route.id
                        ? "ring-2 ring-blue-500 ring-offset-2"
                        : "hover:ring-1 hover:ring-gray-300"
                    }
                  `}
                  style={{
                    backgroundColor: route.color,
                    color: getRouteTextColor(route.id),
                    borderColor: selectedRoute === route.id ? "#3B82F6" : route.color,
                  }}
                  title={route.name}
                >
                  {route.id}
                </button>
              ))}
            </div>
          </div>

          {/* Live Updates Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Live Updates</label>
            <button
              onClick={onLiveUpdatesToggle}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${isLiveUpdatesEnabled ? "bg-blue-600" : "bg-gray-200"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${isLiveUpdatesEnabled ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>

          {/* Refresh Interval */}
          {isLiveUpdatesEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval</label>
              <select
                value={refreshInterval}
                onChange={(e) => onIntervalChange(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {intervalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-gray-500 text-center">Last updated: {formatLastUpdated(lastUpdated)}</div>

          {/* Stats */}
          <div className="border-t pt-3">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Selected Route:</span>
                <span className="font-mono">{selectedRoute}</span>
              </div>
              <div className="flex justify-between">
                <span>Update Mode:</span>
                <span>{isLiveUpdatesEnabled ? "Live" : "Manual"}</span>
              </div>
              {isLiveUpdatesEnabled && (
                <div className="flex justify-between">
                  <span>Interval:</span>
                  <span>{refreshInterval / 1000}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {connectionStatus.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800 font-medium mb-1">Connection Error</div>
              <div className="text-xs text-red-600">
                {connectionStatus.error.message || "Unable to connect to the server"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Controls
