import { APIError } from 'openai'
import { getOpenAIClientForUser } from './openai'

// Use a dedicated environment variable to control when to use dummy keys
// Set OPENAI_USE_DUMMY_KEY=true during build if needed
const useDummyKey = process.env.OPENAI_USE_DUMMY_KEY === 'true'

export async function createVectorStore(name: string, userId: string): Promise<string> {
  // Skip actual API calls only when explicitly configured to do so
  if (useDummyKey && !process.env.OPENAI_API_KEY) {
    console.log('Using dummy key as configured by OPENAI_USE_DUMMY_KEY, returning dummy vector store ID')
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