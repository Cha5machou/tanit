'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'

interface POI {
  id: string
  name: string
  lat: number
  lng: number
  description: string
}

export default function POIPage() {
  const router = useRouter()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    description: '',
  })

  useEffect(() => {
    loadPOIs()
  }, [])

  const loadPOIs = async () => {
    try {
      // TODO: Implement API call
      // const data = await api.getPOIs()
      // setPois(data)
    } catch (error) {
      console.error('Error loading POIs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // TODO: Implement API call
      // await api.createPOI(formData)
      setShowForm(false)
      loadPOIs()
    } catch (error) {
      console.error('Error creating POI:', error)
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
                  Points d'intérêt
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Gérez les attractions et leurs coordonnées
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                  {showForm ? 'Annuler' : 'Ajouter un POI'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/admin')}>
                  Retour
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          {showForm && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold mb-4">Nouveau point d'intérêt</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nom"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Latitude"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    label="Longitude"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    required
                  />
                </div>
                <textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={4}
                  required
                />
                <Button type="submit" variant="primary">Créer</Button>
              </form>
            </div>
          )}

          <div className="rounded-lg bg-white shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Liste des points d'intérêt</h2>
              {loading ? (
                <p className="text-gray-500">Chargement...</p>
              ) : pois.length === 0 ? (
                <p className="text-gray-500">Aucun point d'intérêt</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordonnées</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pois.map((poi) => (
                        <tr key={poi.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{poi.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {poi.lat}, {poi.lng}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{poi.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Button variant="outline" size="sm" className="mr-2">Modifier</Button>
                            <Button variant="outline" size="sm">Supprimer</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}

