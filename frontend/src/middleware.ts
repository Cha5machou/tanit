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

