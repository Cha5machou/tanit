'use client'

import { useState, useEffect, useRef } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { api } from '@/services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function AIChatPage() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [showConversations, setShowConversations] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamContent])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations()
      setConversations(convs)
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadConversation = async (convId: string) => {
    try {
      const conv = await api.getConversation(convId)
      setConversationId(convId)
      setMessages(conv.messages)
      setShowConversations(false)
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setShowConversations(false)
  }

  const handleQuery = async (useStream: boolean = false) => {
    if (!question.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuestion('')
    setLoading(!useStream)
    setStreaming(useStream)
    setStreamContent('')

    try {
      if (useStream) {
        // Streaming query
        const { API_V1_URL } = await import('@/lib/constants')
        const response = await fetch(`${API_V1_URL}/ai/query/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await (await import('@/services/auth')).getIdToken()}`,
          },
          body: JSON.stringify({
            question: userMessage.content,
            conversation_id: conversationId,
          }),
        })

        if (!response.ok) throw new Error('Streaming failed')

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        let currentConvId = conversationId

        while (true) {
          const { done, value } = await reader!.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.conversation_id) {
                  currentConvId = data.conversation_id
                  setConversationId(currentConvId)
                }
                if (data.chunk) {
                  setStreamContent((prev) => prev + data.chunk)
                }
                if (data.done) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: streamContent + (data.chunk || ''),
                      timestamp: new Date().toISOString(),
                    },
                  ])
                  setStreamContent('')
                  setStreaming(false)
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } else {
        // Regular query
        const response = await api.queryAgent(userMessage.content, conversationId || undefined)
        setConversationId(response.conversation_id)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.answer,
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setLoading(false)
      setStreaming(false)
      await loadConversations()
    }
  }

  return (
    <AuthGuard requireAuth={true} requireProfile={true}>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Assistant IA</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowConversations(!showConversations)}>
                  Historique
                </Button>
                <Button variant="outline" onClick={startNewConversation}>
                  Nouvelle conversation
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                  Retour
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          {showConversations && (
            <div className="w-64 bg-white border-r shadow-sm p-4 overflow-y-auto">
              <h2 className="font-semibold mb-4">Conversations</h2>
              <Button variant="outline" size="sm" className="w-full mb-4" onClick={startNewConversation}>
                Nouvelle conversation
              </Button>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    className={`p-3 rounded cursor-pointer hover:bg-gray-50 ${
                      conversationId === conv.conversation_id ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    onClick={() => loadConversation(conv.conversation_id)}
                  >
                    <div className="font-medium text-sm">{conv.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {conv.message_count} messages
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {messages.length === 0 && !streaming && (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-lg mb-2">Bienvenue dans l'assistant IA</p>
                  <p>Posez une question pour commencer</p>
                </div>
              )}

              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-900 shadow'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {streaming && streamContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-white text-gray-900 shadow">
                      <p>{streamContent}</p>
                      <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-white text-gray-900 shadow">
                      <p>Réflexion en cours...</p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-white border-t p-4">
              <div className="max-w-3xl mx-auto flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleQuery(false)
                    }
                  }}
                  placeholder="Posez votre question..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || streaming}
                />
                <Button onClick={() => handleQuery(false)} disabled={loading || streaming}>
                  Envoyer
                </Button>
                <Button variant="outline" onClick={() => handleQuery(true)} disabled={loading || streaming}>
                  Stream
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

