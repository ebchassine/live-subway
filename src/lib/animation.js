export function lerp(start, end, progress) {
  return start + (end - start) * progress
}

/**
 * Easing function for smooth animation
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
}

/**
 * Interpolate between two geographic positions
 */
export function interpolatePosition(start, end, progress) {
  const easedProgress = easeInOutCubic(progress)

  return {
    lat: lerp(start.lat, end.lat, easedProgress),
    lon: lerp(start.lon, end.lon, easedProgress),
    bearing: interpolateBearing(start.bearing || 0, end.bearing || 0, easedProgress),
  }
}

/**
 * Interpolate bearing (angle) taking into account circular nature
 */
export function interpolateBearing(start, end, progress) {
  // Normalize angles to 0-360
  start = ((start % 360) + 360) % 360
  end = ((end % 360) + 360) % 360

  // Find the shortest path
  let diff = end - start
  if (diff > 180) {
    diff -= 360
  } else if (diff < -180) {
    diff += 360
  }

  const result = start + diff * progress
  return ((result % 360) + 360) % 360
}

/**
 * Calculate distance between two geographic points (Haversine formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate bearing between two geographic points
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1)
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

  const bearing = Math.atan2(y, x)
  return (toDegrees(bearing) + 360) % 360
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI)
}

/**
 * Smooth animation frame helper
 */
export class AnimationManager {
  constructor() {
    this.animations = new Map()
  }

  startAnimation(id, duration, onUpdate, onComplete) {
    // Cancel existing animation with same ID
    this.stopAnimation(id)

    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      onUpdate(progress)

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate)
        this.animations.set(id, frameId)
      } else {
        this.animations.delete(id)
        if (onComplete) onComplete()
      }
    }

    animate()
  }

  stopAnimation(id) {
    const frameId = this.animations.get(id)
    if (frameId) {
      cancelAnimationFrame(frameId)
      this.animations.delete(id)
    }
  }

  stopAllAnimations() {
    this.animations.forEach((frameId) => cancelAnimationFrame(frameId))
    this.animations.clear()
  }
}
