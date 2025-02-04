import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { createVectorStore } from '@/lib/vectorStore'
import { createAssistant } from '@/lib/openai'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const bots = await prisma.bot.findMany({
      where: {
        userId: payload.userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(bots)
  } catch (error) {
    console.error('Error fetching bots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const data = await request.json()

    // 1. Create Vector Store
    console.log('Creating vector store...')
    const vectorStoreId = await createVectorStore(data.name)
    console.log('Vector store created:', vectorStoreId)

    // 2. Create Assistant
    console.log('Creating assistant...')
    const assistantId = await createAssistant(
      data.name,
      data.instruction,
      vectorStoreId.id
    )
    console.log('Assistant created:', assistantId)

    // 3. Create bot in database with the IDs
    const bot = await prisma.bot.create({
      data: {
        name: data.name,
        instruction: data.instruction,
        userId: payload.userId,
        assistantId: assistantId,
        vectorStoreId: vectorStoreId.id,
        cometChatEnabled: false,
        cometChatAppId: null,
        cometChatRegion: null,
        cometChatApiKey: null,
        cometChatBotUid: null
      }
    })

    return NextResponse.json(bot)
  } catch (error) {
    console.error('Error creating bot:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 