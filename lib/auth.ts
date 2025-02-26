import { getJWTFromHeader, verifyJWT } from './jwt'
import { prisma } from './prisma'

export interface User {
  id: string
  email: string
  name: string
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    let token = getJWTFromHeader(authHeader || undefined)

    // If no token in header, try to get from cookies
    if (!token) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader)
        token = cookies.token
      }
    }

    if (!token) {
      return null
    }

    const payload = await verifyJWT(token)
    if (!payload || !payload.userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    return user
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

// Helper function to parse cookies from header
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = value
    }
  })
  return cookies
} 