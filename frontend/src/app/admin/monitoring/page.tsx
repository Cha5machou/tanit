'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'

export default function MonitoringPage() {
  const router = useRouter()
  const [userStats, setUserStats] = useState<any>(null)
  const [connectionStats, setConnectionStats] = useState<any>(null)
  const [sessionStats, setSessionStats] = useState<any>(null)
  const [langsmith, setLangsmith] = useState<any>(null)
  const [period, setPeriod] = useState<'hour' | 'day' | 'week'>('day')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [period])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [users, connections, sessions, langsmithData] = await Promise.all([
        api.getUserStats(),
        api.getConnectionStats(period),
        api.getSessionStats(),
        api.getLangSmithDashboard(),
      ])
      setUserStats(users)
      setConnectionStats(connections)
      setSessionStats(sessions)
      setLangsmith(langsmithData)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Monitoring & Analytics
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Statistiques d'utilisation et analytics détaillés
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/admin')}>
                Retour
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement des statistiques...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* LangSmith Dashboard */}
              {langsmith?.enabled && (
                <div className="rounded-lg bg-white p-6 shadow">
                  <h2 className="text-lg font-semibold mb-4">LangSmith Dashboard</h2>
                  <p className="text-gray-600 mb-4">
                    Accédez au dashboard LangSmith pour monitorer les tokens, la latence et les coûts.
                  </p>
                  <a
                    href={langsmith.dashboard_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button>Ouvrir LangSmith Dashboard</Button>
                  </a>
                </div>
              )}

              {/* User Stats */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-semibold mb-4">Statistiques des utilisateurs</h2>
                {userStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Total utilisateurs</div>
                      <div className="text-2xl font-bold text-blue-600">{userStats.total_users}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Connection Stats */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Statistiques des connexions</h2>
                  <div className="flex gap-2">
                    <Button
                      variant={period === 'hour' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriod('hour')}
                    >
                      Heure
                    </Button>
                    <Button
                      variant={period === 'day' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriod('day')}
                    >
                      Jour
                    </Button>
                    <Button
                      variant={period === 'week' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriod('week')}
                    >
                      Semaine
                    </Button>
                  </div>
                </div>
                {connectionStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Connexions ({period})</div>
                      <div className="text-2xl font-bold text-green-600">
                        {connectionStats.total_connections}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Période</div>
                      <div className="text-sm text-gray-800">
                        {new Date(connectionStats.start_time).toLocaleString()} -{' '}
                        {new Date(connectionStats.end_time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Session Stats */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-semibold mb-4">Statistiques des sessions</h2>
                {sessionStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-purple-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Total sessions</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {sessionStats.total_sessions}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Sessions complétées</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {sessionStats.completed_sessions}
                      </div>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Temps moyen</div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {sessionStats.average_session_length_minutes.toFixed(1)} min
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  )
}
