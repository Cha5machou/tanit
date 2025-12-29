'use client'

import { usePageTracking } from '@/hooks/usePageTracking'

/**
 * Client component to enable page tracking
 * Must be used in a client component context
 */
export function PageTracking() {
  usePageTracking()
  return null
}

