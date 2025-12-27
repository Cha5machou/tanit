'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function MonitoringPage() {
  const router = useRouter()
  const [userStats, setUserStats] = useState<any>(null)
  const [connectionStats, setConnectionStats] = useState<any>(null)
  const [sessionStats, setSessionStats] = useState<any>(null)
  const [conversationStats, setConversationStats] = useState<any>(null)
  const [langsmith, setLangsmith] = useState<any>(null)
  const [period, setPeriod] = useState<'hour' | 'day' | 'week'>('day')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [period])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [users, connections, sessions, conversations, langsmithData] = await Promise.all([
        api.getUserStats(),
        api.getConnectionStats(period),
        api.getSessionStats(),
        api.getConversationStats(),
        api.getLangSmithDashboard(),
      ])
      setUserStats(users)
      setConnectionStats(connections)
      setSessionStats(sessions)
      setConversationStats(conversations)
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
                    Monitorer les tokens, la latence et les coûts de l'agent IA.
                  </p>
                  <div className="flex gap-4">
                    <a
                      href={langsmith.dashboard_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button>Ouvrir LangSmith Dashboard</Button>
                    </a>
                    {langsmith.project && (
                      <div className="text-sm text-gray-600 flex items-center">
                        Projet: <strong className="ml-2">{langsmith.project}</strong>
                      </div>
                    )}
                  </div>
                  {langsmith.iframe_url && (
                    <div className="mt-4 border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                      <iframe
                        src={langsmith.iframe_url}
                        className="w-full h-full"
                        title="LangSmith Dashboard"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* User Stats */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-semibold mb-4">Statistiques des utilisateurs</h2>
                {userStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Total utilisateurs</div>
                      <div className="text-2xl font-bold text-blue-600">{userStats.total_users}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Total conversations</div>
                      <div className="text-2xl font-bold text-green-600">{userStats.total_conversations || 0}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Moyenne conversations/user</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {userStats.average_conversations_per_user || 0}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Conversation Stats */}
              {conversationStats && (
                <div className="rounded-lg bg-white p-6 shadow">
                  <h2 className="text-lg font-semibold mb-4">Statistiques des conversations</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-indigo-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Total conversations</div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {conversationStats.total_conversations}
                      </div>
                    </div>
                    <div className="bg-pink-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Total messages</div>
                      <div className="text-2xl font-bold text-pink-600">
                        {conversationStats.total_messages}
                      </div>
                    </div>
                    <div className="bg-cyan-50 p-4 rounded">
                      <div className="text-sm text-gray-600">Moyenne messages/conversation</div>
                      <div className="text-2xl font-bold text-cyan-600">
                        {conversationStats.average_messages_per_conversation?.toFixed(1) || 0}
                      </div>
                    </div>
                  </div>
                  {conversationStats.daily_breakdown && conversationStats.daily_breakdown.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-md font-semibold mb-4">Conversations par jour</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={conversationStats.daily_breakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#6366f1" name="Conversations" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

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
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                    {connectionStats.hourly_breakdown && connectionStats.hourly_breakdown.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-md font-semibold mb-4">Connexions par heure</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={connectionStats.hourly_breakdown}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#10b981" name="Connexions" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {connectionStats.daily_breakdown && connectionStats.daily_breakdown.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-md font-semibold mb-4">Connexions par jour</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={connectionStats.daily_breakdown}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#10b981" name="Connexions" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
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
                        {sessionStats.average_session_length_minutes?.toFixed(1) || 0} min
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
