# Chatbot Builder

A platform for creating and managing AI-powered chatbots with OpenAI integration and optional CometChat support.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- OpenAI API key with billing set up
- Git installed

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatbot-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   ```

   Now open `.env` and update the following values:
   - `OPENAI_API_KEY`: Your OpenAI API key from https://platform.openai.com/account/api-keys
   - `JWT_SECRET`: A secure random string for JWT token signing
   - (Optional) CometChat credentials if you plan to use chat integration

4. **Initialize the database**
   ```bash
   # Run Prisma migrations
   npx prisma migrate dev
   ```

5. **Create a test user** (optional)
   ```bash
   # This will create a user with email: test@test.com and password: test
   npm run create-test-user
   ```

## Running the Project

1. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Log in with your credentials (or use test@test.com if you created the test user)

## Features

- Create and manage multiple chatbots
- OpenAI integration for AI-powered responses
- File upload and management
- Vector store for improved response accuracy
- Optional CometChat integration for real-time chat
- Secure authentication system

## Environment Variables

- `DATABASE_URL`: SQLite database path (default: "./prisma/dev.db")
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `JWT_SECRET`: Secret key for JWT tokens (required)
- `COMETCHAT_APP_ID`: CometChat App ID (optional)
- `COMETCHAT_API_KEY`: CometChat API Key (optional)
- `COMETCHAT_REGION`: CometChat Region (optional)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
