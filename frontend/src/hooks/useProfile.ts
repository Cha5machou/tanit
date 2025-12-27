'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { api } from '@/services/api'
import { Profile } from '@/types'

export function useProfile() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      setLoading(false)
      setHasProfile(false)
      return
    }

    // Check if profile exists
    const checkProfile = async () => {
      try {
        const profileData = await api.getProfile()
        setProfile(profileData)
        setHasProfile(true)
      } catch (error: any) {
        // Profile doesn't exist (404 or other error)
        setProfile(null)
        setHasProfile(false)
      } finally {
        setLoading(false)
      }
    }

    checkProfile()
  }, [isAuthenticated, authLoading])

  return {
    profile,
    hasProfile,
    loading: loading || authLoading,
  }
}

