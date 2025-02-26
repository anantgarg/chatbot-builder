import { prisma } from '../lib/prisma'
import * as bcrypt from 'bcryptjs'

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: 'test@test.com'
      }
    })

    if (existingUser) {
      console.log('Test user already exists')
      return
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('test', 10)

    // Create the user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@test.com',
        password: hashedPassword
      }
    })

    console.log('Test user created successfully:', user)
  } catch (error) {
    console.error('Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser() 