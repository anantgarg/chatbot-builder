import { APIError } from 'openai'
import { getOpenAIClientForUser } from './openai'

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

export async function createVectorStore(name: string, userId: string): Promise<string> {
  // Skip actual API calls during build process only (not regular SSR)
  if (isBuildTime && !process.env.OPENAI_API_KEY) {
    console.log('Build process detected, skipping actual OpenAI API call')
    return 'dummy-vector-store-id-for-build'
  }

  try {
    console.log(`Creating vector store with name "${name}" for user ${userId}`)
    
    // Always use user-specific client
    const client = await getOpenAIClientForUser(userId)
    
    console.log('Successfully obtained OpenAI client, creating vector store...')
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