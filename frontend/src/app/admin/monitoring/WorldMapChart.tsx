'use client'

import { useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps'

// World map component for country distribution
export function WorldMapChart({ data }: { data: Array<{ country: string, count: number }> }) {
  const [tooltipContent, setTooltipContent] = useState<{ country: string, count: number } | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  
  // Country name mapping for better matching
  const countryNameMap: Record<string, string> = {
    'united states': 'united states of america',
    'usa': 'united states of america',
    'uk': 'united kingdom',
    'russia': 'russian federation',
    'south korea': 'south korea',
    'north korea': 'north korea',
  }
  
  // Create a map of country names to counts (normalized)
  const countryDataMap = new Map<string, number>()
  data.forEach(item => {
    let normalizedName = item.country.toLowerCase().trim()
    // Apply mapping if exists
    if (countryNameMap[normalizedName]) {
      normalizedName = countryNameMap[normalizedName]
    }
    countryDataMap.set(normalizedName, item.count)
  })
  
  // Find max count for color scaling
  const maxCount = Math.max(...data.map(d => d.count), 1)
  
  // Function to get color based on count (blue gradient)
  const getColor = (count: number) => {
    if (count === 0) return '#E3F2FD' // Very light blue
    const intensity = count / maxCount
    // Blue gradient from light (#E3F2FD) to dark (#1565C0)
    const r = Math.floor(227 - (227 - 21) * intensity)
    const g = Math.floor(242 - (242 - 101) * intensity)
    const b = Math.floor(253 - (253 - 192) * intensity)
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // Helper function to match country names
  const getCountryCount = (mapCountryName: string): number => {
    const normalized = mapCountryName.toLowerCase().trim()
    
    // Direct match
    if (countryDataMap.has(normalized)) {
      return countryDataMap.get(normalized) || 0
    }
    
    // Try partial match
    const entries = Array.from(countryDataMap.entries())
    for (const [key, value] of entries) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value
      }
    }
    
    return 0
  }
  
  // World map URL (using a simple world map topology)
  const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  
  return (
    <div 
      className="relative"
      onMouseMove={(e) => {
        setMousePosition({ x: e.clientX, y: e.clientY })
      }}
    >
      <ComposableMap
        projectionConfig={{
          scale: 147,
          center: [0, 20],
        }}
        width={800}
        height={400}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const mapCountryName = geo.properties.NAME || ''
              const count = getCountryCount(mapCountryName)
              const fillColor = getColor(count)
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  style={{
                    default: {
                      fill: fillColor,
                      outline: 'none',
                    },
                    hover: {
                      fill: '#1976D2',
                      outline: 'none',
                      cursor: 'pointer',
                    },
                    pressed: {
                      fill: '#0D47A1',
                      outline: 'none',
                    },
                  }}
                  onMouseEnter={() => {
                    setTooltipContent({
                      country: mapCountryName,
                      count: count,
                    })
                  }}
                  onMouseLeave={() => {
                    setTooltipContent(null)
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
      
      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="fixed bg-gray-900 text-white px-3 py-2 rounded shadow-lg pointer-events-none z-50"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y - 10}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-semibold">{tooltipContent.country}</div>
          <div className="text-sm">{tooltipContent.count} utilisateur{tooltipContent.count > 1 ? 's' : ''}</div>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <span className="text-sm text-gray-600">Moins</span>
        <div className="flex gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity) => {
            const r = Math.floor(227 - (227 - 21) * intensity)
            const g = Math.floor(242 - (242 - 101) * intensity)
            const b = Math.floor(253 - (253 - 192) * intensity)
            return (
              <div
                key={intensity}
                className="w-8 h-4"
                style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
              />
            )
          })}
        </div>
        <span className="text-sm text-gray-600">Plus</span>
      </div>
    </div>
  )
}

