'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { api } from '@/services/api'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ProfileCreate } from '@/types'

export default function OnboardingPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const { hasProfile, loading: profileLoading } = useProfile()
  const [formData, setFormData] = useState<ProfileCreate>({
    age: undefined,
    sexe: undefined,
    metier: undefined,
    raison_visite: undefined,
    nationalite: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Redirect to home if profile already exists
  useEffect(() => {
    if (!authLoading && !profileLoading && isAuthenticated && hasProfile) {
      router.push('/')
    }
  }, [authLoading, profileLoading, isAuthenticated, hasProfile, router])

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

  // Show loading while checking auth and profile
  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated or if profile already exists (will redirect)
  if (!isAuthenticated || hasProfile) {
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

          <Select
            label="Nationalité"
            options={[
              { value: 'FR', label: 'France' },
              { value: 'BE', label: 'Belgique' },
              { value: 'CH', label: 'Suisse' },
              { value: 'CA', label: 'Canada' },
              { value: 'US', label: 'États-Unis' },
              { value: 'GB', label: 'Royaume-Uni' },
              { value: 'DE', label: 'Allemagne' },
              { value: 'ES', label: 'Espagne' },
              { value: 'IT', label: 'Italie' },
              { value: 'PT', label: 'Portugal' },
              { value: 'NL', label: 'Pays-Bas' },
              { value: 'AT', label: 'Autriche' },
              { value: 'PL', label: 'Pologne' },
              { value: 'CZ', label: 'République tchèque' },
              { value: 'SE', label: 'Suède' },
              { value: 'NO', label: 'Norvège' },
              { value: 'DK', label: 'Danemark' },
              { value: 'FI', label: 'Finlande' },
              { value: 'IE', label: 'Irlande' },
              { value: 'GR', label: 'Grèce' },
              { value: 'RO', label: 'Roumanie' },
              { value: 'HU', label: 'Hongrie' },
              { value: 'BG', label: 'Bulgarie' },
              { value: 'HR', label: 'Croatie' },
              { value: 'SK', label: 'Slovaquie' },
              { value: 'SI', label: 'Slovénie' },
              { value: 'LT', label: 'Lituanie' },
              { value: 'LV', label: 'Lettonie' },
              { value: 'EE', label: 'Estonie' },
              { value: 'LU', label: 'Luxembourg' },
              { value: 'MT', label: 'Malte' },
              { value: 'CY', label: 'Chypre' },
              { value: 'MA', label: 'Maroc' },
              { value: 'TN', label: 'Tunisie' },
              { value: 'DZ', label: 'Algérie' },
              { value: 'SN', label: 'Sénégal' },
              { value: 'CI', label: 'Côte d\'Ivoire' },
              { value: 'CM', label: 'Cameroun' },
              { value: 'CD', label: 'RD Congo' },
              { value: 'MG', label: 'Madagascar' },
              { value: 'BF', label: 'Burkina Faso' },
              { value: 'ML', label: 'Mali' },
              { value: 'NE', label: 'Niger' },
              { value: 'TD', label: 'Tchad' },
              { value: 'GN', label: 'Guinée' },
              { value: 'RW', label: 'Rwanda' },
              { value: 'BJ', label: 'Bénin' },
              { value: 'TG', label: 'Togo' },
              { value: 'CF', label: 'République centrafricaine' },
              { value: 'CG', label: 'Congo' },
              { value: 'GA', label: 'Gabon' },
              { value: 'AO', label: 'Angola' },
              { value: 'MZ', label: 'Mozambique' },
              { value: 'ZM', label: 'Zambie' },
              { value: 'ZW', label: 'Zimbabwe' },
              { value: 'KE', label: 'Kenya' },
              { value: 'UG', label: 'Ouganda' },
              { value: 'TZ', label: 'Tanzanie' },
              { value: 'ET', label: 'Éthiopie' },
              { value: 'GH', label: 'Ghana' },
              { value: 'NG', label: 'Nigeria' },
              { value: 'ZA', label: 'Afrique du Sud' },
              { value: 'EG', label: 'Égypte' },
              { value: 'LY', label: 'Libye' },
              { value: 'SD', label: 'Soudan' },
              { value: 'SO', label: 'Somalie' },
              { value: 'DJ', label: 'Djibouti' },
              { value: 'ER', label: 'Érythrée' },
              { value: 'KM', label: 'Comores' },
              { value: 'MU', label: 'Maurice' },
              { value: 'SC', label: 'Seychelles' },
              { value: 'CN', label: 'Chine' },
              { value: 'JP', label: 'Japon' },
              { value: 'KR', label: 'Corée du Sud' },
              { value: 'IN', label: 'Inde' },
              { value: 'ID', label: 'Indonésie' },
              { value: 'TH', label: 'Thaïlande' },
              { value: 'VN', label: 'Vietnam' },
              { value: 'PH', label: 'Philippines' },
              { value: 'MY', label: 'Malaisie' },
              { value: 'SG', label: 'Singapour' },
              { value: 'HK', label: 'Hong Kong' },
              { value: 'TW', label: 'Taïwan' },
              { value: 'AU', label: 'Australie' },
              { value: 'NZ', label: 'Nouvelle-Zélande' },
              { value: 'BR', label: 'Brésil' },
              { value: 'AR', label: 'Argentine' },
              { value: 'MX', label: 'Mexique' },
              { value: 'CO', label: 'Colombie' },
              { value: 'CL', label: 'Chili' },
              { value: 'PE', label: 'Pérou' },
              { value: 'VE', label: 'Venezuela' },
              { value: 'EC', label: 'Équateur' },
              { value: 'BO', label: 'Bolivie' },
              { value: 'PY', label: 'Paraguay' },
              { value: 'UY', label: 'Uruguay' },
              { value: 'CR', label: 'Costa Rica' },
              { value: 'PA', label: 'Panama' },
              { value: 'GT', label: 'Guatemala' },
              { value: 'HN', label: 'Honduras' },
              { value: 'NI', label: 'Nicaragua' },
              { value: 'SV', label: 'Salvador' },
              { value: 'DO', label: 'République dominicaine' },
              { value: 'CU', label: 'Cuba' },
              { value: 'JM', label: 'Jamaïque' },
              { value: 'HT', label: 'Haïti' },
              { value: 'TR', label: 'Turquie' },
              { value: 'IL', label: 'Israël' },
              { value: 'SA', label: 'Arabie saoudite' },
              { value: 'AE', label: 'Émirats arabes unis' },
              { value: 'QA', label: 'Qatar' },
              { value: 'KW', label: 'Koweït' },
              { value: 'BH', label: 'Bahreïn' },
              { value: 'OM', label: 'Oman' },
              { value: 'JO', label: 'Jordanie' },
              { value: 'LB', label: 'Liban' },
              { value: 'SY', label: 'Syrie' },
              { value: 'IQ', label: 'Irak' },
              { value: 'IR', label: 'Iran' },
              { value: 'AF', label: 'Afghanistan' },
              { value: 'PK', label: 'Pakistan' },
              { value: 'BD', label: 'Bangladesh' },
              { value: 'LK', label: 'Sri Lanka' },
              { value: 'MM', label: 'Myanmar' },
              { value: 'KH', label: 'Cambodge' },
              { value: 'LA', label: 'Laos' },
              { value: 'MN', label: 'Mongolie' },
              { value: 'KZ', label: 'Kazakhstan' },
              { value: 'UZ', label: 'Ouzbékistan' },
              { value: 'TM', label: 'Turkménistan' },
              { value: 'TJ', label: 'Tadjikistan' },
              { value: 'KG', label: 'Kirghizistan' },
              { value: 'GE', label: 'Géorgie' },
              { value: 'AM', label: 'Arménie' },
              { value: 'AZ', label: 'Azerbaïdjan' },
              { value: 'BY', label: 'Biélorussie' },
              { value: 'UA', label: 'Ukraine' },
              { value: 'MD', label: 'Moldavie' },
              { value: 'RS', label: 'Serbie' },
              { value: 'BA', label: 'Bosnie-Herzégovine' },
              { value: 'ME', label: 'Monténégro' },
              { value: 'MK', label: 'Macédoine du Nord' },
              { value: 'AL', label: 'Albanie' },
              { value: 'XK', label: 'Kosovo' },
              { value: 'IS', label: 'Islande' },
              { value: 'LI', label: 'Liechtenstein' },
              { value: 'MC', label: 'Monaco' },
              { value: 'SM', label: 'Saint-Marin' },
              { value: 'VA', label: 'Vatican' },
              { value: 'AD', label: 'Andorre' },
              { value: 'OTHER', label: 'Autre' },
            ]}
            value={formData.nationalite || ''}
            onChange={(e) =>
              setFormData({ ...formData, nationalite: e.target.value || undefined })
            }
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={loading}
          >
            Continuer
          </Button>
        </form>
      </div>
    </div>
  )
}
