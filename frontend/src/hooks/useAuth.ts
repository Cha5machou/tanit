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
          console.log('User data fetched:', userData)
          setUser(userData)
        } catch (err) {
          console.error('Error fetching user data:', err)
          setError(err as Error)
          // Set user to null on error to prevent infinite loops
          setUser(null)
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
      // Get session_id from sessionStorage before clearing it
      let sessionId = null
      try {
        sessionId = sessionStorage.getItem('session_id')
      } catch (e) {
        // Silently fail if sessionStorage is not available
      }
      
      // Log session_end before signing out
      try {
        if (sessionId) {
          await api.logAnalyticsEvent('session_end', { session_id: sessionId })
        }
      } catch (err) {
        // Don't fail sign out if tracking fails
        console.warn('Failed to log session end event:', err)
      }
      
      // Clear session_id from sessionStorage
      try {
        sessionStorage.removeItem('session_id')
      } catch (e) {
        // Silently fail
      }
      
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

