import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getOpenAIClientForUser } from '@/lib/openai'
import { APIError } from 'openai'

// Use a dedicated environment variable to control when to use dummy keys
const useDummyKey = process.env.OPENAI_USE_DUMMY_KEY === 'true'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const json = await request.json()
    const bot = await prisma.bot.update({
      where: { id },
      data: {
        name: json.name,
        instruction: json.instruction,
      },
    })
    return NextResponse.json(bot)
  } catch {
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Skip actual API calls only when explicitly configured to do so
    if (useDummyKey && !process.env.OPENAI_API_KEY) {
      console.log('Using dummy key as configured by OPENAI_USE_DUMMY_KEY, skipping OpenAI API calls')
      return NextResponse.json({ success: true })
    }
    
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyJWT(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Get bot and verify ownership
    const bot = await prisma.bot.findUnique({
      where: {
        id,
        userId: payload.userId
      }
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // Delete from OpenAI
    try {
      // Get the OpenAI client for the user
      const client = await getOpenAIClientForUser(payload.userId as string)
      
      // Delete assistant if exists
      if (bot.assistantId) {
        await client.beta.assistants.del(bot.assistantId)
      }

      // Delete vector store if exists
      if (bot.vectorStoreId) {
        await client.beta.vectorStores.del(bot.vectorStoreId)
      }
    } catch (error: unknown) {
      // If error is not about not found, rethrow
      if (error instanceof APIError && !error.message?.includes('not found')) {
        throw error
      }
    }

    // Remove all file associations
    await prisma.fileToBot.deleteMany({
      where: {
        botId: bot.id
      }
    })

    // Delete from database
    await prisma.bot.delete({
      where: {
        id: bot.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 