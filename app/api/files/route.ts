import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getOpenAIClientForUser } from '@/lib/openai'
import { APIError } from 'openai'

// Configure this route to handle larger file sizes
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase the size limit to 10MB
    },
    responseLimit: false,
  },
};

export async function GET() {
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

    console.log('Uploading file to OpenAI:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Check file size before uploading
    if (file.size > 10 * 1024 * 1024) { // 10MB in bytes
      return NextResponse.json({ 
        error: 'File size exceeds the maximum allowed limit of 10MB' 
      }, { status: 413 })
    }

    // Get the OpenAI client for the user
    try {
      const client = await getOpenAIClientForUser(payload.userId as string)
      console.log('OpenAI client initialized successfully')
      
      // Upload the file to OpenAI
      try {
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
      } catch (uploadError: unknown) {
        console.error('OpenAI file upload error:', uploadError)
        let errorMessage = 'Failed to upload file to OpenAI'
        
        if (uploadError instanceof Error) {
          errorMessage += ': ' + uploadError.message
          
          // Check for specific OpenAI API errors
          if ('status' in uploadError && typeof uploadError.status === 'number') {
            errorMessage += ` (Status: ${uploadError.status})`
          }
        }
        
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    } catch (clientError: unknown) {
      console.error('OpenAI client initialization error:', clientError)
      return NextResponse.json({ 
        error: 'Failed to initialize OpenAI client: ' + 
          (clientError instanceof Error ? clientError.message : 'Unknown error')
      }, { status: 500 })
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