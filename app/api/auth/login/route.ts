import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signJWT } from '@/lib/jwt'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    console.log('Attempting login for email:', email)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log('Verifying password for user:', user.id)
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log('Login successful for user:', user.id)
    
    // Create JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email
    })

    // Create response with success flag
    const response = NextResponse.json({ success: true })

    // Set cookie with token
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 86400, // 1 day
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })

    console.log('Set cookie with token:', token.slice(0, 20) + '...')
    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 