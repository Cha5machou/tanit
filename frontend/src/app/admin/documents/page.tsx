'use client'

import { useState } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function DocumentsPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // TODO: Implement document upload to Cloud Storage
      // Then process and chunk for AI context
      console.log('Uploading:', file.name)
      // await api.uploadDocument(file)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
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
                  Documents pour l'IA
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Téléchargez des documents pour enrichir le contexte de l'assistant IA
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/admin')}>
                Retour
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Télécharger un document (PDF, TXT, DOCX)
              </label>
              <input
                type="file"
                accept=".pdf,.txt,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Documents téléchargés</h2>
              {documents.length === 0 ? (
                <p className="text-gray-500">Aucun document téléchargé</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>{doc.name}</span>
                      <Button variant="outline" size="sm">Supprimer</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}

