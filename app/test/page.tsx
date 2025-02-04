'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Bot {
  id: string
  name: string
  instruction: string
  assistantId: string | null
  userId: string
}

export default function TestPage() {
  const router = useRouter()
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBot, setSelectedBot] = useState('')
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadId, setThreadId] = useState('default')

  const fetchBots = useCallback(async () => {
    try {
      const response = await fetch('/api/bots')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch bots')
      }
      const data = await response.json()
      setBots(data)
    } catch (err: unknown) {
      console.error('Error fetching bots:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch bots')
    }
  }, [router])

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBot || !message.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/bots/${selectedBot}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          threadId
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      setResponse(data.response)
      setMessage('')
    } catch (err: unknown) {
      console.error('Error getting response:', err)
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Test Your Bots</h1>
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="bot" className="text-sm font-medium">Select Bot</label>
          <select 
            id="bot" 
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="border rounded-md p-2"
          >
            <option value="">Select a bot...</option>
            {bots.map(bot => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="thread" className="text-sm font-medium">Thread</label>
          <input 
            type="text" 
            id="thread" 
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            className="border rounded-md p-2"
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="message" className="text-sm font-medium">Message</label>
            <textarea 
              id="message" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4} 
              className="border rounded-md p-2"
              placeholder="Enter your message here..."
            />
          </div>
          <button 
            type="submit"
            disabled={!selectedBot || !message.trim() || isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
      {error && (
        <div className="mt-6 p-4 border rounded-md bg-red-50 text-red-700">
          <h2 className="text-lg font-medium mb-2">Error</h2>
          <div>{error}</div>
        </div>
      )}
      {response && (
        <div className="mt-6 p-4 border rounded-md">
          <h2 className="text-lg font-medium mb-2">Response</h2>
          <div className="whitespace-pre-wrap">{response}</div>
        </div>
      )}
    </div>
  )
} 