import OpenAI from 'openai'
import { APIError } from 'openai'
import { prisma } from './prisma'

// Check if we're in a build/SSR context or client-side
const isBuildOrSSR = typeof window === 'undefined' && process.env.NODE_ENV === 'production'

if (!process.env.OPENAI_API_KEY) {
  console.warn('Missing OPENAI_API_KEY environment variable. Will rely on user-provided keys.')
}

// Default OpenAI client using the environment variable
// During build, use a dummy API key to prevent errors
export const openai = new OpenAI({
  apiKey: isBuildOrSSR && !process.env.OPENAI_API_KEY 
    ? 'dummy-key-for-build-process'
    : process.env.OPENAI_API_KEY,
})

// Function to get an OpenAI client with a user's API key
export async function getOpenAIClientForUser(userId: string): Promise<OpenAI> {
  // Skip actual API calls during build process
  if (isBuildOrSSR && !process.env.OPENAI_API_KEY) {
    console.log('Build process detected, using dummy key for OpenAI client')
    return new OpenAI({
      apiKey: 'dummy-key-for-build-process'
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { openaiApiKey: true }
    })

    if (user?.openaiApiKey) {
      return new OpenAI({
        apiKey: user.openaiApiKey,
      })
    }

    // Don't fall back to the default client, throw an error instead
    throw new Error('No OpenAI API key found for this user. Please add your API key in settings.')
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
    throw new Error('Failed to create assistant')
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