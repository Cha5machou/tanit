export type UserRole = 'user' | 'admin' | 'super-admin'

export interface User {
  uid: string
  email?: string
  name?: string
  picture?: string
  role: UserRole
  site_id?: string
  created_at?: string
}

export interface Profile {
  user_id: string
  age?: number
  sexe?: string
  metier?: string
  raison_visite?: string
  created_at: string
  updated_at: string
}

export interface ProfileCreate {
  age?: number
  sexe?: string
  metier?: string
  raison_visite?: string
}

