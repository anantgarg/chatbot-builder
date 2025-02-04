'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Bot {
  id: string
  name: string
  instruction: string
  createdAt: string
}

interface BotTesterProps {
  bots: Bot[]
}

export default function BotTester({ bots }: BotTesterProps) {
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBotId || !message) return

    setIsLoading(true)
    setError(null)
    setResponse(null)
    
    try {
      const res = await fetch(`/api/bots/${selectedBotId}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from bot')
      }
      
      setResponse(data.response)
    } catch (error) {
      console.error('Failed to invoke bot:', error)
      setError(error instanceof Error ? error.message : 'Failed to get response from bot')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="bot" className="block text-sm font-medium text-gray-700">
            Select Bot
          </label>
          <Select value={selectedBotId} onValueChange={setSelectedBotId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select a bot..." />
            </SelectTrigger>
            <SelectContent>
              {bots.map((bot) => (
                <SelectItem key={bot.id} value={bot.id}>
                  {bot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <div className="mt-2">
            <textarea
              id="message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Enter your message here..."
              required
            />
          </div>
        </div>

        <div>
          <Button
            type="submit"
            disabled={isLoading || !selectedBotId || !message}
            className="w-full"
          >
            {isLoading ? 'Getting Response...' : 'Send Message'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-6">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {response && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Response:</h3>
          <div className="rounded-md bg-gray-50 p-4">
            <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
              {response}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
} 