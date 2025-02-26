import OpenAI, { APIError } from 'openai'

// Check if we're in a build/SSR context or client-side
const isBuildOrSSR = typeof window === 'undefined' && process.env.NODE_ENV === 'production'

const openai = new OpenAI({
  apiKey: isBuildOrSSR && !process.env.OPENAI_API_KEY 
    ? 'dummy-key-for-build-process'
    : process.env.OPENAI_API_KEY,
})

export async function createVectorStore(name: string): Promise<string> {
  // Skip actual API calls during build process
  if (isBuildOrSSR && !process.env.OPENAI_API_KEY) {
    console.log('Build process detected, skipping actual OpenAI API call')
    return 'dummy-vector-store-id-for-build'
  }

  try {
    const response = await openai.beta.vectorStores.create({
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