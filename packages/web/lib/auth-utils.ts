import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { User } from 'better-auth/types'

/**
 * Validates that the authenticated user has an EPFL email domain
 * @param request - The Next.js request object
 * @returns Object with isValid boolean and optional response for unauthorized access
 */
export async function validateEpflDomain(request: NextRequest): Promise<{
  isValid: boolean
  response?: NextResponse
  user?: User
}> {
  try {
    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: request.headers
    })

    // Check if user is authenticated
    if (!session?.user) {
      return {
        isValid: false,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    const email = session.user.email
    if (!email) {
      return {
        isValid: false,
        response: NextResponse.json(
          { error: 'Email not found in session' },
          { status: 401 }
        )
      }
    }

    const domain = email.split('@')[1]
    
    // Enforce EPFL domain restriction
    if (domain !== 'epfl.ch') {
      console.warn(`API access denied for non-EPFL email: ${email}`)
      return {
        isValid: false,
        response: NextResponse.json(
          { 
            error: 'Access denied. Only EPFL email addresses are allowed.',
            domain: domain 
          },
          { status: 403 }
        )
      }
    }

    return {
      isValid: true,
      user: session.user
    }
  } catch (error) {
    console.error('Domain validation error:', error)
    return {
      isValid: false,
      response: NextResponse.json(
        { error: 'Authentication validation failed' },
        { status: 500 }
      )
    }
  }
}

interface RouteContext {
  params?: Record<string, string | string[]>
}

/**
 * Middleware wrapper for API routes that require EPFL domain validation
 * @param handler - The API route handler function
 * @returns Wrapped handler with domain validation
 */
export function withEpflDomainValidation(
  handler: (request: NextRequest, context: RouteContext, user: User) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: RouteContext) => {
    const validation = await validateEpflDomain(request)
    
    if (!validation.isValid) {
      return validation.response!
    }

    return handler(request, context, validation.user!)
  }
} 