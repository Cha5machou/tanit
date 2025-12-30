'use client'

import { RoleGuard } from '@/components/RoleGuard'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo size="md" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Administration
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Bienvenue, {user?.name || user?.email}
                  </p>
                </div>
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
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/users')}>
              <h2 className="text-lg font-semibold">Gestion des utilisateurs</h2>
              <p className="mt-2 text-gray-600">Gérer les rôles des utilisateurs (user/admin)</p>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/ai-agent')}>
              <h2 className="text-lg font-semibold">Agent IA</h2>
              <p className="mt-2 text-gray-600">Gérer les documents et la configuration de l'agent IA</p>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/poi')}>
              <h2 className="text-lg font-semibold">Points d'intérêt</h2>
              <p className="mt-2 text-gray-600">Gérer les attractions et leurs coordonnées</p>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/quiz')}>
              <h2 className="text-lg font-semibold">Quiz</h2>
              <p className="mt-2 text-gray-600">Gérer les questions et réponses des quiz</p>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/monitoring')}>
              <h2 className="text-lg font-semibold">Monitoring & Analytics</h2>
              <p className="mt-2 text-gray-600">Statistiques d'utilisation et analytics détaillés</p>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}

