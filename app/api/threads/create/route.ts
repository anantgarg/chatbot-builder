import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { getOpenAIClientForUser } from '@/lib/openai'

// Check if we're in a build/SSR context
const isBuildOrSSR = typeof window === 'undefined' && process.env.NODE_ENV === 'production'

export async function POST() {
  try {
    // Skip actual API calls during build process
    if (isBuildOrSSR && !process.env.OPENAI_API_KEY) {
      console.log('Build process detected, skipping actual OpenAI API call')
      return NextResponse.json({ threadId: 'dummy-thread-id-for-build' })
    }

    // Get user from token
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyJWT(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the OpenAI client for the user
    const client = await getOpenAIClientForUser(payload.userId as string)

    const thread = await client.beta.threads.create()
    console.log('Created new thread:', thread)

    return NextResponse.json({ threadId: thread.id })
  } catch (error) {
    console.error('Error creating thread:', error)
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    )
  }
} 