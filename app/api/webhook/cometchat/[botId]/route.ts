import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOpenAIClientForUser } from '@/lib/openai'

// Mark this route as public and ensure it's always dynamic
export const dynamic = 'force-dynamic'

interface EntityInfo {
  entity: {
    [key: string]: unknown
  }
  entityType: string
}

interface MessageData {
  text: string
  resource: string
  entities: {
    sender: EntityInfo
    receiver: EntityInfo
  }
}

interface WebhookData {
  id: string
  muid: string
  conversationId: string
  sender: string
  receiverType: string
  receiver: string
  category: string
  type: string
  data: MessageData
  sentAt: number
  updatedAt: number
}

interface WebhookPayload {
  trigger: string
  data: WebhookData
  appId: string
  origin: {
    platform: string
    language: string
    resource: string
  }
  chatAPIVersion: string
  region: string
  bot: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ botId: string }> }
) {
  console.log('CometChat webhook received')
  
  try {
    const { botId } = await context.params;
    console.log('Processing webhook for bot ID:', botId)
    
    let payload: WebhookPayload
    try {
      payload = await request.json()
      console.log('Webhook payload received:', JSON.stringify({
        trigger: payload.trigger,
        sender: payload.data?.sender,
        receiver: payload.data?.receiver,
        message: payload.data?.data?.text?.substring(0, 50) + (payload.data?.data?.text?.length > 50 ? '...' : '')
      }))
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError)
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    
    // Verify this is a message event
    if (payload.trigger !== 'after_message') {
      console.log('Ignoring non-message event:', payload.trigger)
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 })
    }

    // Fetch bot's details including CometChat and OpenAI configuration
    console.log('Fetching bot configuration from database...')
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        userId: true,
        cometChatAppId: true,
        cometChatApiKey: true,
        cometChatRegion: true,
        cometChatBotUid: true,
        assistantId: true
      }
    })

    console.log('Bot configuration found:', {
      botId,
      userId: bot?.userId || 'missing',
      cometChatAppId: bot?.cometChatAppId || 'missing',
      cometChatApiKey: bot?.cometChatApiKey ? 'present' : 'missing',
      cometChatRegion: bot?.cometChatRegion || 'missing',
      cometChatBotUid: bot?.cometChatBotUid || 'missing',
      assistantId: bot?.assistantId || 'missing'
    })

    if (!bot) {
      console.error('Bot not found with ID:', botId)
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const missingConfigs = []
    if (!bot.cometChatAppId) missingConfigs.push('cometChatAppId')
    if (!bot.cometChatApiKey) missingConfigs.push('cometChatApiKey')
    if (!bot.cometChatRegion) missingConfigs.push('cometChatRegion')
    if (!bot.cometChatBotUid) missingConfigs.push('cometChatBotUid')
    if (!bot.assistantId) missingConfigs.push('assistantId')

    if (missingConfigs.length > 0) {
      console.error('Missing bot configurations:', missingConfigs)
      return NextResponse.json({ 
        error: 'Bot configuration incomplete', 
        missingConfigs 
      }, { status: 400 })
    }

    // Check if the message is from the bot itself to avoid infinite loops
    if (payload.data.sender === bot.cometChatBotUid) {
      console.log('Ignoring message from bot itself to prevent infinite loop')
      return NextResponse.json({ 
        status: 'OK', 
        message: 'Ignored message from bot itself'
      }, { status: 200 })
    }

    // Get the OpenAI client for the user
    console.log(`Getting OpenAI client for user ${bot.userId}...`)
    const client = await getOpenAIClientForUser(bot.userId)
    console.log('OpenAI client initialized successfully')

    // Get or create OpenAI thread based on CometChat conversation ID
    console.log(`Working with conversation ID: ${payload.data.conversationId}`)
    let thread
    try {
      // Try to retrieve existing thread
      console.log('Attempting to retrieve existing thread...')
      thread = await client.beta.threads.retrieve(payload.data.conversationId)
      console.log('Retrieved existing thread:', thread.id)
    } catch {
      // Create new thread if it doesn't exist
      console.log('Thread not found, creating new thread...')
      thread = await client.beta.threads.create()
      console.log('Created new thread:', thread.id)
    }

    // Add the user's message to the thread
    console.log('Adding user message to thread...')
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: payload.data.data.text
    })
    console.log('User message added successfully')

    // Run the assistant
    console.log(`Running assistant ${bot.assistantId} on thread ${thread.id}...`)
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: bot.assistantId!
    })
    console.log('Assistant run created:', run.id)

    // Wait for completion
    console.log('Waiting for assistant to complete...')
    let response = await client.beta.threads.runs.retrieve(thread.id, run.id)
    let attempts = 0
    const maxAttempts = 60 // 60 seconds timeout
    
    while ((response.status === 'in_progress' || response.status === 'queued') && attempts < maxAttempts) {
      console.log(`Run status: ${response.status}, waiting...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      response = await client.beta.threads.runs.retrieve(thread.id, run.id)
      attempts++
    }

    if (response.status !== 'completed') {
      console.error('Run failed or timed out:', response)
      return NextResponse.json({ 
        error: 'Failed to get response from assistant', 
        status: response.status 
      }, { status: 500 })
    }

    // Get the assistant's response
    console.log('Run completed, retrieving assistant response...')
    const messages = await client.beta.threads.messages.list(thread.id)
    const lastMessage = messages.data[0]

    if (!lastMessage || !lastMessage.content[0] || lastMessage.content[0].type !== 'text') {
      console.error('No valid response received from assistant')
      return NextResponse.json({ error: 'No response received from assistant' }, { status: 500 })
    }

    const assistantResponse = lastMessage.content[0].text.value
    console.log('Assistant response:', assistantResponse.substring(0, 100) + (assistantResponse.length > 100 ? '...' : ''))

    // Send the assistant's response back through CometChat
    const url = `https://${bot.cometChatAppId}.api-${bot.cometChatRegion}.cometchat.io/v3/bots/${bot.cometChatBotUid}/messages`
    console.log('Sending response to CometChat API:', url)

    const body = {
      category: 'message',
      type: 'text',
      data: { text: assistantResponse },
      receiver: payload.data.receiver,
      receiverType: payload.data.receiverType.toLowerCase()
    }

    console.log('CometChat request body:', JSON.stringify({
      ...body,
      data: { text: body.data.text.substring(0, 50) + (body.data.text.length > 50 ? '...' : '') }
    }))

    try {
      console.log('Sending request to CometChat API...')
      const cometChatResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'apikey': bot.cometChatApiKey!
        },
        body: JSON.stringify(body)
      })

      if (!cometChatResponse.ok) {
        const errorText = await cometChatResponse.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { rawResponse: errorText }
        }
        
        console.error('CometChat API error:', {
          status: cometChatResponse.status,
          statusText: cometChatResponse.statusText,
          data: errorData
        })
        
        return NextResponse.json({ 
          error: 'Failed to send message via CometChat', 
          details: errorData 
        }, { status: 500 })
      }

      const result = await cometChatResponse.json()
      console.log('Message sent successfully to CometChat:', result)
      
      return NextResponse.json({ 
        status: 'OK', 
        message: 'Assistant response sent successfully',
        result 
      }, { status: 200 })
    } catch (fetchError) {
      console.error('Error sending message to CometChat:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to communicate with CometChat API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 