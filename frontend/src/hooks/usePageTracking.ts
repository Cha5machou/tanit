'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './useAuth'
import { api } from '@/services/api'
import { API_V1_URL } from '@/lib/constants'
import { getIdToken } from '@/services/auth'

/**
 * Detect device type from user agent
 */
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent.toLowerCase()
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet'
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

/**
 * Hook to automatically track page visits
 * Tracks when user enters and leaves a page
 */
export function usePageTracking() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const visitIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const previousPathnameRef = useRef<string | null>(null)

  // Handle pending visit end from previous page (runs once on mount)
  useEffect(() => {
    if (!isAuthenticated) return
    
    try {
      // Restore visitId from sessionStorage if available
      const storedVisitId = sessionStorage.getItem('current_page_visit_id')
      const storedStartTime = sessionStorage.getItem('current_page_visit_start_time')
      const storedPath = sessionStorage.getItem('current_page_visit_path')
      
      if (storedVisitId && storedPath && storedPath !== pathname) {
        // We have a previous visit that needs to be closed
        visitIdRef.current = storedVisitId
        if (storedStartTime) {
          startTimeRef.current = new Date(storedStartTime)
        }
        previousPathnameRef.current = storedPath
      }
      
      // Handle any pending visit end
      const pending = sessionStorage.getItem('pending_page_visit_end')
      if (pending) {
        const data = JSON.parse(pending)
        api.endPageVisit(data.visit_id, new Date(data.end_time))
          .catch(() => {
            // Silently fail
          })
        sessionStorage.removeItem('pending_page_visit_end')
      }
    } catch (e) {
      // Silently fail
      console.warn('[PageTracking] Error restoring visit state:', e)
    }
  }, [isAuthenticated])

  // Track page visits
  useEffect(() => {
    // Only track if user is authenticated
    if (!isAuthenticated) {
      return
    }

    // Close previous page visit if pathname changed
    const closePreviousVisit = async () => {
      // Try to get visitId from ref first, then from sessionStorage
      let currentVisitId = visitIdRef.current
      if (!currentVisitId) {
        currentVisitId = sessionStorage.getItem('current_page_visit_id')
      }
      
      let currentPath = previousPathnameRef.current
      if (!currentPath) {
        currentPath = sessionStorage.getItem('current_page_visit_path')
      }
      
      let currentStartTime = startTimeRef.current
      if (!currentStartTime && sessionStorage.getItem('current_page_visit_start_time')) {
        currentStartTime = new Date(sessionStorage.getItem('current_page_visit_start_time')!)
      }
      
      // Only close if we have a visit ID, a previous path, and pathname has changed
      if (currentVisitId && currentPath && currentPath !== pathname) {
        const endTime = new Date()
        try {
          const duration = currentStartTime ? (endTime.getTime() - currentStartTime.getTime()) / 1000 : 0
          console.log(`[PageTracking] Closing visit ${currentVisitId} (UUID) for path ${currentPath} -> ${pathname} (duration: ${duration}s)`)
          
          const response = await api.endPageVisit(currentVisitId, endTime)
          console.log(`[PageTracking] Successfully closed visit ${currentVisitId} for ${currentPath}`)
          
          // Clear refs and sessionStorage after successful close
          visitIdRef.current = null
          startTimeRef.current = null
          sessionStorage.removeItem('current_page_visit_id')
          sessionStorage.removeItem('current_page_visit_start_time')
          sessionStorage.removeItem('current_page_visit_path')
        } catch (error) {
          console.error('[PageTracking] Failed to end previous page visit:', error)
          // Don't clear refs if update failed - might retry later
        }
      } else {
        if (!currentVisitId) {
          console.log(`[PageTracking] No visit ID to close (path: ${currentPath} -> ${pathname})`)
        }
        if (!currentPath) {
          console.log(`[PageTracking] No previous path (current path: ${pathname})`)
        }
        if (currentPath === pathname) {
          console.log(`[PageTracking] Path unchanged (${pathname}), not closing`)
        }
      }
    }

    // Track page entry
    const trackNewVisit = async () => {
      // First, close previous visit if exists (before updating refs)
      await closePreviousVisit()

      const startTime = new Date()
      startTimeRef.current = startTime
      
      // Get previous page (from referrer or previous pathname)
      // Do this BEFORE updating previousPathnameRef
      let previousPage = previousPathnameRef.current || null
      if (!previousPage && typeof window !== 'undefined') {
        // Try to get from document.referrer
        const referrer = document.referrer
        if (referrer) {
          try {
            const referrerUrl = new URL(referrer)
            // If referrer is from same origin, extract pathname
            if (referrerUrl.origin === window.location.origin) {
              previousPage = referrerUrl.pathname
            } else {
              // External referrer
              previousPage = referrer
            }
          } catch {
            previousPage = referrer
          }
        }
      }
      
      // Get device type
      const deviceType = getDeviceType()
      
      // Parse UTM parameters and acquisition channel from URL
      let utmParams: Record<string, string> = {}
      let acquisitionChannel: string | null = null
      
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        
        // Extract UTM parameters
        const utmSource = urlParams.get('utm_source')
        const utmMedium = urlParams.get('utm_medium')
        const utmCampaign = urlParams.get('utm_campaign')
        const utmTerm = urlParams.get('utm_term')
        const utmContent = urlParams.get('utm_content')
        
        if (utmSource) utmParams.utm_source = utmSource
        if (utmMedium) utmParams.utm_medium = utmMedium
        if (utmCampaign) utmParams.utm_campaign = utmCampaign
        if (utmTerm) utmParams.utm_term = utmTerm
        if (utmContent) utmParams.utm_content = utmContent
        
        // Check for custom channel parameter (e.g., ?channel=qr_code)
        const customChannel = urlParams.get('channel')
        if (customChannel) {
          acquisitionChannel = customChannel
        } else if (utmSource && utmMedium) {
          // Build channel from UTM parameters
          acquisitionChannel = `${utmSource}_${utmMedium}`
        }
        
        // Store UTM params in sessionStorage for persistence across pages
        if (Object.keys(utmParams).length > 0) {
          try {
            sessionStorage.setItem('utm_params', JSON.stringify(utmParams))
            if (acquisitionChannel) {
              sessionStorage.setItem('acquisition_channel', acquisitionChannel)
            }
          } catch (e) {
            // Silently fail if sessionStorage is not available
          }
        } else {
          // Try to get from sessionStorage if not in URL (for subsequent pages)
          try {
            const storedUtm = sessionStorage.getItem('utm_params')
            if (storedUtm) {
              utmParams = JSON.parse(storedUtm)
            }
            const storedChannel = sessionStorage.getItem('acquisition_channel')
            if (storedChannel) {
              acquisitionChannel = storedChannel
            }
          } catch (e) {
            // Silently fail
          }
        }
      }
      
      // Update previous pathname AFTER we've closed the previous visit and got previousPage
      previousPathnameRef.current = pathname

      try {
        // Generate session_id (persist in sessionStorage)
        let sessionId = sessionStorage.getItem('session_id')
        if (!sessionId) {
          sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          sessionStorage.setItem('session_id', sessionId)
        }
        
        const visitId = await api.logPageVisit(pathname, startTime, {
          device_type: deviceType,
          previous_page: previousPage,
          session_id: sessionId,
          ...utmParams,
          acquisition_channel: acquisitionChannel,
        })
        if (visitId) {
          visitIdRef.current = visitId
          // Store in sessionStorage for persistence across page navigations
          sessionStorage.setItem('current_page_visit_id', visitId)
          sessionStorage.setItem('current_page_visit_start_time', startTime.toISOString())
          sessionStorage.setItem('current_page_visit_path', pathname)
          console.log(`[PageTracking] Logged new visit ${visitId} (UUID) for path ${pathname}`)
        } else {
          console.warn(`[PageTracking] Failed to get visit ID for path ${pathname}`)
        }
      } catch (error) {
        console.warn('Failed to log page visit:', error)
      }
    }

    trackNewVisit()

    // Track page exit when user leaves the page (beforeunload)
    const handleBeforeUnload = () => {
      if (visitIdRef.current) {
        const endTime = new Date()
        const visitId = visitIdRef.current
        
        // Store visitId in sessionStorage for the next page to handle
        try {
          sessionStorage.setItem('pending_page_visit_end', JSON.stringify({
            visit_id: visitId,
            end_time: endTime.toISOString(),
          }))
        } catch (e) {
          // Silently fail if sessionStorage is not available
        }
      }
      
      // Log session_end when user closes browser/tab
      // Note: We can't use fetchWithAuth here because it's async and the page is unloading
      // Instead, we'll rely on the backend to detect inactive sessions
      // For now, we'll store the session_id in sessionStorage and let the backend handle it
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      // Close current visit when pathname changes or component unmounts
      if (visitIdRef.current) {
        const endTime = new Date()
        api.endPageVisit(visitIdRef.current, endTime)
          .catch((error) => {
            console.warn('Failed to end page visit:', error)
          })
      }
    }
  }, [pathname, isAuthenticated])
}

