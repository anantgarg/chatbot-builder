import { APIError } from 'openai'
import { getOpenAIClientForUser } from './openai'

// More specific check for build time vs regular SSR
// VERCEL_ENV is set to 'production', 'preview', or 'development' in normal operation
// It will not be set during the build process
const isBuildTime = typeof window === 'undefined' && 
                   process.env.NODE_ENV === 'production' && 
                   !process.env.VERCEL_ENV

export async function createVectorStore(name: string, userId: string): Promise<string> {
  // Skip actual API calls during build process only (not regular SSR)
  if (isBuildTime && !process.env.OPENAI_API_KEY) {
    console.log('Build process detected, skipping actual OpenAI API call')
    return 'dummy-vector-store-id-for-build'
  }

  try {
    // Always use user-specific client
    const client = await getOpenAIClientForUser(userId)
    
    const response = await client.beta.vectorStores.create({
      name,
    })
    console.log('Vector store creation response:', response)
    return response.id
  } catch (error: unknown) {
    console.error('OpenAI Vector Store Creation Error:', error)
    if (error instanceof APIError) {
      throw new Error(`Failed to create vector store: ${error.message}`)
    }
    throw new Error('Failed to create vector store: Unknown error')
  }
} 