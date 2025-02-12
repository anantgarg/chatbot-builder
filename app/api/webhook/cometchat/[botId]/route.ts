import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'

// Mark this route as public
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
  try {
    const { botId } = await context.params;
    const payload: WebhookPayload = await request.json()
    
    console.log('Received webhook for bot:', botId)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    // Verify this is a message event
    if (payload.trigger !== 'after_message') {
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 })
    }

    // Fetch bot's details including CometChat and OpenAI configuration
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        cometChatAppId: true,
        cometChatApiKey: true,
        cometChatRegion: true,
        cometChatBotUid: true,
        assistantId: true
      }
    })

    console.log('Bot configuration found:', {
      botId,
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
        error: 'Bot configuration not found', 
        missingConfigs 
      }, { status: 404 })
    }

    // Check if the message is from the bot itself
    if (payload.data.sender === bot.cometChatBotUid) {
      console.log('Ignoring message from bot itself')
      return NextResponse.json({ 
        status: 'OK', 
        message: 'Ignored message from bot itself'
      }, { status: 200 })
    }

    // Get or create OpenAI thread based on CometChat conversation ID
    let thread
    try {
      // Try to retrieve existing thread
      thread = await openai.beta.threads.retrieve(payload.data.conversationId)
      console.log('Retrieved existing thread:', thread.id)
    } catch {
      // Create new thread if it doesn't exist
      thread = await openai.beta.threads.create()
      console.log('Created new thread:', thread.id)
    }

    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: payload.data.data.text
    })

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: bot.assistantId
    })

    // Wait for completion
    let response = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    while (response.status === 'in_progress' || response.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      response = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    }

    if (response.status !== 'completed') {
      console.error('Run failed:', response)
      return NextResponse.json({ error: 'Failed to get response from assistant' }, { status: 500 })
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id)
    const lastMessage = messages.data[0]

    if (!lastMessage || !lastMessage.content[0] || lastMessage.content[0].type !== 'text') {
      return NextResponse.json({ error: 'No response received from assistant' }, { status: 500 })
    }

    const assistantResponse = lastMessage.content[0].text.value

    // Send the assistant's response back through CometChat
    const url = `https://${bot.cometChatAppId}.api-${bot.cometChatRegion}.cometchat.io/v3/bots/${bot.cometChatBotUid}/messages`

    const body = {
      category: 'message',
      type: 'text',
      data: { text: assistantResponse },
      receiver: payload.data.receiver,
      receiverType: payload.data.receiverType.toLowerCase()
    }

    const cometChatResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'apikey': bot.cometChatApiKey
      },
      body: JSON.stringify(body)
    })

    if (!cometChatResponse.ok) {
      const errorData = await cometChatResponse.json()
      console.error('CometChat API error:', errorData)
      return NextResponse.json({ error: 'Failed to send message via CometChat' }, { status: 500 })
    }

    const result = await cometChatResponse.json()
    console.log('Message sent successfully:', result)
    
    return NextResponse.json({ 
      status: 'OK', 
      message: 'Assistant response sent successfully',
      result 
    }, { status: 200 })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 