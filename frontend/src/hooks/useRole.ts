'use client'

import { useAuth } from './useAuth'
import { UserRole } from '@/types'

export function useRole() {
  const { user } = useAuth()

  const hasRole = (role: UserRole): boolean => {
    if (!user) return false
    return user.role === role
  }

  const isAdmin = (): boolean => {
    return hasRole('admin')
  }

  return {
    hasRole,
    isAdmin,
    role: user?.role || null,
  }
}

