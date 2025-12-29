'use client'

import { useState, useEffect, useRef } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'
import { API_V1_URL } from '@/lib/constants'
import { getIdToken } from '@/services/auth'

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
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamContent])

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
      const convs = await api.listConversations()
      setConversations(convs.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ))
    } catch (error) {
      console.error('Error loading conversations:', error)
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

  const handleQuery = async () => {
    if (!question.trim() || loading || streaming) return

    const userMessage: Message = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    }

    const currentQuestion = question.trim()
    setMessages((prev) => [...prev, userMessage])
    setQuestion('')
    setStreaming(true)
    setStreamContent('')

    try {
      const token = await getIdToken()
      
      const response = await fetch(`${API_V1_URL}/ai/query/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: currentQuestion,
          conversation_id: conversationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erreur lors de la requête')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let currentConvId = conversationId
      let fullAnswer = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                throw new Error(data.error)
              }
              
              if (data.conversation_id && !currentConvId) {
                currentConvId = data.conversation_id
                setConversationId(currentConvId)
              }
              
              if (data.chunk) {
                fullAnswer += data.chunk
                setStreamContent(fullAnswer)
              }
              
              if (data.done) {
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
                await loadConversations()
              }
            } catch (e) {
              console.error('Error parsing stream data:', e)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error:', error)
      alert(`Erreur: ${error.message || 'Une erreur est survenue'}`)
      setStreaming(false)
      setStreamContent('')
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
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar - Always visible */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={startNewConversation}
                className="text-xs"
              >
                + Nouvelle
              </Button>
            </div>
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
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Assistant IA</h1>
                {conversationId && (
                  <p className="text-sm text-gray-500 mt-1">
                    {conversations.find(c => c.conversation_id === conversationId)?.title || 'Conversation'}
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 && !streaming && (
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

              {streaming && streamContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-gray-900 shadow-sm border border-gray-200">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{streamContent}</p>
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
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
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleQuery()
                    }
                  }}
                  placeholder="Posez votre question..."
                  rows={1}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={loading || streaming}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <Button
                  onClick={handleQuery}
                  disabled={loading || streaming || !question.trim()}
                  className="px-6"
                >
                  {streaming ? '...' : 'Envoyer'}
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
