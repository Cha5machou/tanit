export type UserRole = 'user' | 'admin'

export interface User {
  uid: string
  email?: string
  name?: string
  picture?: string
  role: UserRole
  created_at?: string
}

export interface Profile {
  user_id: string
  age?: number
  sexe?: string
  metier?: string
  raison_visite?: string
  nationalite?: string
  created_at: string
  updated_at: string
}

export interface ProfileCreate {
  age?: number
  sexe?: string
  metier?: string
  raison_visite?: string
  nationalite?: string
}

export interface POI {
  poi_id: string
  name: string
  lat: number
  lng: number
  description: string
  is_ad: boolean
  photo_url?: string
  audio_url?: string
  created_at: string
  updated_at: string
}

export interface POICreate {
  name: string
  lat: number
  lng: number
  description: string
  is_ad: boolean
  photo?: File
  audio?: File
}

