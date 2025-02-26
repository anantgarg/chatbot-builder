'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const router = useRouter()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/user/settings')
        if (!response.ok) {
          throw new Error('Failed to fetch settings')
        }
        const data = await response.json()
        setOpenaiApiKey(data.openaiApiKey || '')
      } catch (error) {
        console.error('Error fetching settings:', error)
        setMessage({ type: 'error', text: 'Failed to load settings' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ openaiApiKey }),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      setMessage({ type: 'success', text: 'Settings updated successfully' })
      router.refresh()
    } catch (error) {
      console.error('Error updating settings:', error)
      setMessage({ type: 'error', text: 'Failed to update settings' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Settings</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">API Keys</h2>
        
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700">
                OpenAI API Key
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  id="openaiApiKey"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Your OpenAI API key will be used for all your bots. Get one from{' '}
                <a 
                  href="https://platform.openai.com/account/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  OpenAI&apos;s dashboard
                </a>.
              </p>
            </div>

            {message.text && (
              <div className={`p-3 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
} 