import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Check if we're in a build/SSR context
const isBuildOrSSR = typeof window === 'undefined' && process.env.NODE_ENV === 'production'

const openai = new OpenAI({
  apiKey: isBuildOrSSR && !process.env.OPENAI_API_KEY 
    ? 'dummy-key-for-build-process'
    : process.env.OPENAI_API_KEY,
})

export async function POST() {
  try {
    // Skip actual API calls during build process
    if (isBuildOrSSR && !process.env.OPENAI_API_KEY) {
      console.log('Build process detected, skipping actual OpenAI API call')
      return NextResponse.json({ threadId: 'dummy-thread-id-for-build' })
    }

    const thread = await openai.beta.threads.create()
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