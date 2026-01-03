'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { AdsContainer } from '@/components/AdsContainer'

export default function Home() {
  const { user, signOut, isAuthenticated, loading: authLoading } = useAuth()
  const { hasProfile, loading: profileLoading } = useProfile()
  const router = useRouter()

  // Redirect to onboarding if user is authenticated but doesn't have a profile
  useEffect(() => {
    if (!authLoading && !profileLoading && isAuthenticated && !hasProfile) {
      router.push('/onboarding')
    }
  }, [authLoading, profileLoading, isAuthenticated, hasProfile, router])

  // Show loading while checking auth and profile
  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      {/* Ads - Desktop sidebars and Mobile banner */}
      <AdsContainer />
      
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-16 lg:p-24 lg:pl-80 lg:pr-80 pt-16 lg:pt-24">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">
          City Platform
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-600 text-center px-4">
          Découvrez votre ville autrement
        </p>
        
        {isAuthenticated && user && hasProfile && (
          <div className="mt-8 space-y-4 text-center w-full max-w-md px-4">
            <p className="text-gray-700">
              Bienvenue, {user.name || user.email}!
            </p>
            <p className="text-sm text-gray-500">
              Rôle: {user.role}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch w-full max-w-2xl">
              <Button onClick={() => router.push('/map')} className="w-full sm:w-48 sm:min-w-[192px] sm:max-w-[192px]">
                Voir la carte
              </Button>
              <Button onClick={() => router.push('/ai')} variant="outline" className="w-full sm:w-48 sm:min-w-[192px] sm:max-w-[192px]">
                Assistant IA
              </Button>
              <Button onClick={() => router.push('/quiz')} variant="outline" className="w-full sm:w-48 sm:min-w-[192px] sm:max-w-[192px]">
                Quiz
              </Button>
              {user.role === 'admin' && (
                <Button onClick={() => router.push('/admin')} variant="outline" className="w-full sm:w-48 sm:min-w-[192px] sm:max-w-[192px]">
                  Administration
                </Button>
              )}
              <Button onClick={signOut} variant="secondary" className="w-full sm:w-48 sm:min-w-[192px] sm:max-w-[192px]">
                Déconnexion
              </Button>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  )
}

