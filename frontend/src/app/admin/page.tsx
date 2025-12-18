'use client'

import { RoleGuard } from '@/components/RoleGuard'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  return (
    <RoleGuard requiredRole={['admin', 'super-admin']}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Administration
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Bienvenue, {user?.name || user?.email}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/')}>
                  Retour à l'accueil
                </Button>
                <Button variant="secondary" onClick={signOut}>
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/sites')}>
              <h2 className="text-lg font-semibold">Configuration du site</h2>
              <p className="mt-2 text-gray-600">Gérer les paramètres généraux</p>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/ai-config')}>
              <h2 className="text-lg font-semibold">Assistant IA</h2>
              <p className="mt-2 text-gray-600">Configurer le prompt et les documents</p>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/poi')}>
              <h2 className="text-lg font-semibold">Points d'intérêt</h2>
              <p className="mt-2 text-gray-600">Gérer les POI et parcours</p>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/stats')}>
              <h2 className="text-lg font-semibold">Statistiques</h2>
              <p className="mt-2 text-gray-600">Voir les analytics et l'usage</p>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}

