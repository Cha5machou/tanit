'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
// World map component wrapper (loaded dynamically to avoid SSR issues)
const WorldMapChartWrapper = dynamic(
  () => import('./WorldMapChart').then(mod => ({ default: mod.WorldMapChart })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96">Chargement de la carte...</div> }
)

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

// Sankey Chart Component - Two distinct levels: Level 1 = previous_page, Level 2 = page_path
function SankeyChart({ data }: { data: { nodes: Array<{ name: string, level?: number }>, links: Array<{ source: number, target: number, value: number }> } }) {
  const { nodes, links } = data
  
  if (!nodes || !links || nodes.length === 0) {
    return <div className="text-center text-gray-500 py-8">No flow data available</div>
  }
  
  // Separate nodes by level: Level 1 (sources/previous_page) and Level 2 (targets/page_path)
  const level1Nodes = nodes.filter(n => n.level === 1 || !n.level || nodes.indexOf(n) < nodes.length / 2)
  const level2Nodes = nodes.filter(n => n.level === 2 || (n.level !== 1 && nodes.indexOf(n) >= nodes.length / 2))
  
  // If no level info, split by index (first half = sources, second half = targets)
  const sourceNodes = level1Nodes.length > 0 ? level1Nodes : nodes.slice(0, Math.ceil(nodes.length / 2))
  const targetNodes = level2Nodes.length > 0 ? level2Nodes : nodes.slice(Math.ceil(nodes.length / 2))
  
  // Calculate positions: sources on left (Level 1), targets on right (Level 2)
  const nodeHeight = 30
  const nodeSpacing = 10
  const leftColumnX = 50
  const rightColumnX = 500
  const columnWidth = 400
  
  const nodePositions = new Map<number, { x: number, y: number, name: string }>()
  
  // Position source nodes (Level 1 - left column)
  sourceNodes.forEach((node, idx) => {
    const nodeIdx = nodes.indexOf(node)
    const y = idx * (nodeHeight + nodeSpacing) + 50
    nodePositions.set(nodeIdx, {
      x: leftColumnX,
      y: y,
      name: node.name,
    })
  })
  
  // Position target nodes (Level 2 - right column)
  targetNodes.forEach((node, idx) => {
    const nodeIdx = nodes.indexOf(node)
    const y = idx * (nodeHeight + nodeSpacing) + 50
    nodePositions.set(nodeIdx, {
      x: rightColumnX,
      y: y,
      name: node.name,
    })
  })
  
  const chartHeight = Math.max(sourceNodes.length, targetNodes.length) * (nodeHeight + nodeSpacing) + 100
  const maxValue = Math.max(...links.map(l => l.value), 1)
  
  return (
    <div className="relative overflow-x-auto" style={{ minHeight: '400px' }}>
      <svg width="100%" height={chartHeight} className="overflow-visible" style={{ minWidth: '1000px' }}>
        {/* Draw links */}
        {links.map((link, idx) => {
          const source = nodePositions.get(link.source)
          const target = nodePositions.get(link.target)
          if (!source || !target) return null
          
          const sourceX = source.x + columnWidth
          const sourceY = source.y + nodeHeight / 2
          const targetX = target.x
          const targetY = target.y + nodeHeight / 2
          
          // Calculate control points for curved path
          const controlX1 = sourceX + (targetX - sourceX) * 0.5
          const controlY1 = sourceY
          const controlX2 = sourceX + (targetX - sourceX) * 0.5
          const controlY2 = targetY
          
          const path = `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`
          
          // Width and opacity based on value
          const opacity = Math.min(0.3 + (link.value / maxValue) * 0.7, 1)
          const strokeWidth = Math.max(2, Math.min(link.value / (maxValue / 10), 15))
          
          return (
            <g key={idx}>
              <path
                d={path}
                fill="none"
                stroke="#8884d8"
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
              <title>{`${source.name} → ${target.name}: ${link.value} transitions`}</title>
            </g>
          )
        })}
        
        {/* Draw Level 1 nodes (Previous Page - left column) */}
        {sourceNodes.map((node, idx) => {
          const nodeIdx = nodes.indexOf(node)
          const pos = nodePositions.get(nodeIdx)!
          return (
            <g key={`source-${nodeIdx}`}>
              <rect
                x={pos.x}
                y={pos.y}
                width={columnWidth}
                height={nodeHeight}
                fill="#8884d8"
                rx={4}
              />
              <text
                x={pos.x + columnWidth / 2}
                y={pos.y + nodeHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="12"
                fontWeight="500"
              >
                {pos.name}
              </text>
            </g>
          )
        })}
        
        {/* Draw Level 2 nodes (Page Path - right column) */}
        {targetNodes.map((node, idx) => {
          const nodeIdx = nodes.indexOf(node)
          const pos = nodePositions.get(nodeIdx)!
          return (
            <g key={`target-${nodeIdx}`}>
              <rect
                x={pos.x}
                y={pos.y}
                width={columnWidth}
                height={nodeHeight}
                fill="#00C49F"
                rx={4}
              />
              <text
                x={pos.x + columnWidth / 2}
                y={pos.y + nodeHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="12"
                fontWeight="500"
              >
                {pos.name}
              </text>
            </g>
          )
        })}
      </svg>
      
      {/* Legend */}
      <div className="mt-4 text-sm text-gray-600 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#8884d8] rounded"></div>
          <span>Level 1: Previous Page</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#00C49F] rounded"></div>
          <span>Level 2: Page Path</span>
        </div>
        <span className="text-gray-400">|</span>
        <span>Line thickness represents number of transitions</span>
      </div>
    </div>
  )
}


export default function MonitoringPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'analytics' | 'ai'>('analytics')
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'traffic' | 'engagement' | 'acquisition'>('overview')
  const [aiTab, setAiTab] = useState<'conversations' | 'performance' | 'traces'>('conversations')
  const [trafficPeriod, setTrafficPeriod] = useState<'day' | 'week' | 'month'>('day')
  
  // Analytics data
  const [overviewData, setOverviewData] = useState<any>(null)
  const [trafficData, setTrafficData] = useState<any>(null)
  const [engagementData, setEngagementData] = useState<any>(null)
  const [acquisitionData, setAcquisitionData] = useState<any>(null)
  
  // AI data
  const [conversationsData, setConversationsData] = useState<any>(null)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [tracesData, setTracesData] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [closingVisits, setClosingVisits] = useState(false)

  useEffect(() => {
    // Only load data when authenticated and not loading
    if (!authLoading && isAuthenticated) {
      loadData()
    }
  }, [analyticsTab, aiTab, trafficPeriod, isAuthenticated, authLoading])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'analytics') {
        if (analyticsTab === 'overview') {
          const data = await api.getAnalyticsOverview()
          setOverviewData(data)
        } else if (analyticsTab === 'traffic') {
          const data = await api.getTrafficAnalytics(trafficPeriod)
          setTrafficData(data)
        } else if (analyticsTab === 'engagement') {
          const data = await api.getEngagementAnalytics()
          setEngagementData(data)
        } else if (analyticsTab === 'acquisition') {
          const data = await api.getAcquisitionAnalytics()
          setAcquisitionData(data)
        }
      } else if (activeTab === 'ai') {
        if (aiTab === 'conversations') {
          const data = await api.getAIConversationsAnalytics()
          setConversationsData(data)
        } else if (aiTab === 'performance') {
          const data = await api.getAIPerformanceAnalytics()
          setPerformanceData(data)
        } else if (aiTab === 'traces') {
          const data = await api.getAITracesAnalytics()
          setTracesData(data)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseInactiveVisits = async () => {
    setClosingVisits(true)
    try {
      const result = await api.closeInactiveVisits(30)
      alert(`Fermé ${result.closed_count} visites inactives`)
      // Reload current tab data
      await loadData()
    } catch (error) {
      console.error('Error closing inactive visits:', error)
      alert('Erreur lors de la fermeture des visites inactives')
    } finally {
      setClosingVisits(false)
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
                  Monitoring & Analytics Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Analytics détaillés et monitoring de l'utilisation de l'IA
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCloseInactiveVisits}
                  disabled={closingVisits}
                >
                  {closingVisits ? 'Fermeture...' : 'Fermer visites inactives'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/admin')}>
                  Retour
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          {/* Main Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => {
                    setActiveTab('analytics')
                    setAnalyticsTab('overview')
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Analytics Dashboard
                </button>
                <button
                  onClick={() => {
                    setActiveTab('ai')
                    setAiTab('conversations')
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'ai'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  AI Usage Dashboard
                </button>
              </nav>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement des données...</p>
            </div>
          ) : (
            <>
              {/* Analytics Dashboard */}
              {activeTab === 'analytics' && (
                <div>
                  {/* Analytics Sub-tabs */}
                  <div className="mb-6">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setAnalyticsTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          analyticsTab === 'overview'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setAnalyticsTab('traffic')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          analyticsTab === 'traffic'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Traffic
                      </button>
                      <button
                        onClick={() => setAnalyticsTab('engagement')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          analyticsTab === 'engagement'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Engagement
                      </button>
                      <button
                        onClick={() => setAnalyticsTab('acquisition')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          analyticsTab === 'acquisition'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Acquisition
                      </button>
                    </div>
                  </div>

                  {/* Overview Tab */}
                  {analyticsTab === 'overview' && overviewData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Total Users</div>
                          <div className="text-2xl font-bold text-gray-900">{overviewData.total_users}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Active Sessions</div>
                          <div className="text-2xl font-bold text-blue-600">{overviewData.active_sessions}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Total Pageviews</div>
                          <div className="text-2xl font-bold text-green-600">{overviewData.total_pageviews}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Avg Session Duration</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {overviewData.avg_session_duration_minutes?.toFixed(1)} min
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Pages per Session</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {overviewData.pages_per_session?.toFixed(1)}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Bounce Rate</div>
                          <div className="text-2xl font-bold text-red-600">
                            {overviewData.bounce_rate?.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Country Distribution */}
                      {overviewData.country_distribution && overviewData.country_distribution.length > 0 && (
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">User Country Distribution</h3>
                          <div className="w-full overflow-x-auto">
                            <WorldMapChartWrapper data={overviewData.country_distribution} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Traffic Tab */}
                  {analyticsTab === 'traffic' && trafficData && (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <div className="flex gap-2">
                          <Button
                            variant={trafficPeriod === 'day' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setTrafficPeriod('day')}
                          >
                            Daily
                          </Button>
                          <Button
                            variant={trafficPeriod === 'week' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setTrafficPeriod('week')}
                          >
                            Weekly
                          </Button>
                          <Button
                            variant={trafficPeriod === 'month' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setTrafficPeriod('month')}
                          >
                            Monthly
                          </Button>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Sessions Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={trafficData.sessions_over_time}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#0088FE" name="Sessions" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Pageviews Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={trafficData.pageviews_over_time}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#00C49F" name="Pageviews" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Users Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={trafficData.users_over_time}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#FF8042" name="Users" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Engagement Tab */}
                  {analyticsTab === 'engagement' && engagementData && (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Time per Page</h3>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={engagementData.time_per_page?.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="page" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avg_duration_seconds" fill="#8884d8" name="Avg Duration (s)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Sankey Chart */}
                      {engagementData.sankey && (
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Page Flow (Sankey Diagram)</h3>
                          <div className="overflow-x-auto">
                            <SankeyChart data={engagementData.sankey} />
                          </div>
                        </div>
                      )}
                      
                      {/* Page Visits Count - Horizontal Bar Chart */}
                      {engagementData.page_visits_count && (
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Page Visits Count</h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart 
                              data={engagementData.page_visits_count.slice(0, 15)}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="page" type="category" width={150} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="count" fill="#8884d8" name="Visits" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Top Exit Pages</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={engagementData.exit_pages}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="page" angle={-45} textAnchor="end" height={80} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#FF8042" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Top Entry Pages</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={engagementData.entry_pages}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="page" angle={-45} textAnchor="end" height={80} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#00C49F" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acquisition Tab */}
                  {analyticsTab === 'acquisition' && acquisitionData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Channels</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={acquisitionData.channels?.map((entry: any) => ({
                                  name: entry.channel || entry.name || 'Unknown',
                                  value: entry.count || entry.value || 0,
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {acquisitionData.channels?.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Devices</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={acquisitionData.devices?.map((entry: any) => ({
                                  name: entry.device || entry.name || 'Unknown',
                                  value: entry.count || entry.value || 0,
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {acquisitionData.devices?.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Browsers</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={acquisitionData.browsers}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="browser" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#0088FE" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-4">Operating Systems</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={acquisitionData.operating_systems}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="os" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#00C49F" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Usage Dashboard */}
              {activeTab === 'ai' && (
                <div>
                  {/* AI Sub-tabs */}
                  <div className="mb-6">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setAiTab('conversations')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          aiTab === 'conversations'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Conversations
                      </button>
                      <button
                        onClick={() => setAiTab('performance')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          aiTab === 'performance'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Performance
                      </button>
                      <button
                        onClick={() => setAiTab('traces')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          aiTab === 'traces'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Traces
                      </button>
                    </div>
                  </div>

                  {/* Conversations Tab */}
                  {aiTab === 'conversations' && conversationsData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Total Conversations</div>
                          <div className="text-2xl font-bold text-blue-600">{conversationsData.total_conversations}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Avg per User</div>
                          <div className="text-2xl font-bold text-green-600">
                            {conversationsData.avg_conversations_per_user?.toFixed(1)}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Avg Messages/Conv</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {conversationsData.avg_messages_per_conversation?.toFixed(1)}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Active (30d)</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {conversationsData.active_conversations_30d}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Tab */}
                  {aiTab === 'performance' && performanceData && (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Model Performance</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input Tokens</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output Tokens</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost (USD)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Latency (ms)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {performanceData.model_performance?.map((model: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{model.model}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{model.input_tokens.toLocaleString()}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{model.output_tokens.toLocaleString()}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">${model.total_cost_usd.toFixed(4)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{model.avg_latency_ms.toFixed(0)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{model.request_count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Token Usage Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={performanceData.token_usage_over_time}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="input_tokens" stackId="1" stroke="#0088FE" fill="#0088FE" name="Input Tokens" />
                            <Area type="monotone" dataKey="output_tokens" stackId="1" stroke="#00C49F" fill="#00C49F" name="Output Tokens" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Cost Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={performanceData.cost_over_time}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="cost_usd" stroke="#FF8042" name="Cost (USD)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Traces Tab */}
                  {aiTab === 'traces' && tracesData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Total Traces</div>
                          <div className="text-2xl font-bold text-blue-600">{tracesData.total_traces}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Error Rate</div>
                          <div className="text-2xl font-bold text-red-600">{tracesData.error_rate}%</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Error Count</div>
                          <div className="text-2xl font-bold text-orange-600">{tracesData.error_count}</div>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Trace Types</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={tracesData.trace_types}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="type" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </RoleGuard>
  )
}
