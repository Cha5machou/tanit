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
}

