import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI()

export async function POST() {
  try {
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