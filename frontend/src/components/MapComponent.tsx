'use client'

import { useEffect, useRef, useState } from 'react'
import { POI } from '@/types'
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

// Custom star icon for POIs
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
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    getUserLocation()
  }, [])

  const getUserLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      // Default to Arles, France if geolocation is not available
      setUserLocation([43.6768, 4.6278])
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude])
        if (mapRef.current) {
          mapRef.current.setView([position.coords.latitude, position.coords.longitude], 15)
        }
      },
      (error) => {
        console.error('Error getting user location:', error)
        // Default to Arles, France if geolocation fails
        setUserLocation([43.6768, 4.6278])
      }
    )
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

      // Add user location marker
      const userIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      L.marker(userLocation, { icon: userIcon })
        .addTo(map)
        .bindPopup('Votre position')
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker)
      }
    })
    markersRef.current = []

    // Add POI markers
    pois.forEach((poi) => {
      if (!mapRef.current || !L) return

      const icon = createStarIcon(poi.is_ad)
      if (!icon) return

      const marker = L.marker([poi.lat, poi.lng], { icon }).addTo(mapRef.current)

      marker.on('click', () => {
        onPoiClick(poi)
      })

      markersRef.current.push(marker)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [pois, userLocation, onPoiClick])

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

  return <div id="map" className="w-full h-full" />
}

