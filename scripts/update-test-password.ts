const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function updateTestPassword() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('test', 10)

    // Update the user's password
    const updatedUser = await prisma.user.update({
      where: {
        email: 'test@test.com'
      },
      data: {
        password: hashedPassword
      }
    })

    console.log('Password updated successfully for user:', updatedUser.email)
  } catch (error) {
    console.error('Error updating password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateTestPassword() 