'use client'

import { useState, useEffect, useRef } from 'react'
import { Ad } from '@/types'
import { api } from '@/services/api'

const SCROLL_SPEED = 1 // pixels per frame for smooth continuous scroll
const TOTAL_SLOTS = 20 // Total slots to display (10 per side)

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    loadAds()
  }, [])

  useEffect(() => {
    if (loading) return

    const container = scrollContainerRef.current
    if (!container) return

    const scroll = () => {
      const container = scrollContainerRef.current
      if (!container) return

      const maxScroll = container.scrollWidth - container.clientWidth
      
      if (maxScroll <= 0) {
        // No need to scroll if content fits
        return
      }

      const currentScroll = container.scrollLeft
      const nextScroll = currentScroll + SCROLL_SPEED

      if (nextScroll >= maxScroll) {
        // Reset to start seamlessly
        container.scrollLeft = 0
      } else {
        // Continuous scroll
        container.scrollLeft = nextScroll
      }

      animationFrameRef.current = requestAnimationFrame(scroll)
    }

    // Start continuous scrolling
    animationFrameRef.current = requestAnimationFrame(scroll)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [ads.length, loading])

  const loadAds = async () => {
    try {
      setLoading(true)
      // Load all active ads (both left and right)
      const allAds = await api.listAds(undefined, true)
      // Sort by position and slot
      const sortedAds = allAds.sort((a, b) => {
        if (a.position !== b.position) {
          return a.position === 'left' ? -1 : 1
        }
        return a.slot - b.slot
      })
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

  // Create array of 20 cards (fill with ads and empty slots)
  const getDisplayCards = () => {
    const cards: (Ad | null)[] = []
    
    // Fill with ads first
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (i < ads.length) {
        cards.push(ads[i])
      } else {
        cards.push(null)
      }
    }
    
    return cards
  }

  const displayCards = getDisplayCards()

  if (loading) {
    return null
  }

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm h-16">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide py-2 px-4 gap-3 h-full items-center"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Render cards twice for seamless loop */}
        {[...displayCards, ...displayCards].map((ad, index) => (
          ad ? (
            <a
              key={`${ad.ad_id}-${index}`}
              href={ad.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 min-w-fit flex-shrink-0 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {ad.logo_url && (
                <img
                  src={ad.logo_url}
                  alt={ad.name}
                  className="h-8 w-8 object-contain rounded-full flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
                {ad.name}
              </span>
            </a>
          ) : (
            <div
              key={`empty-${index}`}
              className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 min-w-fit flex-shrink-0 border border-dashed border-gray-300 opacity-50"
            >
              <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0"></div>
              <span className="font-semibold text-sm text-gray-400 whitespace-nowrap">
                Disponible
              </span>
            </div>
          )
        ))}
      </div>
      
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

