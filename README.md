# Chatbot Builder

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.1.3-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/OpenAI-API-412991" alt="OpenAI API" />
  <img src="https://img.shields.io/badge/Vercel-Deployment-000000" alt="Vercel" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-336791" alt="PostgreSQL" />
</div>

<br>

A modern platform for creating and managing AI-powered chatbots with OpenAI integration. Build custom chatbots with file-based knowledge and optional CometChat integration for real-time communication.

## ✨ Features

- 🤖 Create and manage multiple AI-powered chatbots
- 📚 Upload files to enhance your bot's knowledge base
- 🔍 Vector search for accurate and contextual responses
- 💬 Optional CometChat integration for real-time chat capabilities
- 🔒 Secure user authentication system
- 🔑 User-specific OpenAI API keys for privacy and billing control

## 🚀 Deployment on Vercel

### Prerequisites

- [Vercel account](https://vercel.com/signup)
- [GitHub account](https://github.com/signup)
- [OpenAI API key](https://platform.openai.com/account/api-keys) with billing set up
- [PostgreSQL database](https://vercel.com/docs/storage/vercel-postgres) (recommended: Vercel Postgres)

### One-Click Deploy

Deploy directly to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fchatbot-builder)

### Manual Deployment Steps

1. **Fork the repository**
   
   Fork this repository to your GitHub account.

2. **Create a new Vercel project**
   
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your forked repository
   
3. **Configure environment variables**
   
   Add the following environment variables in the Vercel project settings:
   
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A secure random string for JWT token signing (generate with `openssl rand -hex 32`)

4. **Set up the database**
   
   - Create a PostgreSQL database (recommended: use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres))
   - The database schema will be automatically applied during the first deployment

5. **Deploy**
   
   Click "Deploy" and wait for the build to complete.

## 💻 Local Development

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git installed
- PostgreSQL database

### Setup Instructions

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

   Update the `.env` file with your values:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A secure random string for JWT token signing

4. **Initialize the database**
   ```bash
   # Run Prisma migrations
   npx prisma migrate deploy
   ```

5. **Create a test user** (optional)
   ```bash
   # This will create a user with email: test@test.com and password: test
   npm run create-test-user
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Log in with your credentials (or use test@test.com if you created the test user)

## 🔑 API Key Management

This application uses user-specific OpenAI API keys:

- Each user provides their own OpenAI API key in the settings page
- API keys are securely stored in the database
- The OpenAI client is created on-demand for each request using the user's API key
- No global API key is required for deployment

## 📦 Project Structure

```
chatbot-builder/
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── bots/             # Bot management pages
│   ├── files/            # File management pages
│   └── settings/         # User settings page
├── components/           # React components
├── lib/                  # Utility functions
├── prisma/               # Database schema and migrations
└── public/               # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
