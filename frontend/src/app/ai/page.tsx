'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { AuthGuard } from '@/components/AuthGuard'

export default function AIPage() {
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
          <h1 className="text-xl font-semibold">Assistant IA</h1>
        </header>
        
        <main className="flex flex-1 flex-col">
          {/* Zone de messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* TODO: Implémenter l'historique des messages */}
          </div>
          
          {/* Zone de saisie */}
          <div className="border-t bg-white p-4">
            {/* TODO: Implémenter l'input et l'envoi */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Posez votre question..."
                className="flex-1 rounded-lg border px-4 py-2"
              />
              <button className="rounded-lg bg-primary-600 px-4 py-2 text-white">
                Envoyer
              </button>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

