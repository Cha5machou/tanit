'use client'

import { useState, useEffect } from 'react'
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { api } from '@/services/api'
import { User } from '@/types'
import { signOut as firebaseSignOut } from '@/services/auth'

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          // Fetch user data from backend
          const userData = await api.getCurrentUser()
          setUser(userData)
        } catch (err) {
          console.error('Error fetching user data:', err)
          setError(err as Error)
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      await firebaseSignOut()
      setUser(null)
      setFirebaseUser(null)
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  return {
    user,
    firebaseUser,
    loading,
    error,
    isAuthenticated: !!firebaseUser,
    signOut,
  }
}

