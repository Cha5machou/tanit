'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ProfileCreate } from '@/types'

export default function OnboardingPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState<ProfileCreate>({
    age: undefined,
    sexe: undefined,
    metier: undefined,
    raison_visite: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Check if profile already exists
  useEffect(() => {
    if (user && !authLoading) {
      api.getProfile()
        .then(() => {
          // Profile exists, redirect to home
          router.push('/')
        })
        .catch(() => {
          // Profile doesn't exist, stay on onboarding
        })
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await api.createProfile(formData)
      router.push('/')
    } catch (err: any) {
      console.error('Error creating profile:', err)
      setError(err.message || 'Erreur lors de la création du profil')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Complétez votre profil
          </h2>
          <p className="mt-2 text-gray-600">
            Aidez-nous à personnaliser votre expérience
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="number"
            label="Âge"
            placeholder="Votre âge"
            min="1"
            max="120"
            value={formData.age || ''}
            onChange={(e) =>
              setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })
            }
          />

          <Select
            label="Sexe"
            options={[
              { value: 'homme', label: 'Homme' },
              { value: 'femme', label: 'Femme' },
              { value: 'autre', label: 'Autre' },
              { value: 'prefere_ne_pas_dire', label: 'Préfère ne pas dire' },
            ]}
            value={formData.sexe || ''}
            onChange={(e) =>
              setFormData({ ...formData, sexe: e.target.value || undefined })
            }
          />

          <Input
            type="text"
            label="Métier"
            placeholder="Votre profession"
            value={formData.metier || ''}
            onChange={(e) =>
              setFormData({ ...formData, metier: e.target.value || undefined })
            }
          />

          <Select
            label="Raison de la visite"
            options={[
              { value: 'tourisme', label: 'Tourisme' },
              { value: 'affaires', label: 'Affaires' },
              { value: 'etudes', label: 'Études' },
              { value: 'resident', label: 'Résident' },
              { value: 'autre', label: 'Autre' },
            ]}
            value={formData.raison_visite || ''}
            onChange={(e) =>
              setFormData({ ...formData, raison_visite: e.target.value || undefined })
            }
          />

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={loading}
            >
              Continuer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/')}
            >
              Passer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
