'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'
import { POI } from '@/types'

export default function POIPage() {
  const router = useRouter()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPoi, setEditingPoi] = useState<POI | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    description: '',
    is_ad: false,
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)

  useEffect(() => {
    loadPOIs()
  }, [])

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

  const resetForm = () => {
    setFormData({
      name: '',
      lat: '',
      lng: '',
      description: '',
      is_ad: false,
    })
    setPhotoFile(null)
    setAudioFile(null)
    setPhotoPreview(null)
    setAudioPreview(null)
    setEditingPoi(null)
    setShowForm(false)
  }

  const handleEdit = (poi: POI) => {
    setEditingPoi(poi)
    setFormData({
      name: poi.name,
      lat: poi.lat.toString(),
      lng: poi.lng.toString(),
      description: poi.description,
      is_ad: poi.is_ad,
    })
    setPhotoPreview(poi.photo_url || null)
    setAudioPreview(poi.audio_url || null)
    setShowForm(true)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAudioFile(file)
      setAudioPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const poiData = {
        name: formData.name,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        description: formData.description,
        is_ad: formData.is_ad,
        photo: photoFile || undefined,
        audio: audioFile || undefined,
      }

      if (editingPoi) {
        await api.updatePOI(editingPoi.poi_id, poiData)
      } else {
        await api.createPOI(poiData)
      }
      
      resetForm()
      loadPOIs()
    } catch (error) {
      console.error('Error saving POI:', error)
      alert('Erreur lors de la sauvegarde du POI')
    }
  }

  const handleDelete = async (poiId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce point d'intérêt ?")) {
      return
    }
    
    try {
      await api.deletePOI(poiId)
      loadPOIs()
    } catch (error) {
      console.error('Error deleting POI:', error)
      alert('Erreur lors de la suppression du POI')
    }
  }

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
                    Points d&apos;intérêt
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Gérez les attractions et leurs coordonnées
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => {
                  resetForm()
                  setShowForm(!showForm)
                }}>
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
              <h2 className="text-lg font-semibold mb-4">
                {editingPoi ? "Modifier le point d'intérêt" : "Nouveau point d'intérêt"}
              </h2>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (vous pouvez utiliser des liens HTML dans le texte)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    rows={6}
                    required
                    placeholder="Exemple: Visitez notre site web pour plus d&apos;informations."
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_ad"
                    checked={formData.is_ad}
                    onChange={(e) => setFormData({ ...formData, is_ad: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_ad" className="ml-2 block text-sm text-gray-900">
                    C'est une publicité
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {photoPreview && (
                    <div className="mt-2">
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="max-w-xs h-32 object-cover rounded"
                        onError={(e) => {
                          console.error('Error loading image:', photoPreview)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  {editingPoi && editingPoi.photo_url && !photoPreview && (
                    <div className="mt-2">
                      <img 
                        src={editingPoi.photo_url} 
                        alt="Current" 
                        className="max-w-xs h-32 object-cover rounded"
                        onError={(e) => {
                          console.error('Error loading existing image:', editingPoi.photo_url)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audio
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {audioPreview && (
                    <div className="mt-2">
                      <audio 
                        controls 
                        src={audioPreview} 
                        className="w-full"
                        onError={(e) => {
                          console.error('Error loading audio:', audioPreview)
                        }}
                      />
                    </div>
                  )}
                  {editingPoi && editingPoi.audio_url && !audioPreview && (
                    <div className="mt-2">
                      <audio 
                        controls 
                        src={editingPoi.audio_url} 
                        className="w-full"
                        onError={(e) => {
                          console.error('Error loading existing audio:', editingPoi.audio_url)
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary">
                    {editingPoi ? 'Modifier' : 'Créer'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-lg bg-white shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Liste des points d&apos;intérêt</h2>
              {loading ? (
                <p className="text-gray-500">Chargement...</p>
              ) : pois.length === 0 ? (
                <p className="text-gray-500">Aucun point d&apos;intérêt</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordonnées</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pub</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pois.map((poi) => (
                        <tr key={poi.poi_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{poi.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {poi.lat.toFixed(6)}, {poi.lng.toFixed(6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {poi.is_ad ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pub
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                Non
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {poi.photo_url ? (
                              <img
                                src={poi.photo_url}
                                alt={poi.name}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                            ) : (
                              <span className="text-gray-400">✗</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {poi.audio_url ? (
                              <audio controls src={poi.audio_url} className="h-8 w-32" />
                            ) : (
                              <span className="text-gray-400">✗</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEdit(poi)}>
                              Modifier
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(poi.poi_id)}>
                              Supprimer
                            </Button>
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
