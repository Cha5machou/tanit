import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/']
  const { pathname } = request.nextUrl

  // Create response
  const response = NextResponse.next()

  // Configure headers for Firebase Auth popup compatibility
  // This prevents Cross-Origin-Opener-Policy warnings
  response.headers.set(
    'Cross-Origin-Opener-Policy',
    'same-origin-allow-popups'
  )
  response.headers.set(
    'Cross-Origin-Embedder-Policy',
    'unsafe-none'
  )

  // Content Security Policy
  // Only set CSP in production to avoid blocking Next.js hot reloading in development
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (!isDevelopment) {
    // In production, use strict CSP without unsafe-eval
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com",
      "frame-src 'self' https://*.googleapis.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ]
    response.headers.set('Content-Security-Policy', cspDirectives.join('; '))
  }
  // In development, don't set CSP to allow Next.js hot reloading with eval()

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return response
  }

  // For other routes, authentication will be handled client-side
  // using the useAuth hook and redirecting to /login if needed
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

