'use client'

import { AdSidebar } from './AdSidebar'
import { AdBanner } from './AdBanner'

/**
 * Container component that displays ads appropriately for desktop (sidebars) and mobile (banner)
 */
export function AdsContainer() {
  return (
    <>
      {/* Desktop: Sidebars */}
      <AdSidebar position="left" />
      <AdSidebar position="right" />
      
      {/* Mobile: Banner */}
      <AdBanner />
    </>
  )
}

