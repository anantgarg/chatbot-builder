import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const id = await context.params.id
    const json = await request.json()
    const bot = await prisma.bot.update({
      where: { id },
      data: {
        name: json.name,
        instruction: json.instruction,
      },
    })
    return NextResponse.json(bot)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyJWT(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get bot and verify ownership
    const bot = await prisma.bot.findUnique({
      where: {
        id: params.id,
        userId: payload.userId
      }
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // Delete from OpenAI
    try {
      // Delete assistant if exists
      if (bot.assistantId) {
        await openai.beta.assistants.del(bot.assistantId)
      }

      // Delete vector store if exists
      if (bot.vectorStoreId) {
        await openai.beta.vectorStores.del(bot.vectorStoreId)
      }
    } catch (error: any) {
      // If error is not about not found, rethrow
      if (!error.message?.includes('not found')) {
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