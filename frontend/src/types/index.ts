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

export interface Ad {
  ad_id: string
  name: string
  description: string
  logo_url?: string
  link: string
  position: 'left' | 'right'
  slot: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface AdCreate {
  name: string
  description: string
  link: string
  position: 'left' | 'right'
  slot: number
  active: boolean
  logo?: File
}

export interface QuizQuestion {
  question_id: string
  question: string
  options: string[]
  correct_answer_index: number
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QuizQuestionCreate {
  question: string
  options: string[]
  correct_answer_index: number
  tags: string[]
  is_active: boolean
}

export interface QuizQuestionForUser {
  question_id: string
  question: string
  options: string[]
  tags: string[]
  created_at?: string
  updated_at?: string
}

export interface QuizAnswer {
  question_id: string
  selected_index: number
  time_taken: number
}

export interface QuizSubmission {
  submission_id: string
  user_id: string
  score: number
  total_questions: number
  correct_answers: number
  submitted_at: string
  answers: Array<{
    question_id: string
    question: string
    selected_index: number
    correct_index: number
    is_correct: boolean
    time_taken: number
  }>
}

export interface QuizEligibility {
  can_take_quiz: boolean
  already_taken_today: boolean
}

