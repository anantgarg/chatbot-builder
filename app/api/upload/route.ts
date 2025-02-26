import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

// Check if we're in a build/SSR context
const isBuildOrSSR = typeof window === 'undefined' && process.env.NODE_ENV === 'production'

const openai = new OpenAI({
  apiKey: isBuildOrSSR && !process.env.OPENAI_API_KEY 
    ? 'dummy-key-for-build-process'
    : process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    // Skip actual API calls during build process
    if (isBuildOrSSR && !process.env.OPENAI_API_KEY) {
      console.log('Build process detected, skipping actual OpenAI API call')
      return NextResponse.json({ 
        success: true, 
        message: 'This is a dummy response for the build process',
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
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    console.log('Uploading file to OpenAI:', file.name)

    // Upload the file to OpenAI
    const response = await openai.files.create({
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