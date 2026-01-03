'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'
import { Ad } from '@/types'

export default function AdsAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    link: '',
    position: 'left' as 'left' | 'right',
    slot: 1,
    active: true,
    logo: null as File | null,
  })

  useEffect(() => {
    loadAds()
  }, [])

  const loadAds = async () => {
    try {
      setLoading(true)
      const allAds = await api.listAds()
      setAds(allAds)
    } catch (error) {
      console.error('Error loading ads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingAd) {
        await api.updateAd(editingAd.ad_id, formData)
      } else {
        await api.createAd(formData)
      }
      await loadAds()
      resetForm()
    } catch (error) {
      console.error('Error saving ad:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad)
    setFormData({
      name: ad.name,
      description: ad.description,
      link: ad.link,
      position: ad.position,
      slot: ad.slot,
      active: ad.active,
      logo: null,
    })
    setShowForm(true)
  }

  const handleDelete = async (adId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      return
    }
    try {
      await api.deleteAd(adId)
      await loadAds()
    } catch (error) {
      console.error('Error deleting ad:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setEditingAd(null)
    setShowForm(false)
    setFormData({
      name: '',
      description: '',
      link: '',
      position: 'left',
      slot: 1,
      active: true,
      logo: null,
    })
  }

  const getAdsByPosition = (position: 'left' | 'right') => {
    return ads.filter((ad) => ad.position === position).sort((a, b) => a.slot - b.slot)
  }

  if (loading) {
    return (
      <RoleGuard requiredRole="admin">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </RoleGuard>
    )
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
                    Gestion des Publicités
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Gérez les annonces publicitaires
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/admin')}>
                  Retour
                </Button>
                <Button onClick={() => setShowForm(true)}>
                  {showForm ? 'Annuler' : 'Nouvelle annonce'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          {showForm && (
            <div className="mb-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingAd ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lien *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.link}
                      onChange={(e) =>
                        setFormData({ ...formData, link: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position *
                    </label>
                    <select
                      required
                      value={formData.position}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          position: e.target.value as 'left' | 'right',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="left">Gauche</option>
                      <option value="right">Droite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emplacement (1-5) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={5}
                      value={formData.slot}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slot: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          logo: e.target.files?.[0] || null,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Annonce active
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingAd ? 'Modifier' : 'Créer'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Left Sidebar Ads */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Sidebar Gauche</h2>
              <div className="space-y-2">
                {getAdsByPosition('left').map((ad) => (
                  <div
                    key={ad.ad_id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          Slot {ad.slot}
                        </span>
                        {!ad.active && (
                          <span className="text-xs text-red-500">Inactif</span>
                        )}
                      </div>
                      <div className="font-medium">{ad.name}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(ad)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(ad.ad_id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
                {getAdsByPosition('left').length === 0 && (
                  <p className="text-gray-500 text-sm">
                    Aucune annonce pour la sidebar gauche
                  </p>
                )}
              </div>
            </div>

            {/* Right Sidebar Ads */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Sidebar Droite</h2>
              <div className="space-y-2">
                {getAdsByPosition('right').map((ad) => (
                  <div
                    key={ad.ad_id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          Slot {ad.slot}
                        </span>
                        {!ad.active && (
                          <span className="text-xs text-red-500">Inactif</span>
                        )}
                      </div>
                      <div className="font-medium">{ad.name}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(ad)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(ad.ad_id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
                {getAdsByPosition('right').length === 0 && (
                  <p className="text-gray-500 text-sm">
                    Aucune annonce pour la sidebar droite
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}

