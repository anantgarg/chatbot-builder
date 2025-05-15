'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BotModal from '@/components/BotModal'

interface Bot {
  id: string
  name: string
  instruction: string
  createdAt: Date
  updatedAt: Date
  userId: string
  assistantId: string | null
  vectorStoreId: string | null
  cometChatEnabled: boolean
  cometChatAppId: string | null
  cometChatRegion: string | null
  cometChatApiKey: string | null
  cometChatBotUid: string | null
}

interface BotResponse {
  id: string
  name: string
  instruction: string
  createdAt: string
  updatedAt: string
  userId: string
  assistantId: string | null
  vectorStoreId: string | null
  cometChatEnabled: boolean
  cometChatAppId: string | null
  cometChatRegion: string | null
  cometChatApiKey: string | null
  cometChatBotUid: string | null
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBot, setCurrentBot] = useState<Bot | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchBots()
  }, [])

  const fetchBots = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bots')
      if (!response.ok) {
        throw new Error('Failed to fetch bots')
      }
      const data = await response.json()
      // Convert string dates to Date objects
      const botsWithDates = data.map((bot: BotResponse) => ({
        ...bot,
        createdAt: new Date(bot.createdAt),
        updatedAt: new Date(bot.updatedAt)
      }))
      setBots(botsWithDates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEditBot = (bot: Bot) => {
    setCurrentBot(bot)
    setIsModalOpen(true)
  }

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot?')) {
      return
    }

    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete bot')
      }

      // Refresh the bots list
      fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleSubmitBot = async (botData: {
    name: string
    instruction: string
    assistantId: string | null
    vectorStoreId: string | null
    cometChatEnabled: boolean
    cometChatAppId: string | null
    cometChatRegion: string | null
    cometChatApiKey: string | null
    cometChatBotUid: string | null
  }) => {
    try {
      setIsSubmitting(true)
      
      if (currentBot) {
        // Update existing bot
        const response = await fetch(`/api/bots/${currentBot.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: botData.name,
            instruction: botData.instruction,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update bot')
        }
      } else {
        // Create new bot
        const response = await fetch('/api/bots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(botData)
        })
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create bot');
        }
      }

      // Refresh the bots list
      fetchBots()
      setIsModalOpen(false)
      setIsCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateModal = () => {
    setCurrentBot(undefined)
    setIsCreating(true)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bots</h1>
        <button 
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          New Bot
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instruction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : bots.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center">
                  No bots found. Create your first bot!
                </td>
              </tr>
            ) : (
              bots.map((bot) => (
                <tr key={bot.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{bot.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{bot.instruction}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {bot.createdAt.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link
                      href={`/bots/${bot.id}/settings#integrations`}
                      className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Integrations
                    </Link>
                    <button
                      onClick={() => handleEditBot(bot)}
                      className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBot(bot.id)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BotModal
        isOpen={isModalOpen || isCreating}
        onClose={() => {
          setIsModalOpen(false)
          setIsCreating(false)
          setCurrentBot(undefined)
        }}
        onSubmit={handleSubmitBot}
        initialBot={currentBot}
        isSubmitting={isSubmitting}
      />
    </div>
  )
} 