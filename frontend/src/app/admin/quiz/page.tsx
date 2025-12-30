'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/RoleGuard'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'

interface Quiz {
  id: string
  question: string
  answers: string[]
  correct_answer: number
}

export default function QuizPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    question: '',
    answers: ['', '', '', ''],
    correct_answer: 0,
  })

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      // TODO: Implement API call
      // const data = await api.getQuizzes()
      // setQuizzes(data)
    } catch (error) {
      console.error('Error loading quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // TODO: Implement API call
      // await api.createQuiz(formData)
      setShowForm(false)
      loadQuizzes()
    } catch (error) {
      console.error('Error creating quiz:', error)
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
                    Quiz
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Gérez les questions et réponses des quiz
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                  {showForm ? 'Annuler' : 'Ajouter une question'}
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
              <h2 className="text-lg font-semibold mb-4">Nouvelle question</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                />
                {formData.answers.map((answer, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      label={`Réponse ${index + 1}`}
                      value={answer}
                      onChange={(e) => {
                        const newAnswers = [...formData.answers]
                        newAnswers[index] = e.target.value
                        setFormData({ ...formData, answers: newAnswers })
                      }}
                      required
                    />
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={formData.correct_answer === index}
                      onChange={() => setFormData({ ...formData, correct_answer: index })}
                      className="mt-6"
                    />
                    <label className="mt-6 text-sm">Correcte</label>
                  </div>
                ))}
                <Button type="submit" variant="primary">Créer</Button>
              </form>
            </div>
          )}

          <div className="rounded-lg bg-white shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Liste des questions</h2>
              {loading ? (
                <p className="text-gray-500">Chargement...</p>
              ) : quizzes.length === 0 ? (
                <p className="text-gray-500">Aucune question</p>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{quiz.question}</h3>
                      <ul className="space-y-1">
                        {quiz.answers.map((answer, index) => (
                          <li key={index} className={`text-sm ${index === quiz.correct_answer ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                            {index + 1}. {answer} {index === quiz.correct_answer && '✓'}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">Modifier</Button>
                        <Button variant="outline" size="sm">Supprimer</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}

