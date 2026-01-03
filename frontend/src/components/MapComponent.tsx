'use client'

import { useEffect, useRef, useState } from 'react'
import { POI } from '@/types'
import { calculateOptimalItinerary, getItineraryRoutes, Route } from '@/services/routing'
import 'leaflet/dist/leaflet.css'

// Dynamically import Leaflet only on client side
let L: any = null
if (typeof window !== 'undefined') {
  L = require('leaflet')
  // Fix for default marker icons in Next.js
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// Custom numbered icon for POIs in itinerary
const createNumberedIcon = (number: number, isAd: boolean, isNext: boolean) => {
  if (typeof window === 'undefined' || !L) return null
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `<div style="
      width: ${isNext ? '36px' : '32px'};
      height: ${isNext ? '36px' : '32px'};
      background-color: ${isAd ? '#FFD700' : (isNext ? '#4CAF50' : '#FF6B6B')};
      border-radius: 50%;
      border: ${isNext ? '3px' : '2px'} solid white;
      box-shadow: 0 ${isNext ? '3px' : '2px'} ${isNext ? '6px' : '4px'} rgba(0,0,0,0.${isNext ? '4' : '3'});
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: ${isNext ? 'bold' : 'normal'};
    ">
      <span style="
        color: white;
        font-size: ${isNext ? '18px' : '16px'};
        font-weight: ${isNext ? 'bold' : 'normal'};
      ">${number}</span>
    </div>`,
    iconSize: isNext ? [36, 36] : [32, 32],
    iconAnchor: isNext ? [18, 18] : [16, 16],
  })
}

