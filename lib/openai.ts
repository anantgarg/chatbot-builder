import OpenAI from 'openai'
import { APIError } from 'openai'
import { prisma } from './prisma'

// Use a dedicated environment variable to control when to use dummy keys
// Set OPENAI_USE_DUMMY_KEY=true during build if needed
const useDummyKey = process.env.OPENAI_USE_DUMMY_KEY === 'true'

console.log('OpenAI client configuration:', {
  nodeEnv: process.env.NODE_ENV,
  useDummyKey,
  hasApiKey: !!process.env.OPENAI_API_KEY
})

if (!process.env.OPENAI_API_KEY) {
  console.warn('Missing OPENAI_API_KEY environment variable. Will rely on user-provided keys.')
}

// Default OpenAI client using the environment variable
// Use dummy key only when explicitly configured to do so
export const openai = new OpenAI({
  apiKey: useDummyKey && !process.env.OPENAI_API_KEY 
    ? 'dummy-key-for-build-process'
    : process.env.OPENAI_API_KEY,
})

// Function to get an OpenAI client with a user's API key
export async function getOpenAIClientForUser(userId: string): Promise<OpenAI> {
  // Only use dummy key when explicitly configured to do so
  if (useDummyKey && !process.env.OPENAI_API_KEY) {
    console.log('Using dummy key for OpenAI client as configured by OPENAI_USE_DUMMY_KEY')
    return new OpenAI({
      apiKey: 'dummy-key-for-build-process'
    })
  }

  try {
    console.log(`Retrieving OpenAI client for user ${userId}`)
    console.log(`Current environment: NODE_ENV=${process.env.NODE_ENV}, VERCEL_ENV=${process.env.VERCEL_ENV || 'not set'}`)
    
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
    
    console.log(`Creating assistant with name "${name}" for user ${userId} using vector store ${vectorStoreId}`)
    
    // First verify the vector store exists
    try {
      console.log(`Verifying vector store ${vectorStoreId} exists...`)
      const vectorStore = await client.beta.vectorStores.retrieve(vectorStoreId)
      console.log(`Vector store verified: ${vectorStore.id}`)
    } catch (vsError) {
      console.error(`Vector store verification failed:`, vsError)
      // Continue anyway - it might be a timing issue
    }
    
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
      
      if (error.message && error.message.includes('vector_store_ids')) {
        throw new Error(`Vector store issue: ${error.message}. This might be a timing issue with OpenAI's API.`)
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