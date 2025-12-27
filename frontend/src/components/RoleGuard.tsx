'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types'

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole: UserRole | UserRole[]
  fallback?: React.ReactNode
}

export function RoleGuard({
  children,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const { hasRole, isAdmin, role } = useRole()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Wait for auth and user data to be loaded
    if (loading) {
      setChecked(false)
      return
    }

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Wait for user data to be loaded (user might be null initially)
    if (!user) {
      setChecked(false)
      return
    }

    setChecked(true)

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    // Check directly against user.role instead of using the functions
    const hasAccess = roles.some((role) => {
      const userRole = user.role
      if (!userRole) return false
      return userRole === role
    })

    console.log('Access check:', { 
      requiredRole, 
      userRole: user.role, 
      hasAccess,
      roles
    })

    if (!hasAccess) {
      console.log('Access denied:', { 
        requiredRole, 
        userRole: user.role, 
        roles
      })
      router.push('/')
    }
  }, [isAuthenticated, loading, user, requiredRole, hasRole, isAdmin, router])

  // Show loading while checking
  if (loading || !checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  // Check directly against user.role instead of using the functions
  const hasAccess = roles.some((role) => {
    const userRole = user.role
    if (!userRole) return false
    return userRole === role
  })

  if (!hasAccess) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Accès refusé</h2>
            <p className="mt-2 text-gray-600">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Votre rôle actuel : <strong>{user.role || 'non défini'}</strong>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Rôle requis : <strong>{Array.isArray(requiredRole) ? requiredRole.join(' ou ') : requiredRole}</strong>
            </p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}

