'use client'

import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { user, signOut, isAuthenticated } = useAuth()
  const router = useRouter()

  return (
    <AuthGuard requireAuth={true}>
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold text-blue-600">
          City Platform
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Découvrez votre ville autrement
        </p>
        
        {isAuthenticated && user && (
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

