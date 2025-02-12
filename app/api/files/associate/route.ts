import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { APIError } from 'openai'
import type { Prisma } from '@prisma/client'

type FileWithBots = Prisma.FileGetPayload<{
  include: { bots: true }
}>

type FileWithBotDetails = Prisma.FileGetPayload<{
  include: { bots: { include: { bot: true } } }
}>

export async function POST(request: Request) {
  try {
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

    // Get request body
    const body = await request.json()
    const { fileId, botIds } = body as { fileId: string; botIds: string[] }

    if (!fileId || !botIds || !Array.isArray(botIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get file and verify ownership
    const file = await prisma.file.findUnique({
      where: {
        fileId,
        userId: payload.userId
      },
      include: {
        bots: true
      }
    }) as FileWithBots | null

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get existing bot associations
    const existingBotIds = file.bots.map(fb => fb.botId)

    // Get bots and verify ownership
    const bots = await prisma.bot.findMany({
      where: {
        id: {
          in: botIds.map(id => id.toString())
        },
        userId: payload.userId
      }
    })

    if (bots.length !== botIds.length) {
      return NextResponse.json({ error: 'One or more bots not found' }, { status: 404 })
    }

    // Associate file with each bot's vector store
    const results = await Promise.all(
      bots.map(async (bot) => {
        if (!bot.vectorStoreId) {
          console.error(`Bot ${bot.id} has no vector store ID`)
          return null
        }

        try {
          // Skip OpenAI association if already exists
          if (!existingBotIds.includes(bot.id)) {
            try {
              await openai.beta.vectorStores.files.create(bot.vectorStoreId!, {
                file_id: fileId
              })
            } catch (error: unknown) {
              // If error is not about duplicate file, rethrow
              if (error instanceof APIError && !error.message?.includes('already exists')) {
                throw error
              }
            }
          }

          // Create relationship in database if it doesn't exist
          const existingAssociation = await prisma.fileToBot.findFirst({
            where: {
              botId: bot.id,
              fileId: file.id
            }
          })

          if (!existingAssociation) {
            await prisma.fileToBot.create({
              data: {
                botId: bot.id,
                fileId: file.id
              }
            })
          }

          return bot.id
        } catch (error) {
          console.error(`Error associating file with bot ${bot.id}:`, error)
          return null
        }
      })
    )

    const successfulBots = results.filter(Boolean)
    const failedBots = results.filter(r => !r).length

    return NextResponse.json({
      success: true,
      associatedBots: successfulBots,
      failedAssociations: failedBots
    })

  } catch (error) {
    console.error('Error associating file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    // Get request body
    const body = await request.json()
    const { fileId, botIds } = body

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get file and verify ownership
    const file = await prisma.file.findUnique({
      where: {
        fileId,
        userId: payload.userId
      },
      include: {
        bots: {
          include: {
            bot: true
          }
        }
      }
    }) as FileWithBotDetails | null

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // If no botIds provided, remove all associations
    const botsToRemove = botIds ? 
      file.bots.filter(fb => botIds.includes(fb.bot.id)).map(fb => fb.bot) :
      file.bots.map(fb => fb.bot)

    // Remove file from each bot's assistant and database
    const results = await Promise.all(
      botsToRemove.map(async (bot) => {
        if (!bot.vectorStoreId) {
          console.error(`Bot ${bot.id} has no vector store ID`)
          return null
        }

        try {
          // Remove from OpenAI vector store
          try {
            await openai.beta.vectorStores.files.del(bot.vectorStoreId, fileId)
          } catch (error: unknown) {
            // If error is not about file not found, rethrow
            if (error instanceof APIError && !error.message?.includes('not found')) {
              throw error
            }
          }

          // Remove relationship from database
          await prisma.fileToBot.deleteMany({
            where: {
              botId: bot.id,
              fileId: file.id
            }
          })

          return bot.id
        } catch (error) {
          console.error(`Error removing file from bot ${bot.id}:`, error)
          return null
        }
      })
    )

    const successfulBots = results.filter(Boolean)
    const failedBots = results.filter(r => !r).length

    return NextResponse.json({
      success: true,
      removedFromBots: successfulBots,
      failedRemovals: failedBots
    })

  } catch (error) {
    console.error('Error removing file associations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const file = await prisma.file.findFirst({
      where: { 
        fileId: fileId 
      },
      include: {
        bots: {
          include: {
            bot: true
          }
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const associatedBotIds = file.bots.map((fb: { bot: { id: string } }) => fb.bot.id)
    return NextResponse.json({ associatedBotIds })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching file associations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file associations: ' + errorMessage },
      { status: 500 }
    )
  }
} 