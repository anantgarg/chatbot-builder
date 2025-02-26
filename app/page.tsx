'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot } from '@prisma/client'
import BotModal from '@/components/BotModal'

interface BotInput {
  name: string
  instruction: string
  assistantId: string | null
  vectorStoreId: string | null
  cometChatEnabled: boolean
  cometChatAppId: string | null
  cometChatRegion: string | null
  cometChatApiKey: string | null
  cometChatBotUid: string | null
}

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    fetchBots()
  }, [])

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots')
      if (!response.ok) {
        throw new Error('Failed to fetch bots')
      }
      const data = await response.json()
      setBots(data)
    } catch (error) {
      console.error('Error fetching bots:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addBot = async (bot: BotInput) => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bot)
      })
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'VECTOR_STORE_NOT_FOUND') {
          setError('The vector store was created but OpenAI could not find it immediately. Please try again in a few seconds.');
        } else if (data.code === 'API_KEY_ERROR') {
          setError('There was an issue with your OpenAI API key. Please check your settings.');
        } else {
          setError(data.error || 'Failed to create bot');
        }
        return;
      }
      
      setBots(prevBots => [data, ...prevBots]);
      setIsCreating(false);
    } catch (error: any) {
      console.error('Failed to create bot:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  const updateBot = async (id: string, updates: Partial<BotInput>) => {
    try {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update bot')
      }

      const updatedBot = await response.json()
      setBots(prevBots => prevBots.map(bot => bot.id === id ? updatedBot : bot))
      setEditingBot(null)
    } catch (error) {
      console.error('Failed to update bot:', error)
      throw error
    }
  }

  const deleteBot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bot? This will also delete its vector store and assistant in OpenAI. This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete bot')
      }

      setBots(prevBots => prevBots.filter(bot => bot.id !== id))
    } catch (error: unknown) {
      console.error('Failed to delete bot:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete bot')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bots</h1>
        <button
          onClick={() => {
            setError(null);
            setIsCreating(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          New Bot
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
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
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading bots...
                </td>
              </tr>
            ) : bots.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No bots found. Create your first bot to get started.
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
                      {new Date(bot.createdAt).toLocaleDateString()}
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
                    <Link
                      href={`/bots/${bot.id}/settings`}
                      className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <Link
                      href={`/bots/${bot.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <span className="sr-only">Edit</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => deleteBot(bot.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <span className="sr-only">Delete</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BotModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSubmit={addBot}
        isSubmitting={isSubmitting}
      />

      <BotModal
        isOpen={!!editingBot}
        onClose={() => setEditingBot(null)}
        onSubmit={(updates) => {
          if (editingBot) {
            updateBot(editingBot.id, updates)
          }
        }}
        initialBot={editingBot || undefined}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
