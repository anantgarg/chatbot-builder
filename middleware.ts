import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from './lib/jwt'

// Add paths that don't require authentication
const publicPaths = [
  '/login', 
  '/register', 
  '/api/auth/login', 
  '/api/auth/register',
  '/api/webhook/cometchat' // Add webhook endpoint to public paths
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('Middleware processing path:', pathname)

  // Check if the path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    console.log('Public path detected, allowing access')
    return NextResponse.next()
  }

  // Check for token in cookies
  const token = request.cookies.get('token')?.value
  console.log('Token found in cookies:', token ? 'yes' : 'no')

  // If no token, redirect to login
  if (!token) {
    console.log('No token found, redirecting to login')
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  try {
    // Verify token
    const payload = await verifyJWT(token)
    if (!payload) {
      console.log('Token verification failed')
      throw new Error('Invalid token')
    }
    console.log('Token verified successfully, allowing access')
    return NextResponse.next()
  } catch (error) {
    console.error('Error processing token:', error)
    // Clear invalid token and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('token')
    return response
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // Match all paths except:
    '/((?!_next/static|_next/image|favicon.ico|public|api/webhook/cometchat).*)',
  ],
} 