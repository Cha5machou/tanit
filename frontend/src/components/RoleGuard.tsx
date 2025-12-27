'use client'

import { useEffect } from 'react'
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
  const { isAuthenticated, loading } = useAuth()
  const { hasRole, isAdmin } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const hasAccess = roles.some((role) => {
      if (role === 'admin') return isAdmin()
      return hasRole(role)
    })

    if (!hasAccess) {
      router.push('/')
    }
  }, [isAuthenticated, loading, requiredRole, hasRole, isAdmin, router])

  if (loading) {
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
  const hasAccess = roles.some((role) => {
    if (role === 'admin') return isAdmin()
    return hasRole(role)
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
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}

