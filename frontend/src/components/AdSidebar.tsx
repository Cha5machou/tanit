'use client'

import { useState, useEffect } from 'react'
import { Ad } from '@/types'
import { api } from '@/services/api'

interface AdSidebarProps {
  position: 'left' | 'right'
}

const FLIP_INTERVAL = 5000 // 5 seconds between flips

export function AdSidebar({ position }: AdSidebarProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAds()
  }, [position])

  useEffect(() => {
    // Auto-flip every FLIP_INTERVAL milliseconds
    const interval = setInterval(() => {
      setIsFlipped((prev) => !prev)
    }, FLIP_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  const loadAds = async () => {
    try {
      setLoading(true)
      const allAds = await api.listAds(position, true) // Only active ads
      // Sort by slot
      const sortedAds = allAds.sort((a, b) => a.slot - b.slot)
      setAds(sortedAds)
    } catch (error) {
      // Silently fail - ads are optional content
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error loading ads:', error)
      }
      setAds([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  // Get ads for front side (slots 1-5)
  const getFrontAds = () => {
    const frontAds: (Ad | null)[] = []
    for (let i = 0; i < 5; i++) {
      frontAds.push(ads[i] || null)
    }
    return frontAds
  }

  // Get ads for back side (slots 6-10, or 11-15 if more than 10)
  const getBackAds = () => {
    const backAds: (Ad | null)[] = []
    const startIndex = ads.length > 10 ? 10 : 5 // If more than 10 ads, show 11-15, else 6-10
    for (let i = 0; i < 5; i++) {
      backAds.push(ads[startIndex + i] || null)
    }
    return backAds
  }

  const frontAds = getFrontAds()
  const backAds = getBackAds()

  if (loading) {
    return (
      <div className={`hidden lg:flex fixed ${position === 'left' ? 'left-0' : 'right-0'} top-0 h-screen w-64 flex-col items-center justify-center bg-gray-50 border-r border-gray-200`}>
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className={`hidden lg:flex fixed ${position === 'left' ? 'left-0' : 'right-0'} top-0 h-screen w-64 flex-col bg-gray-50 border-r border-gray-200 overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-semibold text-gray-700 uppercase">
          Publicités
        </h3>
      </div>

      {/* Ads Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {frontAds.map((ad, index) => {
          const backAd = backAds[index]
          return (
            <div
              key={`card-${index}`}
              className="relative h-48"
              style={{
                perspective: '1000px',
              }}
            >
              <div
                className="relative w-full h-full transition-transform duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front side */}
                <div
                  className="absolute w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  {ad ? (
                    <a
                      href={ad.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 h-full cursor-pointer hover:shadow-md transition-shadow"
                    >
                      {ad.logo_url && (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={ad.logo_url}
                            alt={ad.name}
                            className="h-16 w-16 object-contain rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">
                        {ad.name}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {ad.description}
                      </p>
                    </a>
                  ) : (
                    <div className="p-4 h-full text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg flex flex-col justify-center">
                      <div className="text-xs font-medium mb-1">
                        Emplacement publicitaire
                      </div>
                      <div className="text-xs">
                        Contactez-nous pour réserver votre annonce
                      </div>
                    </div>
                  )}
                </div>

                {/* Back side */}
                <div
                  className="absolute w-full h-full bg-blue-50 rounded-lg shadow-sm border border-blue-200 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {backAd ? (
                    <a
                      href={backAd.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 h-full cursor-pointer hover:shadow-md transition-shadow"
                    >
                      {backAd.logo_url && (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={backAd.logo_url}
                            alt={backAd.name}
                            className="h-16 w-16 object-contain rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">
                        {backAd.name}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {backAd.description}
                      </p>
                    </a>
                  ) : (
                    <div className="p-4 h-full text-center text-gray-400 border-2 border-dashed border-blue-300 rounded-lg flex flex-col justify-center">
                      <div className="text-xs font-medium mb-1">
                        Emplacement publicitaire
                      </div>
                      <div className="text-xs">
                        Contactez-nous pour réserver votre annonce
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

