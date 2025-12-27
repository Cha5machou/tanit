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
  
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      `API Error: ${response.status} ${response.statusText}`
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
}

