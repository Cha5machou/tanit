'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'

export default function QuizPage() {
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
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Quiz</h1>
            <p className="mt-2 text-gray-600">
              Testez vos connaissances sur la ville
            </p>
          </div>
          
          {/* TODO: Implémenter le système de quiz */}
          {/* - Affichage des questions */}
          {/* - Sélection des réponses */}
          {/* - Score final */}
          {/* - Classement */}
        </div>
      </div>
    </AuthGuard>
  )
}

