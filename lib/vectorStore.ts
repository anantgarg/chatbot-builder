import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function createVectorStore(name: string): Promise<string> {
  try {
    const response = await openai.beta.vectorStores.create({
      name,
    })
    console.log('Vector store creation response:', response)
    return response
  } catch (error: any) {
    console.error('OpenAI Vector Store Creation Error:', error)
    throw new Error('Failed to create vector store: ' + (error?.message || 'Unknown error'))
  }
} 