import { APIError } from 'openai'
import { getOpenAIClientForUser } from './openai'

export async function createVectorStore(name: string, userId: string): Promise<string> {
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