import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        openaiApiKey: true
      }
    })

    return NextResponse.json(userSettings)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { openaiApiKey } = await request.json()

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { openaiApiKey },
      select: {
        id: true,
        openaiApiKey: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 