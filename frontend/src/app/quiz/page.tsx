'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/AuthGuard'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { api } from '@/services/api'
import { QuizQuestionForUser, QuizAnswer, QuizSubmission } from '@/types'
import { AdsContainer } from '@/components/AdsContainer'

const QUESTION_TIMER = 45 // seconds

interface ShuffledQuestion extends QuizQuestionForUser {
  shuffledOptions: string[]
  originalIndexMap: number[] // Maps shuffled index to original index
}

export default function QuizPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER)
  const [isQuizComplete, setIsQuizComplete] = useState(false)
  const [submission, setSubmission] = useState<QuizSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [eligibility, setEligibility] = useState<{ can_take_quiz: boolean; already_taken_today: boolean } | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [averageScore, setAverageScore] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Shuffle array function (Fisher-Yates algorithm)
  // Returns shuffled array and a map: shuffledIndex -> originalIndex
  const shuffleArray = <T,>(array: T[]): { shuffled: T[], originalIndexMap: number[] } => {
    const shuffled = [...array]
    const originalIndexMap: number[] = []
    
    // Create array of indices
    const indices = array.map((_, i) => i)
    
    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    
    // Build shuffled array and mapping
    for (let i = 0; i < indices.length; i++) {
      shuffled[i] = array[indices[i]]
      originalIndexMap[i] = indices[i] // shuffledIndex -> originalIndex
    }
    
    return { shuffled, originalIndexMap }
  }

  useEffect(() => {
    // Only check eligibility when authentication is ready
    if (!authLoading && isAuthenticated) {
      checkEligibility()
    }
  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length && !isQuizComplete) {
      startTimer()
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    }
  }, [currentQuestionIndex, questions.length, isQuizComplete])

  const checkEligibility = async () => {
    try {
      setLoading(true)
      const eligibilityData = await api.checkQuizEligibility()
      setEligibility(eligibilityData)
      
      if (eligibilityData.can_take_quiz) {
        // User can take quiz - load questions
        await loadQuestions()
      } else {
        // User already took quiz today - show results immediately
        if (eligibilityData.today_submission) {
          setSubmission(eligibilityData.today_submission)
          setIsQuizComplete(true)
          await Promise.all([loadLeaderboard(), loadAverageScore()])
        }
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking eligibility:', error)
      setLoading(false)
    }
  }

  const loadQuestions = async () => {
    try {
      setLoading(true)
      
      // Double check eligibility before loading questions
      const eligibilityCheck = await api.checkQuizEligibility()
      if (!eligibilityCheck.can_take_quiz) {
        // User already took quiz - don't load questions
        setEligibility(eligibilityCheck)
        if (eligibilityCheck.today_submission) {
          setSubmission(eligibilityCheck.today_submission)
          setIsQuizComplete(true)
          await Promise.all([loadLeaderboard(), loadAverageScore()])
        }
        setLoading(false)
        return
      }
      
      const activeQuestions = await api.getActiveQuizQuestions()
      
      // Shuffle options for each question
      const shuffledQuestions: ShuffledQuestion[] = activeQuestions.map((q) => {
        const { shuffled, originalIndexMap } = shuffleArray(q.options)
        return {
          ...q,
          shuffledOptions: shuffled,
          originalIndexMap: originalIndexMap,
        }
      })
      
      setQuestions(shuffledQuestions)
      setLoading(false)
    } catch (error) {
      console.error('Error loading questions:', error)
      setLoading(false)
    }
  }

  const startTimer = () => {
    setTimeLeft(QUESTION_TIMER)
    startTimeRef.current = Date.now()
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Time's up - record wrong answer
    const currentQuestion = questions[currentQuestionIndex]
    const timeTaken = QUESTION_TIMER
    
    setAnswers([
      ...answers,
      {
        question_id: currentQuestion.question_id,
        selected_index: -1, // -1 means no answer selected
        time_taken: timeTaken,
      },
    ])
    
    moveToNextQuestion()
  }

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index)
  }

  const handleNext = () => {
    if (selectedAnswer === null) return
    
    const currentQuestion = questions[currentQuestionIndex]
    const timeTaken = QUESTION_TIMER - timeLeft
    
    // Map the selected shuffled index back to the original index
    const originalIndex = currentQuestion.originalIndexMap[selectedAnswer]
    
    setAnswers([
      ...answers,
      {
        question_id: currentQuestion.question_id,
        selected_index: originalIndex,
        time_taken: timeTaken,
      },
    ])
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    moveToNextQuestion()
  }

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
    } else {
      submitQuiz()
    }
  }

  const submitQuiz = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      const submissionData = await api.submitQuiz(answers)
      setSubmission(submissionData)
      setIsQuizComplete(true)
      
      // Update eligibility state
      setEligibility({
        can_take_quiz: false,
        already_taken_today: true,
        today_submission: submissionData,
      })
      
      // Load leaderboard and average score
      await Promise.all([loadLeaderboard(), loadAverageScore()])
    } catch (error: any) {
      console.error('Error submitting quiz:', error)
      alert('Erreur lors de la soumission du quiz')
    }
  }

  const loadAverageScore = async () => {
    try {
      const stats = await api.getQuizStats()
      setAverageScore(Math.round(stats.average_score))
    } catch (error) {
      console.error('Error loading average score:', error)
    }
  }

  const loadLeaderboard = async () => {
    try {
      const leaderboardData = await api.getQuizLeaderboard()
      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    }
  }

  const maskUserName = (userId: string): string => {
    // Get user name from auth if available, otherwise use masked user_id
    // For RGPD: show first name initial + masked surname
    if (user && user.name) {
      const nameParts = user.name.split(' ')
      if (nameParts.length >= 2) {
        const firstName = nameParts[0]
        const surname = nameParts.slice(1).join(' ')
        return `${firstName.charAt(0).toUpperCase()}. ${maskSurname(surname)}`
      }
      return maskSurname(user.name)
    }
    return `U${userId.substring(0, 4)}...`
  }

  const maskSurname = (surname: string): string => {
    if (surname.length <= 2) return '*'.repeat(surname.length)
    return surname.charAt(0) + '*'.repeat(surname.length - 1)
  }

  const getComparisonMessage = (): { message: string; type: 'success' | 'warning' | 'info' } => {
    if (!submission) return { message: '', type: 'info' }
    
    const userScore = submission.score
    const diff = userScore - averageScore
    
    if (diff > 10) {
      return {
        message: 'Félicitations ! Vous êtes au-dessus de la moyenne. Excellent travail !',
        type: 'success',
      }
    } else if (diff >= -10 && diff <= 10) {
      return {
        message: "Vous êtes sur la bonne voie ! Continuez ainsi, vous êtes dans la moyenne.",
        type: 'info',
      }
    } else {
      return {
        message: "Ne vous découragez pas ! Revisitez les contenus et réessayez demain. Vous pouvez faire mieux !",
        type: 'warning',
      }
    }
  }

  const getCurrentUserPosition = (): number => {
    if (!submission) return 0
    return leaderboard.findIndex((entry) => entry.user_id === submission.user_id) + 1
  }

  if (loading) {
    return (
      <AuthGuard requireAuth={true} requireProfile={true}>
        <AdsContainer />
        <div className="flex min-h-screen items-center justify-center pt-16 lg:pt-0 lg:pl-64 lg:pr-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // Show results if quiz is complete OR if user already took quiz today
  if ((isQuizComplete && submission) || (eligibility && !eligibility.can_take_quiz && submission)) {
    const comparison = getComparisonMessage()
    const userPosition = getCurrentUserPosition()

    return (
      <AuthGuard requireAuth={true} requireProfile={true}>
        <AdsContainer />
        <div className="min-h-screen bg-gray-50 pt-16 lg:pt-0 lg:pl-64 lg:pr-64">
          <header className="bg-white border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <h1 className="text-xl font-semibold">Résultats du Quiz</h1>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Votre Score</h2>
              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {submission.score}%
                </div>
                <p className="text-gray-600">
                  {submission.correct_answers} / {submission.total_questions} bonnes réponses
                </p>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${
                comparison.type === 'success' ? 'bg-green-50 border border-green-200' :
                comparison.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`font-semibold ${
                  comparison.type === 'success' ? 'text-green-800' :
                  comparison.type === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {comparison.message}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Score moyen : {averageScore}%
                </p>
              </div>

              {userPosition > 0 && (
                <div className="mb-6">
                  <p className="text-lg font-semibold mb-2">Votre position : #{userPosition}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Détail des Réponses</h2>
              <div className="space-y-6">
                {submission.answers && Array.isArray(submission.answers) ? (
                  submission.answers.map((answer, index) => (
                  <div key={answer.question_id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">
                        Question {index + 1}: {answer.question}
                      </h3>
                      {answer.is_correct ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          ✓ Correct
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          ✗ Incorrect
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {answer.options && Array.isArray(answer.options) ? (
                        answer.options.map((option, optionIndex) => {
                          const isSelected = optionIndex === answer.selected_index
                          const isCorrect = optionIndex === answer.correct_index
                          
                          let bgColor = 'bg-gray-50'
                          let borderColor = 'border-gray-200'
                          let textColor = 'text-gray-900'
                          
                          if (isCorrect) {
                            bgColor = 'bg-green-50'
                            borderColor = 'border-green-500'
                            textColor = 'text-green-900'
                          } else if (isSelected && !isCorrect) {
                            bgColor = 'bg-red-50'
                            borderColor = 'border-red-500'
                            textColor = 'text-red-900'
                          }
                          
                          return (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg border-2 ${bgColor} ${borderColor} ${textColor}`}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrect && (
                                  <span className="text-green-600 font-bold">✓</span>
                                )}
                                {isSelected && !isCorrect && (
                                  <span className="text-red-600 font-bold">✗</span>
                                )}
                                <span className={isCorrect ? 'font-semibold' : ''}>
                                  {option}
                                </span>
                                {isCorrect && (
                                  <span className="ml-auto text-xs text-green-700 font-medium">
                                    (Bonne réponse)
                                  </span>
                                )}
                                {isSelected && !isCorrect && (
                                  <span className="ml-auto text-xs text-red-700 font-medium">
                                    (Votre réponse)
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-gray-500 text-sm">Options non disponibles</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Temps pris: {answer.time_taken}s
                    </p>
                  </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucun détail de réponse disponible</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Classement (Top 10)</h2>
              <div className="space-y-2">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => (
                    <div
                      key={`leaderboard-${entry.user_id}-${entry.position}`}
                      className={`flex items-center justify-between p-3 rounded ${
                        entry.user_id === submission.user_id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-600">#{entry.position}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.display_name}</span>
                          {entry.submitted_date && (
                            <span className="text-xs text-gray-500">{entry.submitted_date}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-blue-600">{entry.score}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Chargement du classement...</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => router.push('/')} className="flex-1">
                Retour à l'accueil
              </Button>
            </div>
          </main>
        </div>
      </AuthGuard>
    )
  }

  // Prevent access to quiz if user already took it today
  if (eligibility && !eligibility.can_take_quiz && !submission) {
    return (
      <AuthGuard requireAuth={true} requireProfile={true}>
        <AdsContainer />
        <div className="flex min-h-screen items-center justify-center pt-16 lg:pt-0 lg:pl-64 lg:pr-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Chargement de vos résultats...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // Only allow quiz access if user can take quiz - CRITICAL CHECK
  if (eligibility && !eligibility.can_take_quiz) {
    // Don't show quiz questions if user already took quiz today
    return null // Results screen will be shown above
  }

  // Additional safety check: don't show questions if eligibility hasn't been checked yet
  if (!eligibility && questions.length > 0) {
    return (
      <AuthGuard requireAuth={true} requireProfile={true}>
        <AdsContainer />
        <div className="flex min-h-screen items-center justify-center pt-16 lg:pt-0 lg:pl-64 lg:pr-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Vérification de votre éligibilité...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (questions.length === 0 && eligibility && eligibility.can_take_quiz) {
    return (
      <AuthGuard requireAuth={true} requireProfile={true}>
        <AdsContainer />
        <div className="flex min-h-screen items-center justify-center pt-16 lg:pt-0 lg:pl-64 lg:pr-64">
          <div className="text-center">
            <p className="text-gray-600">Aucune question disponible</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // Final check: Don't render quiz if user can't take it
  if (!eligibility || !eligibility.can_take_quiz) {
    return null
  }

  // FINAL CHECK: Don't render quiz if user can't take it
  if (!eligibility || !eligibility.can_take_quiz) {
    return null // Results screen should be shown above
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <AuthGuard requireAuth={true} requireProfile={true}>
      <AdsContainer />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-0 lg:pl-64 lg:pr-64">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <h1 className="text-xl font-semibold">Quiz</h1>
            </div>
            <div className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} / {questions.length}
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{currentQuestion.question}</h2>
              <div className={`text-2xl font-bold ${
                timeLeft <= 10 ? 'text-red-600' : 'text-blue-600'
              }`}>
                {timeLeft}s
              </div>
            </div>

            <div className="space-y-3">
              {currentQuestion.shuffledOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedAnswer === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleNext}
                disabled={selectedAnswer === null}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Suivant' : 'Terminer'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
