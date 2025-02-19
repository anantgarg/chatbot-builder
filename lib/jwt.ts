import * as jose from 'jose'

interface JWTPayload {
  userId: string
  email: string
  [key: string]: unknown
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-for-development-only'
)

export async function signJWT(payload: JWTPayload): Promise<string> {
  try {
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)
    console.log('JWT signed successfully')
    return token
  } catch (error) {
    console.error('Error signing JWT:', error)
    throw error
  }
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret)
    console.log('JWT verified successfully')
    return payload as JWTPayload
  } catch (error) {
    console.error('Error verifying JWT:', error)
    return null
  }
}

export function getJWTFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.split(' ')[1]
} 