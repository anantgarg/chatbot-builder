'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot } from '@prisma/client'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import BotModal from '@/components/BotModal'

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
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

  const addBot = async (bot: Omit<Bot, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: bot.name,
          instruction: bot.instruction,
          assistantId: null,
          vectorStoreId: null,
          cometChatEnabled: false,
          cometChatAppId: null,
          cometChatRegion: null,
          cometChatApiKey: null,
          cometChatBotUid: null
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create bot')
      }
      
      const newBot = await response.json()
      setBots(prevBots => [newBot, ...prevBots])
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create bot:', error)
      throw error
    }
  }

  const updateBot = async (id: string, updates: Partial<Bot>) => {
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
    } catch (error: any) {
      console.error('Failed to delete bot:', error)
      alert(error.message || 'Failed to delete bot')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bots</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          New Bot
        </button>
      </div>

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
      />
    </div>
  )
}
