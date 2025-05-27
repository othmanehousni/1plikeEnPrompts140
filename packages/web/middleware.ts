import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { authClient } from './lib/auth-client'

export async function middleware(request: NextRequest) {
  // Skip middleware for public routes and API auth routes
  const publicPaths = ['/api/auth', '/favicon.ico', '/_next', '/public', '/revoked']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isPublicPath) {
    return NextResponse.next()
  }

  try {
    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: request.headers
    })

    // If user is authenticated, check domain restriction
    if (session?.user?.email) {
      const email = session.user.email
      const domain = email.split('@')[1]
      
      // Enforce EPFL domain restriction
      if (domain !== 'epfl.ch') {
        console.warn(`Access denied for non-EPFL email: ${email}`)
        
        // Revoke user account, delete from database, and redirect
        return await authClient.deleteUser({callbackURL: '/revoked'})
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - revoked (revocation page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|revoked).*)',
  ],
} 