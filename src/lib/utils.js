import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format timestamp to readable time string
 */
export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * Get route color based on MTA branding
 */
export function getRouteColor(routeId) {
  const colors = {
    // IRT Lines (numbered)
    1: "#EE352E",
    2: "#EE352E",
    3: "#EE352E",
    4: "#00933C",
    5: "#00933C",
    6: "#00933C",
    7: "#B933AD",

    // BMT/IND Lines (lettered)
    A: "#0039A6",
    C: "#0039A6",
    E: "#0039A6",
    B: "#FF6319",
    D: "#FF6319",
    F: "#FF6319",
    M: "#FF6319",
    G: "#6CBE45",
    J: "#996633",
    Z: "#996633",
    L: "#A7A9AC",
    N: "#FCCC0A",
    Q: "#FCCC0A",
    R: "#FCCC0A",
    W: "#FCCC0A",
    S: "#808183", // Shuttle
  }

  return colors[routeId] || "#808183"
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Debounce function for performance optimization
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
