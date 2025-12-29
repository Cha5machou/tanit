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
      if (visitIdRef.current && previousPathnameRef.current && previousPathnameRef.current !== pathname) {
        const endTime = new Date()
        try {
          await api.endPageVisit(visitIdRef.current, endTime)
          visitIdRef.current = null
          startTimeRef.current = null
        } catch (error) {
          console.warn('Failed to end previous page visit:', error)
        }
      }
    }

    // Track page entry
    const trackNewVisit = async () => {
      // First, close previous visit if exists
      await closePreviousVisit()

      const startTime = new Date()
      startTimeRef.current = startTime
      
      // Get previous page (from referrer or previous pathname)
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
        })
        if (visitId) {
          visitIdRef.current = visitId
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

