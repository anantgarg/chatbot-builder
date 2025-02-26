import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getOpenAIClientForUser } from '@/lib/openai'
import { APIError } from 'openai'

// Use a dedicated environment variable to control when to use dummy keys
const useDummyKey = process.env.OPENAI_USE_DUMMY_KEY === 'true'

export async function GET() {
  try {
    // Skip actual API calls only when explicitly configured to do so
    if (useDummyKey && !process.env.OPENAI_API_KEY) {
      console.log('Using dummy key as configured by OPENAI_USE_DUMMY_KEY, returning empty files array')
      return NextResponse.json([])
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

    // Get user's files from database with bot associations
    const files = await prisma.file.findMany({
      where: {
        userId: payload.userId
      },
      include: {
        bots: {
          include: {
            bot: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform the response to include associated bot information
    const transformedFiles = files.map(file => ({
      id: file.id,
      fileId: file.fileId,
      filename: file.filename,
      purpose: file.purpose,
      bytes: file.bytes,
      createdAt: file.createdAt,
      associatedBots: file.bots.map(fb => ({
        id: fb.bot.id,
        name: fb.bot.name
      }))
    }))

    return NextResponse.json(transformedFiles)
  } catch (error) {
    console.error('Error getting files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Skip actual API calls only when explicitly configured to do so
    if (useDummyKey && !process.env.OPENAI_API_KEY) {
      console.log('Using dummy key as configured by OPENAI_USE_DUMMY_KEY, returning dummy file data')
      return NextResponse.json({ 
        success: true, 
        message: 'This is a dummy response when OPENAI_USE_DUMMY_KEY is enabled',
        file: { id: 'dummy-id', fileId: 'dummy-file-id', filename: 'dummy-file.txt' }
      })
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

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    console.log('Uploading file to OpenAI:', file.name)

    // Get the OpenAI client for the user
    const client = await getOpenAIClientForUser(payload.userId as string)

    // Upload the file to OpenAI
    const response = await client.files.create({
      file,
      purpose: 'assistants',
    })

    console.log('OpenAI file upload response:', response)

    try {
      // Store file information in the database
      const fileRecord = await prisma.file.create({
        data: {
          fileId: response.id,
          filename: file.name,
          purpose: response.purpose,
          bytes: response.bytes,
          userId: payload.userId
        },
      })

      console.log('File record created in database:', fileRecord)

      return NextResponse.json({ 
        success: true, 
        message: 'File uploaded successfully', 
        file: fileRecord 
      })
    } catch (dbError: unknown) {
      console.error('Database error:', dbError)
      // Even if database storage fails, the file was uploaded to OpenAI
      return NextResponse.json({ 
        success: true, 
        warning: 'File uploaded to OpenAI but database storage failed',
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        fileId: response.id
      })
    }
  } catch (error: unknown) {
    console.error('File upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    // Get request body
    const body = await request.json()
    const { fileId } = body as { fileId: string }

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
        bots: true
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // First remove all bot associations
    await prisma.fileToBot.deleteMany({
      where: {
        fileId: file.id
      }
    })

    // Delete from OpenAI
    try {
      // Get the OpenAI client for the user
      const client = await getOpenAIClientForUser(payload.userId as string)
      
      await client.files.del(fileId)
    } catch (error: unknown) {
      // If error is not about file not found, rethrow
      if (error instanceof APIError && !error.message?.includes('not found')) {
        throw error
      }
    }

    // Delete from database
    await prisma.file.delete({
      where: {
        id: file.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 