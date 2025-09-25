import { useQuery } from "@tanstack/react-query"
import { getFeedForRoute } from "../lib/routes"

const API_BASE = "/api"

class ApiError extends Error {
  constructor(message, status, response) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.response = response
  }
}

async function handleApiResponse(response) {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new ApiError(`API Error: ${response.statusText}`, response.status, errorText)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new ApiError("Invalid JSON response", response.status, error.message)
  }
}

/**
 * Fetch vehicles for a specific route with enhanced error handling
 */
async function fetchVehicles(routeId) {
  const feed = getFeedForRoute(routeId)

  try {
    const response = await fetch(`${API_BASE}/vehicles?feed=${feed}`, {
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    })

    const result = await handleApiResponse(response)

    // Filter and validate vehicles for the specific route
    const filteredVehicles = result.data
      .filter((vehicle) => vehicle.routeId === routeId)
      .filter((vehicle) => {
        // Basic validation
        return (
          vehicle.lat &&
          vehicle.lon &&
          vehicle.lat >= -90 &&
          vehicle.lat <= 90 &&
          vehicle.lon >= -180 &&
          vehicle.lon <= 180
        )
      })
      .map((vehicle) => ({
        ...vehicle,
        timestamp: vehicle.timestamp || Date.now(),
      }))

    console.log(`[v0] Fetched ${filteredVehicles.length} vehicles for route ${routeId}`)
    return filteredVehicles
  } catch (error) {
    console.error(`[v0] Error fetching vehicles for route ${routeId}:`, error)
    throw error
  }
}

/**
 * Fetch shapes for a specific route
 */
async function fetchShapes(routeId) {
  try {
    const response = await fetch(`${API_BASE}/shapes/${routeId}`)

    if (response.status === 404) {
      console.warn(`[v0] Shape data not found for route ${routeId}`)
      return {}
    }

    const result = await handleApiResponse(response)
    return result.data || {}
  } catch (error) {
    console.error(`[v0] Error fetching shapes for route ${routeId}:`, error)
    throw error
  }
}

/**
 * Fetch stops for a specific route
 */
async function fetchStops(routeId) {
  try {
    const response = await fetch(`${API_BASE}/stops/${routeId}`)

    if (response.status === 404) {
      console.warn(`[v0] Stop data not found for route ${routeId}`)
      return []
    }

    const result = await handleApiResponse(response)
    return result.data || []
  } catch (error) {
    console.error(`[v0] Error fetching stops for route ${routeId}:`, error)
    throw error
  }
}

/**
 * React Query hook for vehicles data with enhanced error handling
 */
export function useVehicles(routeId, intervalMs = 0) {
  return useQuery({
    queryKey: ["vehicles", routeId],
    queryFn: () => fetchVehicles(routeId),
    enabled: !!routeId,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
    refetchIntervalInBackground: true,
    staleTime: 3000, // Consider data stale after 3 seconds
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        return false
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onError: (error) => {
      console.error(`[v0] Vehicles query error for route ${routeId}:`, error)
    },
    onSuccess: (data) => {
      console.log(`[v0] Successfully loaded ${data.length} vehicles for route ${routeId}`)
    },
  })
}

/**
 * React Query hook for shapes data
 */
export function useShapes(routeId) {
  return useQuery({
    queryKey: ["shapes", routeId],
    queryFn: () => fetchShapes(routeId),
    enabled: !!routeId,
    staleTime: 30 * 60 * 1000, // Shapes don't change often, cache for 30 minutes
    retry: 2,
    onError: (error) => {
      console.error(`[v0] Shapes query error for route ${routeId}:`, error)
    },
  })
}

/**
 * React Query hook for stops data
 */
export function useStops(routeId) {
  return useQuery({
    queryKey: ["stops", routeId],
    queryFn: () => fetchStops(routeId),
    enabled: !!routeId,
    staleTime: 30 * 60 * 1000, // Stops don't change often, cache for 30 minutes
    retry: 2,
    onError: (error) => {
      console.error(`[v0] Stops query error for route ${routeId}:`, error)
    },
  })
}

/**
 * Health check hook with connection status
 */
export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/health`)
      return handleApiResponse(response)
    },
    refetchInterval: 60000, // Check every minute
    staleTime: 30000, // Consider stale after 30 seconds
    retry: 1,
    onError: (error) => {
      console.error("[v0] Health check failed:", error)
    },
  })
}

/**
 * Get connection status based on query states
 */
export function useConnectionStatus(routeId) {
  const vehiclesQuery = useVehicles(routeId, 0) // Don't auto-refresh for status check
  const healthQuery = useHealthCheck()

  const isConnected = !vehiclesQuery.isError && !healthQuery.isError
  const isLoading = vehiclesQuery.isLoading || healthQuery.isLoading
  const lastSuccessfulUpdate = vehiclesQuery.dataUpdatedAt || healthQuery.dataUpdatedAt

  return {
    isConnected,
    isLoading,
    lastSuccessfulUpdate,
    error: vehiclesQuery.error || healthQuery.error,
  }
}
