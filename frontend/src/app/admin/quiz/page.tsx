'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'
import { QuizQuestion, QuizQuestionCreate } from '@/types'

export default function QuizAdminPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    correct_answer_index: 0,
    tags: [] as string[],
    is_active: true,
    newTag: '',
  })

  useEffect(() => {
    // Only load questions when authenticated
    if (!authLoading && isAuthenticated) {
      loadQuestions()
    }
  }, [authLoading, isAuthenticated])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const allQuestions = await api.listQuizQuestions()
      setQuestions(allQuestions)
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Ensure tags is always an array
      const tagsToSave = Array.isArray(formData.tags) ? formData.tags : []
      
      if (editingQuestion) {
        await api.updateQuizQuestion(editingQuestion.question_id, {
          question: formData.question,
          options: formData.options,
          correct_answer_index: formData.correct_answer_index,
          tags: tagsToSave,
          is_active: formData.is_active,
        })
      } else {
        await api.createQuizQuestion({
          question: formData.question,
          options: formData.options,
          correct_answer_index: formData.correct_answer_index,
          tags: tagsToSave,
          is_active: formData.is_active,
        })
      }
      await loadQuestions()
      resetForm()
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const handleEdit = (question: QuizQuestion) => {
    setEditingQuestion(question)
    setFormData({
      question: question.question,
      options: [...question.options],
      correct_answer_index: question.correct_answer_index,
      tags: Array.isArray(question.tags) ? [...question.tags] : [],
      is_active: question.is_active,
      newTag: '',
    })
    setShowForm(true)
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
      return
    }
    try {
      await api.deleteQuizQuestion(questionId)
      await loadQuestions()
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setEditingQuestion(null)
    setShowForm(false)
    setFormData({
      question: '',
      options: ['', ''],
      correct_answer_index: 0,
      tags: [],
      is_active: true,
      newTag: '',
    })
  }

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData({ ...formData, options: [...formData.options, ''] })
    }
  }

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index)
      const newCorrectIndex = formData.correct_answer_index >= newOptions.length 
        ? newOptions.length - 1 
        : formData.correct_answer_index
      setFormData({ ...formData, options: newOptions, correct_answer_index: newCorrectIndex })
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const addTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.newTag.trim()],
        newTag: '',
      })
    }
  }

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    })
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <h1 className="text-2xl font-bold">Gestion des Quiz</h1>
            </div>
            <Button onClick={() => router.push('/admin')}>Retour</Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Questions de Quiz</h2>
            <Button onClick={() => setShowForm(true)}>+ Nouvelle Question</Button>
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingQuestion ? 'Modifier la question' : 'Nouvelle question'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Question</label>
                  <textarea
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Options de réponse</label>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, correct_answer_index: index })}
                        className={`px-4 py-2 rounded-lg ${
                          formData.correct_answer_index === index
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200'
                        }`}
                      >
                        Correcte
                      </button>
                      {formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.options.length < 6 && (
                    <Button type="button" onClick={addOption} variant="outline">
                      + Ajouter une option
                    </Button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={formData.newTag}
                      onChange={(e) => setFormData({ ...formData, newTag: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="Ajouter un tag"
                    />
                    <Button type="button" onClick={addTag}>Ajouter</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Question active
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingQuestion ? 'Modifier' : 'Créer'}
                  </Button>
                  <Button type="button" onClick={resetForm} variant="outline">
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Question</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {questions.map((question) => (
                      <tr key={question.question_id}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 break-words max-w-xs">{question.question}</div>
                        </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {question.options.map((opt, idx) => (
                            <div key={idx} className={idx === question.correct_answer_index ? 'font-bold text-green-600' : ''}>
                              {idx + 1}. {opt} {idx === question.correct_answer_index && '✓'}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(question.tags) && question.tags.length > 0 ? (
                            question.tags.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">Aucun tag</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          question.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {question.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(question)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(question.question_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
              {questions.length === 0 && (
                <div className="text-center py-8 text-gray-500">Aucune question</div>
              )}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  )
}