// Custom star icon for POIs not in itinerary (ads)
const createStarIcon = (isAd: boolean) => {
  if (typeof window === 'undefined' || !L) return null
  return L.divIcon({
    className: 'custom-star-marker',
    html: `<div style="
      width: 30px;
      height: 30px;
      background-color: ${isAd ? '#FFD700' : '#FF6B6B'};
      border-radius: 50% 50% 50% 0;
      transform: rotate(45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(-45deg);
        color: white;
        font-size: 16px;
        font-weight: bold;
      ">★</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

interface MapComponentProps {
  pois: POI[]
  onPoiClick: (poi: POI) => void
}

export default function MapComponent({ pois, onPoiClick }: MapComponentProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [userHeading, setUserHeading] = useState<number | null>(null) // Direction in degrees (0-360)
  const [itinerary, setItinerary] = useState<POI[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [currentDestinationIndex, setCurrentDestinationIndex] = useState<number>(0)
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const watchPositionIdRef = useRef<number | null>(null)

  useEffect(() => {
    getUserLocation()
    setupCompass()
    
    return () => {
      // Cleanup location watcher
      if (watchPositionIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current)
      }
      // Cleanup compass listeners
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleDeviceOrientation)
      }
    }
  }, [])

  const getUserLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      // Default to Arles, France if geolocation is not available
      setUserLocation([43.6768, 4.6278])
      return
    }

    // Watch position for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude])
        if (mapRef.current) {
          // Only update map view if user hasn't manually panned
          // This prevents the map from jumping when user is exploring
          const currentZoom = mapRef.current.getZoom()
          if (currentZoom >= 15) {
            // Only auto-center if zoomed in close
            mapRef.current.setView([position.coords.latitude, position.coords.longitude], currentZoom, {
              animate: false, // Don't animate to avoid jarring movement
            })
          }
        }
      },
      (error) => {
        console.error('Error getting user location:', error)
        // Default to Arles, France if geolocation fails
        setUserLocation([43.6768, 4.6278])
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    )
    
    watchPositionIdRef.current = watchId

    watchPositionIdRef.current = watchId
    
    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current)
        watchPositionIdRef.current = null
      }
    }
  }

  const setupCompass = () => {
    if (typeof window === 'undefined') return

    // Request permission for device orientation (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation)
          }
        })
        .catch((error: Error) => {
          console.warn('Device orientation permission denied:', error)
        })
    } else {
      // Android and older iOS
      window.addEventListener('deviceorientation', handleDeviceOrientation)
    }
  }

  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null) {
      // alpha is the compass direction (0-360 degrees)
      setUserHeading(event.alpha)
    }
  }

  // Calculate itinerary when user location and POIs are available
  useEffect(() => {
    if (userLocation && pois.length > 0) {
      const optimalItinerary = calculateOptimalItinerary(userLocation, pois)
      setItinerary(optimalItinerary)
      setCurrentDestinationIndex(0)
    }
  }, [userLocation, pois])

  // Load routes when itinerary changes
  useEffect(() => {
    if (userLocation && itinerary.length > 0) {
      loadRoutes()
    }
  }, [userLocation, itinerary])

  const loadRoutes = () => {
    if (!userLocation || itinerary.length === 0) return

    setLoadingRoutes(true)
    setRouteError(null)
    try {
      const calculatedRoutes = getItineraryRoutes(userLocation, itinerary)
      setRoutes(calculatedRoutes)
      if (calculatedRoutes.length === 0) {
        setRouteError('Aucune route disponible.')
      }
    } catch (error: any) {
      console.error('Error loading routes:', error)
      setRouteError('Erreur lors du calcul des routes.')
    } finally {
      setLoadingRoutes(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !userLocation || !L) return

    // Initialize map
    if (!mapRef.current) {
      const map = L.map('map').setView(userLocation, 13)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

    }

    // Create or update user location marker with blue dot and direction
    if (userLocation) {
      // Remove old marker if exists
      if (userMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current)
      }

      // Create custom blue dot icon with direction arrow (like Google Maps)
      const heading = userHeading !== null ? userHeading : 0
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            position: relative;
            width: 24px;
            height: 24px;
          ">
            <!-- Blue dot (like Google Maps) -->
            <div style="
              width: 20px;
              height: 20px;
              background-color: #4285F4;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              position: absolute;
              top: 2px;
              left: 2px;
            "></div>
            <!-- Direction arrow (only show if heading is available) -->
            ${userHeading !== null ? `
              <div style="
                position: absolute;
                top: -6px;
                left: 50%;
                transform: translateX(-50%) rotate(${heading}deg);
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 14px solid #4285F4;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
              "></div>
            ` : ''}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      userMarkerRef.current = L.marker(userLocation, { 
        icon: userIcon,
        zIndexOffset: 1000, // Ensure it's on top
        interactive: false, // Don't make it clickable
      })
        .addTo(mapRef.current)
        .bindPopup('Votre position')
    }

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker)
      }
    })
    markersRef.current = []

    polylinesRef.current.forEach(polyline => {
      if (mapRef.current) {
        mapRef.current.removeLayer(polyline)
      }
    })
    polylinesRef.current = []

    // Create a map of POI IDs to their index in itinerary
    const itineraryIndexMap = new Map<string, number>()
    itinerary.forEach((poi, index) => {
      itineraryIndexMap.set(poi.poi_id, index)
    })

    // Add POI markers
    pois.forEach((poi) => {
      if (!mapRef.current || !L) return

      const itineraryIndex = itineraryIndexMap.get(poi.poi_id)
      const isInItinerary = itineraryIndex !== undefined
      const isNext = itineraryIndex === currentDestinationIndex

      let icon
      if (isInItinerary) {
        icon = createNumberedIcon((itineraryIndex || 0) + 1, poi.is_ad, isNext)
      } else {
        icon = createStarIcon(poi.is_ad)
      }

      if (!icon) return

      const marker = L.marker([poi.lat, poi.lng], { icon }).addTo(mapRef.current)

      marker.on('click', () => {
        onPoiClick(poi)
      })

      markersRef.current.push(marker)
    })

    // Add route polylines
    routes.forEach((route, index) => {
      if (!mapRef.current || !L) return

      const isNextRoute = index === currentDestinationIndex
      const polyline = L.polyline(route.coordinates, {
        color: isNextRoute ? '#4CAF50' : '#9E9E9E',
        weight: isNextRoute ? 6 : 3,
        opacity: isNextRoute ? 0.8 : 0.5,
        dashArray: isNextRoute ? undefined : '10, 5',
      }).addTo(mapRef.current)

      polylinesRef.current.push(polyline)
    })

    // Fit map to show all markers and routes
    if (markersRef.current.length > 0 || polylinesRef.current.length > 0) {
      const bounds = L.latLngBounds([])
      
      // Add user location
      bounds.extend(userLocation)
      
      // Add all markers
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getLatLng())
      })
      
      // Add all route points
      routes.forEach(route => {
        route.coordinates.forEach(coord => {
          bounds.extend(coord)
        })
      })
      
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds.pad(0.1))
      }
    }

    return () => {
      if (mapRef.current) {
        // Don't remove map on cleanup, just clear layers
        markersRef.current.forEach(marker => {
          if (mapRef.current) {
            mapRef.current.removeLayer(marker)
          }
        })
        polylinesRef.current.forEach(polyline => {
          if (mapRef.current) {
            mapRef.current.removeLayer(polyline)
          }
        })
      }
    }
  }, [pois, userLocation, userHeading, itinerary, routes, currentDestinationIndex, onPoiClick])

  if (!userLocation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement de la carte...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="map" className="w-full h-full" />
      {loadingRoutes && (
        <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
          <div className="flex items-center gap-2">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
            <span className="text-sm text-gray-700">Calcul des routes réelles...</span>
          </div>
        </div>
      )}
      {routeError && (
        <div className="absolute top-4 right-4 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg shadow-lg z-[1000] max-w-sm">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-800">{routeError}</span>
          </div>
        </div>
      )}
      {itinerary.length > 0 && (
        <div className="absolute top-4 left-4 bg-white px-4 py-3 rounded-lg shadow-lg z-[1000] max-w-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Itinéraire optimal</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDestinationIndex(Math.max(0, currentDestinationIndex - 1))}
                disabled={currentDestinationIndex === 0}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Destination précédente"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDestinationIndex(Math.min(itinerary.length - 1, currentDestinationIndex + 1))}
                disabled={currentDestinationIndex === itinerary.length - 1}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Destination suivante"
              >
                →
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>
              <span className="font-semibold">Prochaine destination:</span>{' '}
              {itinerary[currentDestinationIndex]?.name || 'N/A'}
            </p>
            <p className="mt-1">
              Destination {currentDestinationIndex + 1} sur {itinerary.length}
            </p>
            {routes.length > 0 && currentDestinationIndex < routes.length && (
              <p className="mt-1 text-xs text-gray-500">
                Distance: {Math.round(routes[currentDestinationIndex]?.distance || 0)}m • 
                Durée: {Math.round((routes[currentDestinationIndex]?.duration || 0) / 60)}min
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
