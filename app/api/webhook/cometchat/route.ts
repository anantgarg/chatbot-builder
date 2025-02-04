import { NextResponse } from 'next/server'

interface EntityInfo {
  entity: {
    [key: string]: any
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

export async function POST(request: Request) {
  try {
    const payload: WebhookPayload = await request.json()
    
    // Verify this is a message event
    if (payload.trigger !== 'after_message') {
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 })
    }

    // Here you can process the message
    // For now, we'll just log it and return OK
    console.log('Received message:', payload.data.data.text)
    console.log('From:', payload.data.data.entities.sender.entity.name)
    console.log('To:', payload.data.data.entities.receiver.entity.name)

    return NextResponse.json({ status: 'OK' }, { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 