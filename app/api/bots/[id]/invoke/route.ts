import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const bot = await prisma.bot.findUnique({
      where: {
        id,
        userId: payload.userId as string
      }
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    if (!bot.assistantId) {
      return NextResponse.json({ error: 'Bot has no assistant ID' }, { status: 400 });
    }

    const body = await request.json();
    const { message, threadId } = body;

    if (!message || !threadId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let thread;
    try {
      thread = await openai.beta.threads.retrieve(threadId);
    } catch {
      thread = await openai.beta.threads.create();
    }

    await openai.beta.threads.messages.create(thread.id!, { role: 'user', content: message });

    const run = await openai.beta.threads.runs.create(thread.id!, { assistant_id: bot.assistantId });

    let response = await openai.beta.threads.runs.retrieve(thread.id!, run.id);
    while (response.status === 'in_progress' || response.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      response = await openai.beta.threads.runs.retrieve(thread.id!, run.id);
    }

    if (response.status !== 'completed') {
      console.error('Run failed:', response);
      return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
    }

    const messages = await openai.beta.threads.messages.list(thread.id!);
    const lastMessage = messages.data[0];

    if (!lastMessage || !lastMessage.content[0] || lastMessage.content[0].type !== 'text') {
      return NextResponse.json({ error: 'No response received' }, { status: 500 });
    }

    return NextResponse.json({ 
      response: lastMessage.content[0].text.value,
      threadId: thread.id
    });
  } catch (error) {
    console.error('Error invoking bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 