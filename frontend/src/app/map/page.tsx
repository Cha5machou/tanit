'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import { api } from '@/services/api'
import { POI } from '@/types'
import dynamic from 'next/dynamic'

// Dynamically import Leaflet only on client side to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Chargement de la carte...</div>
})

export default function MapPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pois, setPois] = useState<POI[]>([])
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadPOIs()
    }
  }, [authLoading, isAuthenticated])

  const loadPOIs = async () => {
    try {
      const data = await api.listPOIs()
      setPois(data)
    } catch (error) {
      console.error('Error loading POIs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
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
    <AuthGuard requireAuth={true} requireProfile={true}>
      <div className="flex h-screen flex-col">
        <header className="border-b bg-white px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Carte interactive</h1>
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            Retour
          </button>
        </header>
        
        <main className="flex-1 relative">
          <MapComponent pois={pois} onPoiClick={setSelectedPoi} />
          
          {selectedPoi && (
            <div className="absolute bottom-0 left-0 right-0 bg-white shadow-lg rounded-t-lg p-6 max-h-[50vh] overflow-y-auto z-[1000]">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedPoi.name}</h2>
                <button
                  onClick={() => setSelectedPoi(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {selectedPoi.is_ad && (
                <div className="mb-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Publicité
                  </span>
                </div>
              )}
              
              {selectedPoi.photo_url && (
                <div className="mb-4">
                  <img
                    src={selectedPoi.photo_url}
                    alt={selectedPoi.name}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      console.error('Error loading POI image:', selectedPoi.photo_url)
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              
              <div
                className="mb-4 text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedPoi.description }}
              />
              
              {selectedPoi.audio_url && (
                <div className="mt-4">
                  <audio 
                    controls 
                    src={selectedPoi.audio_url} 
                    className="w-full"
                    onError={(e) => {
                      console.error('Error loading POI audio:', selectedPoi.audio_url)
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
