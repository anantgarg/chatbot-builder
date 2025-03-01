import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { createVectorStore } from '@/lib/vectorStore'
import { createAssistant } from '@/lib/openai'

export async function GET() {
  try {
    const cookieStore = await cookies()
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
    const cookieStore = await cookies()
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

    // Check if user has an API key
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { openaiApiKey: true }
    })

    if (!user?.openaiApiKey) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not found. Please add your API key in the settings page.',
          code: 'API_KEY_MISSING'
        },
        { status: 400 }
      )
    }
    
    // Validate API key format - basic check
    if (user.openaiApiKey.trim() === '' || !user.openaiApiKey.startsWith('sk-')) {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key format. API keys should start with "sk-".',
          code: 'INVALID_API_KEY_FORMAT'
        },
        { status: 400 }
      )
    }

    const data = await request.json()

    try {
      // 1. Create Vector Store
      console.log('Creating vector store...')
      const vectorStoreId = await createVectorStore(data.name, payload.userId)
      console.log('Vector store created:', vectorStoreId)

      // Add a small delay to ensure the vector store is registered
      console.log('Waiting for vector store to be fully registered...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 2. Create Assistant
      console.log('Creating assistant...')
      const assistantId = await createAssistant(
        payload.userId,
        data.name,
        data.instruction,
        vectorStoreId
      )
      console.log('Assistant created:', assistantId)

      // 3. Create bot in database with the IDs
      const bot = await prisma.bot.create({
        data: {
          name: data.name,
          instruction: data.instruction,
          userId: payload.userId,
          assistantId: assistantId,
          vectorStoreId: vectorStoreId,
          cometChatEnabled: false,
          cometChatAppId: null,
          cometChatRegion: null,
          cometChatApiKey: null,
          cometChatBotUid: null
        }
      })

      return NextResponse.json(bot)
    } catch (error: unknown) {
      console.error('Specific error during bot creation:', error)
      
      // Type guard to check if error is an object with a message property
      const errorWithMessage = error as { message?: string, code?: string, status?: number };
      
      // Handle authentication errors (wrong API key)
      if (errorWithMessage.status === 401 || 
          (errorWithMessage.message && errorWithMessage.message.includes('401')) ||
          (errorWithMessage.message && errorWithMessage.message.toLowerCase().includes('incorrect api key'))) {
        return NextResponse.json(
          { 
            error: 'Authentication failed with OpenAI: Invalid API key. Please check your API key in settings.',
            details: errorWithMessage.message,
            code: 'INVALID_API_KEY'
          },
          { status: 401 }
        )
      }
      
      // Handle vector store not found error
      if (errorWithMessage.message && errorWithMessage.message.includes('Vector store with id') && errorWithMessage.message.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Failed to create bot: Vector store creation succeeded but OpenAI could not find it immediately. Please try again in a few seconds.',
            details: errorWithMessage.message,
            code: 'VECTOR_STORE_NOT_FOUND'
          },
          { status: 400 }
        )
      }
      
      // Handle OpenAI API key errors
      if (errorWithMessage.message && errorWithMessage.message.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'OpenAI API key error: ' + errorWithMessage.message,
            code: 'API_KEY_ERROR'
          },
          { status: 400 }
        )
      }
      
      throw error; // Re-throw for the outer catch block
    }
  } catch (error: unknown) {
    console.error('Error creating bot:', error)
    
    // Type guard to check if error is an object with a message property
    const errorWithMessage = error as { message?: string, code?: string };
    
    return NextResponse.json(
      { 
        error: 'Failed to create bot: ' + (errorWithMessage.message || 'Unknown error'),
        code: errorWithMessage.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
} 