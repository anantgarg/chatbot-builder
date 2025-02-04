import OpenAI, { APIError } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function createVectorStore(name: string): Promise<string> {
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