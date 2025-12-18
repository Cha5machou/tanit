'use client'

import { useAuth } from './useAuth'
import { UserRole } from '@/types'

export function useRole() {
  const { user } = useAuth()

  const hasRole = (role: UserRole): boolean => {
    if (!user) return false
    
    // Super-admin has access to everything
    if (user.role === 'super-admin') return true
    
    // Admin has access to admin features
    if (role === 'admin' && user.role === 'admin') return true
    
    // User role check
    if (role === 'user' && user.role === 'user') return true
    
    return false
  }

  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('super-admin')
  }

  const isSuperAdmin = (): boolean => {
    return hasRole('super-admin')
  }

  return {
    hasRole,
    isAdmin,
    isSuperAdmin,
    role: user?.role || null,
  }
}

