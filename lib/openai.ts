import OpenAI from 'openai'
import { APIError } from 'openai'
import { prisma } from './prisma'

// More specific check for build time vs regular SSR
// Various Vercel environment variables that should be present during normal operation
// but not during build time
const hasVercelEnv = process.env.VERCEL_ENV !== undefined
const hasVercelRegion = process.env.VERCEL_REGION !== undefined
const hasVercelUrl = process.env.VERCEL_URL !== undefined

// Only true during build time, not during normal server operation 
const isBuildTime = typeof window === 'undefined' && 
                    process.env.NODE_ENV === 'production' && 
                    !hasVercelEnv && !hasVercelRegion && !hasVercelUrl

console.log('Environment detection:', {
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
  vercelRegion: process.env.VERCEL_REGION ? 'set' : 'not set',
  vercelUrl: process.env.VERCEL_URL ? 'set' : 'not set',
  isBuildTime
})

if (!process.env.OPENAI_API_KEY) {
  console.warn('Missing OPENAI_API_KEY environment variable. Will rely on user-provided keys.')
}

// Default OpenAI client using the environment variable
// During build, use a dummy API key to prevent errors
export const openai = new OpenAI({
  apiKey: isBuildTime && !process.env.OPENAI_API_KEY 
    ? 'dummy-key-for-build-process'
    : process.env.OPENAI_API_KEY,
})

// Function to get an OpenAI client with a user's API key
export async function getOpenAIClientForUser(userId: string): Promise<OpenAI> {
  // Skip actual API calls during build process only (not regular SSR)
  if (isBuildTime && !process.env.OPENAI_API_KEY) {
    console.log('Build process detected, using dummy key for OpenAI client')
    return new OpenAI({
      apiKey: 'dummy-key-for-build-process'
    })
  }

  try {
    console.log(`Retrieving OpenAI client for user ${userId}`)
    console.log(`Current environment: NODE_ENV=${process.env.NODE_ENV}, VERCEL_ENV=${process.env.VERCEL_ENV || 'not set'}`)
    console.log(`Is build time detection active: ${isBuildTime}`)
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { openaiApiKey: true }
    })

    if (!user) {
      console.error(`User ${userId} not found in database`)
      throw new Error(`User not found`)
    }

    if (!user.openaiApiKey) {
      console.error(`No API key found for user ${userId}`)
      throw new Error('No OpenAI API key found for this user. Please add your API key in settings.')
    }

    // Trim the API key to remove any accidental whitespace
    const trimmedApiKey = user.openaiApiKey.trim()
    
    if (!trimmedApiKey.startsWith('sk-')) {
      console.error(`API key for user ${userId} has invalid format (does not start with sk-)`)
      throw new Error('Invalid API key format. API keys should start with "sk-"')
    }

    // Log partial key for debugging (first 5 chars and last 4 chars)
    const keyStart = trimmedApiKey.substring(0, 5)
    const keyEnd = trimmedApiKey.substring(trimmedApiKey.length - 4)
    console.log(`Using API key for user ${userId}: ${keyStart}...${keyEnd} (length: ${trimmedApiKey.length})`)
    
    try {
      const client = new OpenAI({
        apiKey: trimmedApiKey,
      })
      
      // Test the client with a simple API call
      console.log(`Testing OpenAI client with a simple API call...`)
      const models = await client.models.list()
      console.log(`OpenAI client test successful, retrieved ${models.data.length} models`)
      
      return client
    } catch (apiError) {
      console.error(`Error initializing or testing OpenAI client:`, apiError)
      throw new Error(`Failed to initialize OpenAI client: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Error getting OpenAI client for user:', error)
    throw new Error('Failed to get OpenAI client. Please check your API key in settings.')
  }
}

export async function createAssistant(userId: string, name: string, instructions: string, vectorStoreId: string): Promise<string> {
  try {
    const client = await getOpenAIClientForUser(userId)
    
    const response = await client.beta.assistants.create({
      name,
      instructions,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      },
      model: 'gpt-4o',
    })
    return response.id
  } catch (error: unknown) {
    console.error('OpenAI Assistant Creation Error:', error)
    
    // Improve error handling for API key issues
    if (error instanceof APIError) {
      if (error.status === 401) {
        throw new Error(`Authentication failed: Invalid API key. Please check your API key in settings. Details: ${error.message}`)
      }
    }
    
    // Re-throw the original error with additional context
    throw error
  }
}

export async function associateFileWithVectorStore(userId: string, vectorStoreId: string, fileId: string): Promise<void> {
  try {
    const client = await getOpenAIClientForUser(userId)
    
    await client.beta.vectorStores.files.create(vectorStoreId, {
      file_id: fileId,
    })
  } catch (error: unknown) {
    console.error('OpenAI Vector Store File Association Error:', error)
    throw new Error('Failed to associate file with vector store')
  }
}

export async function invokeBotWithMessage(userId: string, instruction: string, message: string) {
  try {
    const client = await getOpenAIClientForUser(userId)
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: instruction,
        },
        {
          role: "user",
          content: message,
        },
      ],
    })

    return response.choices[0]?.message?.content || 'No response generated'
  } catch (error: unknown) {
    if (error instanceof APIError) {
      console.error('OpenAI API Error Details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
      })
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your settings.')
      }
    }
    throw error
  }
} 