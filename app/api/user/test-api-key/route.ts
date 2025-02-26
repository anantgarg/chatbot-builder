import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export async function GET() {
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

    // Get the user's API key
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { openaiApiKey: true }
    })

    if (!user?.openaiApiKey) {
      return NextResponse.json({ 
        valid: false, 
        error: 'No API key found' 
      })
    }

    const trimmedApiKey = user.openaiApiKey.trim()
    
    if (!trimmedApiKey.startsWith('sk-')) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid API key format' 
      })
    }

    // Mask key for logging/display
    const keyStart = trimmedApiKey.substring(0, 5)
    const keyEnd = trimmedApiKey.substring(trimmedApiKey.length - 4)
    const maskedKey = `${keyStart}...${keyEnd}`

    try {
      // Test the key with a simple API call
      console.log(`Testing OpenAI API key: ${maskedKey}`)
      
      // Create a new client instance with the user's API key
      const openai = new OpenAI({
        apiKey: trimmedApiKey
      })
      
      const models = await openai.models.list()
      
      return NextResponse.json({ 
        valid: true, 
        message: `API key is valid. Found ${models.data.length} models.`,
        maskedKey
      })
    } catch (error: unknown) {
      console.error('OpenAI API key test failed:', error)
      
      return NextResponse.json({ 
        valid: false, 
        error: 'API key validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        maskedKey
      })
    }
  } catch (error) {
    console.error('Error testing API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 