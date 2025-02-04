'use client'

import { useEffect, useState } from 'react'
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

export default function UploadPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchBots()
  }, [])

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots')
      const data = await response.json()
      setBots(data)
    } catch (error) {
      console.error('Failed to fetch bots:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBotId || !file) return

    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('botId', selectedBotId)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      setMessage('File uploaded successfully')
    } catch (error) {
      console.error('File upload error:', error)
      setMessage('Failed to upload file')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">Upload Files</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Upload File
            </label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-gray-900"
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading || !selectedBotId || !file}
              className="w-full"
            >
              {isLoading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </form>

        {message && (
          <div className="mt-6 text-center text-sm text-gray-700">
            {message}
          </div>
        )}
      </div>
    </div>
  )
} 