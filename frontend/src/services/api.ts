import { API_V1_URL } from '@/lib/constants'
import { getIdToken } from './auth'
import { User, Profile, ProfileCreate } from '@/types'

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getIdToken()
  
  if (!token) {
    console.error('No authentication token available')
    throw new ApiError(
      401,
      'Unauthorized',
      'No authentication token available'
    )
  }
  
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  
  const response = await fetch(url, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    console.error(`API Error ${response.status}: ${errorText}`)
    throw new ApiError(
      response.status,
      response.statusText,
      `API Error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }
  
  return response
}

export const api = {
  // Auth endpoints
  async getCurrentUser(): Promise<User> {
    const response = await fetchWithAuth(`${API_V1_URL}/auth/me`)
    return response.json()
  },
  
  async createProfile(profile: ProfileCreate): Promise<Profile> {
    const response = await fetchWithAuth(`${API_V1_URL}/auth/onboarding`, {
      method: 'POST',
      body: JSON.stringify(profile),
    })
    return response.json()
  },
  
  async getProfile(): Promise<Profile> {
    const response = await fetchWithAuth(`${API_V1_URL}/auth/profile`)
    return response.json()
  },

  // Admin endpoints
  async listUsers(): Promise<User[]> {
    const response = await fetchWithAuth(`${API_V1_URL}/auth/users`)
    return response.json()
  },

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User> {
    const response = await fetchWithAuth(`${API_V1_URL}/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
    return response.json()
  },

  // AI Agent endpoints
  async uploadFile(file: File): Promise<any> {
    const token = await getIdToken()
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_V1_URL}/ai/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Failed to upload file')
    }
    
    return response.json()
  },

  async listFiles(): Promise<any[]> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai/files`)
    return response.json()
  },

  async getFile(filename: string): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai/files/${filename}`)
    return response.json()
  },

  async deleteFile(filename: string): Promise<void> {
    await fetchWithAuth(`${API_V1_URL}/ai/files/${filename}`, {
      method: 'DELETE',
    })
  },

  async replaceFile(filename: string, file: File): Promise<any> {
    const token = await getIdToken()
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_V1_URL}/ai/files/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Failed to replace file')
    }
    
    return response.json()
  },

  async getAgentConfig(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai/config`)
    return response.json()
  },

  async setAgentConfig(config: { embedding_provider: string; llm_provider: string; embedding_model?: string; llm_model?: string; system_prompt?: string; chunk_size?: number; chunk_overlap?: number }): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai/config`, {
      method: 'POST',
      body: JSON.stringify(config),
    })
    return response.json()
  },

  async queryAgent(question: string, conversationId?: string): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai/query`, {
      method: 'POST',
      body: JSON.stringify({ question, conversation_id: conversationId }),
    })
    return response.json()
  },

  async listConversations(): Promise<any[]> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai/conversations`)
    return response.json()
  },

  async getConversation(conversationId: string): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai/conversations/${conversationId}`)
    return response.json()
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await fetchWithAuth(`${API_V1_URL}/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    })
  },

  // Monitoring endpoints
  async getUserStats(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/monitoring/stats/users`)
    return response.json()
  },

  async getConnectionStats(period: 'hour' | 'day' | 'week'): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/monitoring/stats/connections?period=${period}`)
    return response.json()
  },

  async getSessionStats(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/monitoring/stats/sessions`)
    return response.json()
  },

  async getConversationStats(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/monitoring/stats/conversations`)
    return response.json()
  },


  // Analytics event tracking
  async logAnalyticsEvent(eventType: 'page_view' | 'session_start' | 'session_end' | 'login', metadata?: Record<string, any>): Promise<void> {
    try {
      const token = await getIdToken()
      if (!token) {
        // Silently fail if no token (user not authenticated)
        return
      }
      
      await fetchWithAuth(`${API_V1_URL}/auth/analytics-event`, {
        method: 'POST',
        body: JSON.stringify({
          event_type: eventType,
          metadata: metadata || {},
        }),
      })
    } catch (error) {
      // Silently fail - don't break the app if tracking fails
      console.warn('Failed to log analytics event:', error)
    }
  },

  // Page visit tracking endpoints
  async logPageVisit(pagePath: string, startTime: Date, metadata?: Record<string, any>): Promise<string | null> {
    try {
      const token = await getIdToken()
      if (!token) {
        // Silently fail if no token (user not authenticated)
        return null
      }
      
      // Ensure device_type and previous_page are included in metadata
      const fullMetadata = {
        device_type: metadata?.device_type || 'unknown',
        previous_page: metadata?.previous_page || null,
        ...metadata,
      }
      
      const response = await fetchWithAuth(`${API_V1_URL}/auth/page-visit`, {
        method: 'POST',
        body: JSON.stringify({
          page_path: pagePath,
          start_time: startTime.toISOString(),
          metadata: fullMetadata,
        }),
      })
      
      const data = await response.json()
      return data.visit_id || null
    } catch (error) {
      // Silently fail - don't break the app if tracking fails
      console.warn('Failed to log page visit:', error)
      return null
    }
  },

  async endPageVisit(visitId: string, endTime: Date): Promise<any> {
    try {
      const token = await getIdToken()
      if (!token) {
        // Silently fail if no token (user not authenticated)
        console.warn('[API] No token available for endPageVisit')
        return null
      }
      
      console.log(`[API] Ending page visit ${visitId} at ${endTime.toISOString()}`)
      const response = await fetchWithAuth(`${API_V1_URL}/auth/page-visit/end`, {
        method: 'POST',
        body: JSON.stringify({
          visit_id: visitId,
          end_time: endTime.toISOString(),
        }),
      })
      
      const data = await response.json()
      console.log(`[API] Successfully ended page visit ${visitId}:`, data)
      return data
    } catch (error) {
      // Don't silently fail - log the error for debugging
      console.error('[API] Failed to end page visit:', error)
      throw error
    }
  },

  // Analytics Dashboard endpoints
  async getAnalyticsOverview(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/analytics/overview`)
    return response.json()
  },

  async getTrafficAnalytics(period: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/analytics/traffic?period=${period}`)
    return response.json()
  },

  async getEngagementAnalytics(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/analytics/engagement`)
    return response.json()
  },

  async getAcquisitionAnalytics(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/analytics/acquisition`)
    return response.json()
  },

  // AI Analytics Dashboard endpoints
  async getAIConversationsAnalytics(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai-analytics/conversations`)
    return response.json()
  },

  async getAIPerformanceAnalytics(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai-analytics/performance`)
    return response.json()
  },

  async getAITracesAnalytics(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ai-analytics/traces`)
    return response.json()
  },

  // Close inactive visits
  async closeInactiveVisits(inactivityMinutes: number = 30): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/monitoring/close-inactive-visits?inactivity_minutes=${inactivityMinutes}`, {
      method: 'POST',
    })
    return response.json()
  },

  // POI endpoints
  async createPOI(data: {
    name: string
    lat: number
    lng: number
    description: string
    is_ad: boolean
    photo?: File
    audio?: File
  }): Promise<any> {
    const token = await getIdToken()
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('lat', data.lat.toString())
    formData.append('lng', data.lng.toString())
    formData.append('description', data.description)
    formData.append('is_ad', data.is_ad.toString())
    if (data.photo) {
      formData.append('photo', data.photo)
    }
    if (data.audio) {
      formData.append('audio', data.audio)
    }
    
    const response = await fetch(`${API_V1_URL}/poi`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Failed to create POI')
    }
    
    return response.json()
  },

  async listPOIs(): Promise<any[]> {
    const response = await fetchWithAuth(`${API_V1_URL}/poi`)
    return response.json()
  },

  async getPOI(poiId: string): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/poi/${poiId}`)
    return response.json()
  },

  async updatePOI(poiId: string, data: {
    name?: string
    lat?: number
    lng?: number
    description?: string
    is_ad?: boolean
    photo?: File
    audio?: File
  }): Promise<any> {
    const token = await getIdToken()
    const formData = new FormData()
    if (data.name !== undefined) formData.append('name', data.name)
    if (data.lat !== undefined) formData.append('lat', data.lat.toString())
    if (data.lng !== undefined) formData.append('lng', data.lng.toString())
    if (data.description !== undefined) formData.append('description', data.description)
    if (data.is_ad !== undefined) formData.append('is_ad', data.is_ad.toString())
    if (data.photo) {
      formData.append('photo', data.photo)
    }
    if (data.audio) {
      formData.append('audio', data.audio)
    }
    
    const response = await fetch(`${API_V1_URL}/poi/${poiId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Failed to update POI')
    }
    
    return response.json()
  },

  async deletePOI(poiId: string): Promise<void> {
    await fetchWithAuth(`${API_V1_URL}/poi/${poiId}`, {
      method: 'DELETE',
    })
  },

  // Ads endpoints (public - no auth required)
  async listAds(position?: 'left' | 'right', activeOnly?: boolean): Promise<any[]> {
    const params = new URLSearchParams()
    if (position) params.append('position', position)
    if (activeOnly) params.append('active_only', 'true')
    
    const url = `${API_V1_URL}/ads${params.toString() ? `?${params.toString()}` : ''}`
    // Public endpoint - use regular fetch instead of fetchWithAuth
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new ApiError(
        response.status,
        response.statusText,
        `API Error: ${response.status} ${response.statusText} - ${errorText}`
      )
    }
    
    return response.json()
  },

  async getAd(adId: string): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/ads/${adId}`)
    return response.json()
  },

  async createAd(data: {
    name: string
    description: string
    link: string
    position: 'left' | 'right'
    slot: number
    active: boolean
    logo?: File
  }): Promise<any> {
    const token = await getIdToken()
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('description', data.description)
    formData.append('link', data.link)
    formData.append('position', data.position)
    formData.append('slot', data.slot.toString())
    formData.append('active', data.active.toString())
    
    if (data.logo) {
      formData.append('logo', data.logo)
    }
    
    const response = await fetch(`${API_V1_URL}/ads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Failed to create ad')
    }
    
    return response.json()
  },

  async updateAd(adId: string, data: {
    name?: string
    description?: string
    link?: string
    position?: 'left' | 'right'
    slot?: number
    active?: boolean
    logo?: File
  }): Promise<any> {
    const token = await getIdToken()
    const formData = new FormData()
    
    if (data.name !== undefined) formData.append('name', data.name)
    if (data.description !== undefined) formData.append('description', data.description)
    if (data.link !== undefined) formData.append('link', data.link)
    if (data.position !== undefined) formData.append('position', data.position)
    if (data.slot !== undefined) formData.append('slot', data.slot.toString())
    if (data.active !== undefined) formData.append('active', data.active.toString())
    
    if (data.logo) {
      formData.append('logo', data.logo)
    }
    
    const response = await fetch(`${API_V1_URL}/ads/${adId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Failed to update ad')
    }
    
    return response.json()
  },

  async deleteAd(adId: string): Promise<void> {
    await fetchWithAuth(`${API_V1_URL}/ads/${adId}`, {
      method: 'DELETE',
    })
  },

  // Quiz endpoints
  async createQuizQuestion(data: {
    question: string
    options: string[]
    correct_answer_index: number
    tags: string[]
    is_active: boolean
  }): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async listQuizQuestions(activeOnly: boolean = false): Promise<any[]> {
    const params = activeOnly ? '?active_only=true' : ''
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/questions${params}`)
    return response.json()
  },

  async getActiveQuizQuestions(): Promise<any[]> {
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/questions/active`)
    return response.json()
  },

  async getQuizQuestion(questionId: string): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/questions/${questionId}`)
    return response.json()
  },

  async updateQuizQuestion(questionId: string, data: {
    question?: string
    options?: string[]
    correct_answer_index?: number
    tags?: string[]
    is_active?: boolean
  }): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async deleteQuizQuestion(questionId: string): Promise<void> {
    await fetchWithAuth(`${API_V1_URL}/quiz/questions/${questionId}`, {
      method: 'DELETE',
    })
  },

  async checkQuizEligibility(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/check-eligibility`)
    return response.json()
  },

  async submitQuiz(answers: Array<{
    question_id: string
    selected_index: number
    time_taken: number
  }>): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    })
    return response.json()
  },

  async listQuizSubmissions(userId?: string): Promise<any[]> {
    const params = userId ? `?user_id=${userId}` : ''
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/submissions${params}`)
    return response.json()
  },

  async getQuizStatistics(): Promise<any> {
    const response = await fetchWithAuth(`${API_V1_URL}/quiz/statistics`)
    return response.json()
  },
}

