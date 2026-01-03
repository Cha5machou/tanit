'use client'

import { useState, useEffect, useRef } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'
import { API_V1_URL } from '@/lib/constants'
import { getIdToken } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { AdsContainer } from '@/components/AdsContainer'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Conversation {
  conversation_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export default function AIChatPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [isLoadingResponse, setIsLoadingResponse] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true) // Sidebar state - open by default on desktop, closed on mobile
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const wordDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load conversations only when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadConversations()
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamContent])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (wordDisplayTimeoutRef.current) {
        clearTimeout(wordDisplayTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Focus input when conversation changes
    inputRef.current?.focus()
  }, [conversationId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      setLoadingConversations(true)
      // Only load if authenticated
      if (!isAuthenticated) {
        console.log('Not authenticated, skipping conversation load')
        return
      }
      console.log('Loading conversations...')
      const convs = await api.listConversations()
      console.log('Conversations loaded from API:', convs.length, convs)
      const sortedConvs = convs.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setConversations(sortedConvs)
      console.log('Conversations set in state:', sortedConvs.length, sortedConvs)
    } catch (error) {
      console.error('Error loading conversations:', error)
      // Don't show error if it's just because user is not authenticated yet
      if (error instanceof Error && error.message.includes('No authentication token')) {
        console.log('User not authenticated yet, skipping conversation load')
      }
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadConversation = async (convId: string) => {
    try {
      setLoading(true)
      const conv = await api.getConversation(convId)
      setConversationId(convId)
      
      // Convert Firestore messages to Message format
      const formattedMessages: Message[] = conv.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
      }))
      
      setMessages(formattedMessages)
      
      // Close sidebar on mobile after selecting a conversation
      setSidebarOpen(false)
    } catch (error) {
      console.error('Error loading conversation:', error)
      alert('Erreur lors du chargement de la conversation')
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setQuestion('')
    inputRef.current?.focus()
  }

  const createConversation = async (title: string): Promise<string | null> => {
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      const response = await fetch(`${API_V1_URL}/ai/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }
      
      const data = await response.json()
      return data.conversation_id
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }

  const handleQuery = async () => {
    console.log('handleQuery called', { question: question.trim(), loading, streaming })
    
    if (!question.trim() || loading || streaming) {
      console.log('Early return:', { hasQuestion: !!question.trim(), loading, streaming })
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    }

    const currentQuestion = question.trim()
    console.log('Sending question:', currentQuestion)
    
    setMessages((prev) => [...prev, userMessage])
    setQuestion('')
    setStreaming(true)
    setStreamContent('')
    setIsLoadingResponse(true)

    try {
      console.log('Getting token...')
      const token = await getIdToken()
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      // Create conversation if it doesn't exist (first message)
      let currentConvId = conversationId
      if (!currentConvId) {
        console.log('Creating new conversation...')
        currentConvId = await createConversation(currentQuestion.substring(0, 50))
        if (currentConvId) {
          setConversationId(currentConvId)
          console.log('Conversation created:', currentConvId)
        }
      }
      
      console.log('Token obtained, making request to:', `${API_V1_URL}/ai/query`)
      
      const response = await fetch(`${API_V1_URL}/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: currentQuestion,
          conversation_id: currentConvId,
        }),
      })

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { detail: errorText || 'Erreur lors de la requête' }
        }
        throw new Error(error.detail || 'Erreur lors de la requête')
      }
      
      console.log('Response OK, parsing JSON...')
      const data = await response.json()
      
      // Update conversation_id if provided
      if (data.conversation_id) {
        if (!currentConvId || currentConvId !== data.conversation_id) {
          currentConvId = data.conversation_id
          setConversationId(currentConvId)
          console.log('Conversation ID set:', currentConvId)
        }
      }
      
      const fullAnswer = data.answer || ''
      console.log('Full answer received:', fullAnswer.substring(0, 100) + '...')
      
      setIsLoadingResponse(false) // Hide loading screen
      
      // Split answer into words for display
      const words = fullAnswer.match(/\S+|\s+/g) || []
      let displayedText = ''
      let wordIndex = 0
      
      // Function to display words one by one slowly
      const displayNextWord = () => {
        if (wordIndex >= words.length) {
          // All words displayed, finalize message
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: fullAnswer,
              timestamp: new Date().toISOString(),
            },
          ])
          setStreamContent('')
          setStreaming(false)
          
          // Reload conversations to update the list
          setTimeout(async () => {
            await loadConversations()
            scrollToBottom()
          }, 1000)
          return
        }
        
        const word = words[wordIndex]
        wordIndex++
        
        // Handle spaces properly
        if (word.match(/^\s+$/)) {
          // It's whitespace, add it directly
          displayedText += word
        } else {
          // It's a word, add space before if needed
          displayedText += (displayedText && !displayedText.endsWith(' ') && !displayedText.endsWith('\n') ? ' ' : '') + word
        }
        
        setStreamContent(displayedText)
        
        // Continue displaying next word with delay
        wordDisplayTimeoutRef.current = setTimeout(displayNextWord, 25) // 25ms delay between words
      }
      
      // Start displaying words
      setStreaming(true)
      displayNextWord()
    } catch (error: any) {
      console.error('Error:', error)
      alert(`Erreur: ${error.message || 'Une erreur est survenue'}`)
      setStreaming(false)
      setStreamContent('')
      setIsLoadingResponse(false)
      // Clear timeout if exists
      if (wordDisplayTimeoutRef.current) {
        clearTimeout(wordDisplayTimeoutRef.current)
        wordDisplayTimeoutRef.current = null
      }
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days} jours`
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <AuthGuard requireAuth={true} requireProfile={true}>
      {/* Ads - Desktop sidebars and Mobile banner */}
      <AdsContainer />
      
      <div className="min-h-screen bg-gray-50 flex relative pt-16 lg:pt-0">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Responsive with toggle */}
        <aside
          className={`
            fixed left-0 z-50
            top-16 lg:top-0 lg:inset-y-0
            h-[calc(100vh-4rem)] lg:h-screen
            w-64 bg-white border-r border-gray-200 flex flex-col
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            shadow-lg lg:shadow-none
          `}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              {/* Close button - visible on all screens */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
                aria-label="Fermer la sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-b border-gray-200">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                startNewConversation()
                setSidebarOpen(false) // Close sidebar on mobile
              }}
            >
              💬 Nouveau Chat
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Chargement...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucune conversation
                <br />
                <span className="text-xs">Commencez une nouvelle conversation</span>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    className={`p-3 rounded-lg cursor-pointer mb-1 transition-colors ${
                      conversationId === conv.conversation_id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => loadConversation(conv.conversation_id)}
                  >
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {conv.title || 'Sans titre'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                      <span>{conv.message_count} message{conv.message_count > 1 ? 's' : ''}</span>
                      <span>{formatDate(conv.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              ← Retour
            </Button>
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col w-full lg:w-auto lg:ml-64 lg:mr-64">
          {/* Chat Header - Sticky */}
          <header className="sticky top-16 lg:top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 lg:ml-64 lg:mr-64">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Menu button - visible on all screens */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={sidebarOpen ? "Fermer la sidebar" : "Ouvrir la sidebar"}
                >
                  {sidebarOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                <Logo size="md" className="mr-2" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">Assistant IA</h1>
                  {conversationId && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-none">
                      {conversations.find(c => c.conversation_id === conversationId)?.title || 'Conversation'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 && !streaming && !isLoadingResponse && (
              <div className="text-center text-gray-500 mt-20 max-w-md mx-auto">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-lg font-medium mb-2">Bienvenue dans l'assistant IA</p>
                <p className="text-sm">Posez une question pour commencer une conversation</p>
              </div>
            )}

            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator where message will appear */}
              {isLoadingResponse && !streamContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-gray-900 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
                      <p className="text-gray-500 text-sm">Génération de la réponse...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming message */}
              {(streaming || streamContent) && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-gray-900 shadow-sm border border-gray-200">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{streamContent || ''}</p>
                    {streaming && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value)
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleQuery()
                    }
                  }}
                  placeholder="Posez votre question..."
                  rows={1}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={loading || streaming || isLoadingResponse}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Button clicked', { question, loading, streaming, isLoadingResponse })
                    handleQuery()
                  }}
                  disabled={loading || streaming || isLoadingResponse || !question.trim()}
                  className="px-6"
                  type="button"
                >
                  {(streaming || isLoadingResponse) ? '...' : 'Envoyer'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Appuyez sur Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
