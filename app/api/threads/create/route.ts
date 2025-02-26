import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { getOpenAIClientForUser } from '@/lib/openai'

// Use a dedicated environment variable to control when to use dummy keys
const useDummyKey = process.env.OPENAI_USE_DUMMY_KEY === 'true'

export async function POST() {
  try {
    // Skip actual API calls only when explicitly configured to do so
    if (useDummyKey && !process.env.OPENAI_API_KEY) {
      console.log('Using dummy key as configured by OPENAI_USE_DUMMY_KEY, returning dummy thread ID')
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