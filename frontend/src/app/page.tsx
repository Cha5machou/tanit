'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

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
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold text-blue-600">
          City Platform
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Découvrez votre ville autrement
        </p>
        
        {isAuthenticated && user && hasProfile && (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-gray-700">
              Bienvenue, {user.name || user.email}!
            </p>
            <p className="text-sm text-gray-500">
              Rôle: {user.role}
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/map')}>
                Voir la carte
              </Button>
              <Button onClick={() => router.push('/ai')} variant="outline">
                Assistant IA
              </Button>
              {user.role === 'admin' && (
                <Button onClick={() => router.push('/admin')} variant="outline">
                  Administration
                </Button>
              )}
              <Button onClick={signOut} variant="secondary">
                Déconnexion
              </Button>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  )
}

