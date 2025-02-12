import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// -- POST Handler ------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: {
        id: params.id,
        userId: payload.userId,
      },
    })

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    // Update bot with integration settings
    const updatedBot = await prisma.bot.update({
      where: {
        id: params.id,
      },
      data: {
        cometChatEnabled: data.cometChatEnabled,
        cometChatAppId: data.cometChatAppId,
        cometChatRegion: data.cometChatRegion,
        cometChatApiKey: data.cometChatApiKey,
        cometChatBotUid: data.cometChatBotUid,
      } as Prisma.BotUpdateInput,
    })

    return NextResponse.json(updatedBot)
  } catch (error) {
    console.error('Error updating bot integrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// -- GET Handler -------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Remove searchParams from here
) {
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

    // *Use* the searchParams so it's not flagged as unused:
    console.log('[GET Handler] Search Params:', searchParams.toString())
    // Alternatively, you could do: 
    // const foo = searchParams.get('foo')
    // if (foo) { /* use foo in a query, etc. */ }

    // Fetch bot with integration settings
    const bot = await prisma.bot.findFirst({
      where: {
        id: params.id,
        userId: payload.userId,
      },
      select: {
        cometChatEnabled: true,
        cometChatAppId: true,
        cometChatRegion: true,
        cometChatApiKey: true,
        cometChatBotUid: true,
      } as Prisma.BotSelect,
    })

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(bot)
  } catch (error) {
    console.error('Error fetching bot integrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}