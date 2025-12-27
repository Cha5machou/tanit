'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { UserRole } from '@/types'

export function useRole() {
  const { user } = useAuth()

  const hasRole = useMemo(() => {
    return (role: UserRole): boolean => {
      if (!user || !user.role) return false
      return user.role === role
    }
  }, [user])

  const isAdmin = useMemo(() => {
    return (): boolean => {
      if (!user || !user.role) return false
      return user.role === 'admin'
    }
  }, [user])

  return {
    hasRole,
    isAdmin,
    role: user?.role || null,
  }
}

