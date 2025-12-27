'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'

export default function MapPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hasProfile, loading: profileLoading } = useProfile()
  const router = useRouter()

  // Redirect if not authenticated or no profile
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (!hasProfile) {
        router.push('/onboarding')
      }
    }
  }, [authLoading, profileLoading, isAuthenticated, hasProfile, router])

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="flex h-screen flex-col">
        <header className="border-b bg-white px-4 py-3">
          <h1 className="text-xl font-semibold">Carte interactive</h1>
        </header>
        
        <main className="flex-1">
          {/* TODO: Implémenter la carte Leaflet */}
          {/* - Affichage des POI */}
          {/* - Parcours */}
          {/* - Détails au clic */}
          <div className="flex h-full items-center justify-center bg-gray-100">
            <p className="text-gray-500">Carte à implémenter</p>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

