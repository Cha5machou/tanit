import { POI } from '@/types'

export interface Route {
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
  coordinates: [number, number][] // [lat, lng] format for Leaflet
  distance: number // in meters
  duration: number // in seconds
}

export interface Itinerary {
  pois: POI[]
  routes: Route[]
  totalDistance: number // in meters
  totalDuration: number // in seconds
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate optimal itinerary using Nearest Neighbor algorithm (simplified TSP)
 */
export function calculateOptimalItinerary(
  userLocation: [number, number],
  pois: POI[]
): POI[] {
  // Filter out ads
  const nonAdPois = pois.filter(poi => !poi.is_ad)
  
  if (nonAdPois.length === 0) {
    return []
  }

  // Start with user location
  const itinerary: POI[] = []
  const remaining = [...nonAdPois]
  let currentLat = userLocation[0]
  let currentLng = userLocation[1]

  // Nearest neighbor algorithm
  while (remaining.length > 0) {
    let nearestIndex = 0
    let nearestDistance = calculateDistance(
      currentLat,
      currentLng,
      remaining[0].lat,
      remaining[0].lng
    )

    // Find nearest POI
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(
        currentLat,
        currentLng,
        remaining[i].lat,
        remaining[i].lng
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    // Add nearest POI to itinerary
    const nearestPoi = remaining[nearestIndex]
    itinerary.push(nearestPoi)
    currentLat = nearestPoi.lat
    currentLng = nearestPoi.lng
    remaining.splice(nearestIndex, 1)
  }

  return itinerary
}

/**
 * Get route - returns straight-line route (no external routing service)
 */
export function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Route {
  return getStraightLineRoute(from, to)
}


/**
 * Fallback: Create a straight-line route
 */
function getStraightLineRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Route {
  const distance = calculateDistance(from.lat, from.lng, to.lat, to.lng)
  // Estimate walking speed: 4-6 km/h (average 5 km/h = 1.39 m/s)
  // Adjust speed based on distance: slower for short distances, faster for long distances
  let walkingSpeedMs = 1.39 // 5 km/h average (1.11 m/s for 4 km/h, 1.67 m/s for 6 km/h)
  if (distance > 1000) {
    // For distances > 1km, use faster pace (~5.5 km/h)
    walkingSpeedMs = 1.53
  } else if (distance < 200) {
    // For short distances, use slower pace (~4.5 km/h)
    walkingSpeedMs = 1.25
  }
  const duration = distance / walkingSpeedMs

  return {
    from,
    to,
    coordinates: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distance,
    duration,
  }
}

/**
 * Get routes for entire itinerary
 * Uses straight-line routes (no external routing service)
 */
export function getItineraryRoutes(
  userLocation: [number, number],
  itinerary: POI[]
): Route[] {
  const routes: Route[] = []

  // Route from user location to first POI
  if (itinerary.length > 0) {
    const firstRoute = getRoute(
      { lat: userLocation[0], lng: userLocation[1] },
      { lat: itinerary[0].lat, lng: itinerary[0].lng }
    )
    routes.push(firstRoute)
  }

  // Routes between POIs
  for (let i = 0; i < itinerary.length - 1; i++) {
    const route = getRoute(
      { lat: itinerary[i].lat, lng: itinerary[i].lng },
      { lat: itinerary[i + 1].lat, lng: itinerary[i + 1].lng }
    )
    routes.push(route)
  }

  return routes
}

