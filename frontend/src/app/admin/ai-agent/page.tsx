'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'

export default function AIAgentPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({
    embedding_provider: 'openai',
    llm_provider: 'openai',
    embedding_model: '',
    llm_model: '',
    system_prompt: '',
    chunk_size: 1000,
    chunk_overlap: 200,
  })

  useEffect(() => {
    loadFiles()
    loadConfig()
  }, [])

  const loadFiles = async () => {
    try {
      const fileList = await api.listFiles()
      setFiles(fileList)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const agentConfig = await api.getAgentConfig()
      setConfig(agentConfig)
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt')) {
      alert('Seuls les fichiers .txt sont autorisés')
      return
    }

    setUploading(true)
    try {
      await api.uploadFile(file)
      await loadFiles()
      alert('Fichier uploadé avec succès')
    } catch (error: any) {
      alert(`Erreur lors de l'upload: ${error.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleFileDelete = async (filename: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${filename}?`)) return

    try {
      await api.deleteFile(filename)
      await loadFiles()
      if (selectedFile === filename) {
        setSelectedFile(null)
        setFileContent('')
      }
    } catch (error: any) {
      alert(`Erreur lors de la suppression: ${error.message}`)
    }
  }

  const handleFileView = async (filename: string) => {
    try {
      const file = await api.getFile(filename)
      setSelectedFile(filename)
      setFileContent(file.content)
    } catch (error: any) {
      alert(`Erreur lors du chargement: ${error.message}`)
    }
  }

  const handleFileReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedFile) return

    setUploading(true)
    try {
      await api.replaceFile(selectedFile, file)
      await loadFiles()
      await handleFileView(selectedFile)
      alert('Fichier remplacé avec succès')
    } catch (error: any) {
      alert(`Erreur lors du remplacement: ${error.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleConfigSave = async () => {
    try {
      await api.setAgentConfig(config)
      alert('Configuration sauvegardée avec succès')
    } catch (error: any) {
      alert(`Erreur lors de la sauvegarde: ${error.message}`)
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
                    Agent IA
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Gérer les documents et la configuration de l'agent IA
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => router.push('/admin')}>
                Retour
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* File Management */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold mb-4">Gestion des fichiers</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Télécharger un fichier .txt
                </label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="mt-6">
                <h3 className="text-md font-semibold mb-3">Fichiers téléchargés</h3>
                {loading ? (
                  <p className="text-gray-500">Chargement...</p>
                ) : files.length === 0 ? (
                  <p className="text-gray-500">Aucun fichier téléchargé</p>
                ) : (
                  <ul className="space-y-2">
                    {files.map((file) => (
                      <li key={file.filename} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{file.original_filename || file.filename}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                          {file.original_filename && file.original_filename !== file.filename && (
                            <span className="text-xs text-gray-400 ml-2">
                              ({file.filename})
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileView(file.filename)}
                          >
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileDelete(file.filename)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedFile && (
                <div className="mt-6">
                  <h3 className="text-md font-semibold mb-3">Contenu: {selectedFile}</h3>
                  <div className="mb-3">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileReplace}
                      disabled={uploading}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Remplacer ce fichier</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 rounded border">
                    <pre className="text-sm whitespace-pre-wrap">{fileContent}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Agent Configuration */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold mb-4">Configuration de l'agent IA</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider d'embedding
                  </label>
                  <select
                    value={config.embedding_provider}
                    onChange={(e) => setConfig({ ...config, embedding_provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider LLM
                  </label>
                  <select
                    value={config.llm_provider}
                    onChange={(e) => setConfig({ ...config, llm_provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="gemini">Gemini (Gemini Flash 2.5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle d'embedding (optionnel)
                  </label>
                  <input
                    type="text"
                    value={config.embedding_model || ''}
                    onChange={(e) => setConfig({ ...config, embedding_model: e.target.value })}
                    placeholder="Laisser vide pour utiliser le modèle par défaut"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle LLM (optionnel)
                  </label>
                  <input
                    type="text"
                    value={config.llm_model || ''}
                    onChange={(e) => setConfig({ ...config, llm_model: e.target.value })}
                    placeholder="Laisser vide pour utiliser le modèle par défaut"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt système
                  </label>
                  <textarea
                    value={config.system_prompt || ''}
                    onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                    placeholder="Définissez le comportement et le rôle de l'agent IA. Ce prompt sera utilisé pour toutes les conversations."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ce prompt définit le comportement de l'agent IA. Il sera utilisé comme prompt système pour toutes les conversations.
                    <br />
                    💡 Voir <code className="text-xs bg-gray-100 px-1 rounded">docs/SYSTEM_PROMPT_EXAMPLE.md</code> pour un exemple complet.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taille des chunks (chunk_size)
                  </label>
                  <input
                    type="number"
                    value={config.chunk_size || 1000}
                    onChange={(e) => setConfig({ ...config, chunk_size: parseInt(e.target.value) || 1000 })}
                    min="100"
                    max="10000"
                    step="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Taille maximale des chunks de texte lors du découpage des documents (100-10000).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chevauchement des chunks (chunk_overlap)
                  </label>
                  <input
                    type="number"
                    value={config.chunk_overlap || 200}
                    onChange={(e) => setConfig({ ...config, chunk_overlap: parseInt(e.target.value) || 200 })}
                    min="0"
                    max="1000"
                    step="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nombre de caractères qui se chevauchent entre les chunks consécutifs (0-1000).
                  </p>
                </div>

                <Button onClick={handleConfigSave} className="w-full">
                  Sauvegarder la configuration
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}

