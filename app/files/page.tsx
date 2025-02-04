'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, LinkIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

interface FileData {
  id: string
  fileId: string
  filename: string
  bytes: number
  createdAt: string
  purpose: string
  associatedBots: {
    id: string
    name: string
  }[]
}

interface Bot {
  id: string
  name: string
  vectorStoreId: string | null
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileData[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBots, setSelectedBots] = useState<string[]>([])
  const [associatingFile, setAssociatingFile] = useState<string | null>(null)
  const [isAssociating, setIsAssociating] = useState(false)

  useEffect(() => {
    fetchFiles()
    fetchBots()
  }, [])

  const fetchFiles = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/files')
      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }
      const data = await response.json()
      setFiles(data)
    } catch (err: unknown) {
      console.error('Error fetching files:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch files')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots')
      if (!response.ok) {
        throw new Error('Failed to fetch bots')
      }
      const data = await response.json()
      setBots(data)
    } catch (err: unknown) {
      console.error('Error fetching bots:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch bots')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      // Refresh the file list
      await fetchFiles()
    } catch (err: unknown) {
      console.error('Error uploading file:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    }
  }

  const handleAssociateClick = async (fileId: string) => {
    setAssociatingFile(fileId)
    setSelectedBots([])
    
    try {
      // Fetch currently associated bots
      const response = await fetch(`/api/files/associate?fileId=${fileId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch associated bots')
      }
      const data = await response.json()
      setSelectedBots(data.associatedBotIds || [])
    } catch (err: unknown) {
      console.error('Error fetching associated bots:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch associated bots')
    }
  }

  const handleAssociateSubmit = async () => {
    if (!associatingFile) return

    setIsAssociating(true)
    try {
      // Get currently associated bots to determine which ones to remove
      const response = await fetch(`/api/files/associate?fileId=${associatingFile}`)
      if (!response.ok) {
        throw new Error('Failed to fetch associated bots')
      }
      const data = await response.json()
      const currentBotIds = data.associatedBotIds || []

      // Find bots to remove (ones that were unchecked)
      const botsToRemove = currentBotIds.filter((id: string) => !selectedBots.includes(id))

      // If there are bots to remove, call the DELETE endpoint
      if (botsToRemove.length > 0) {
        const removeResponse = await fetch('/api/files/associate', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: associatingFile,
            botIds: botsToRemove,
          }),
        })

        if (!removeResponse.ok) {
          throw new Error('Failed to remove file associations')
        }
      }

      // If there are bots to add, call the POST endpoint
      const botsToAdd = selectedBots.filter(id => !currentBotIds.includes(id))
      if (botsToAdd.length > 0) {
        const addResponse = await fetch('/api/files/associate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: associatingFile,
            botIds: botsToAdd,
          }),
        })

        if (!addResponse.ok) {
          throw new Error('Failed to add file associations')
        }
      }

      // Close modal and refresh files
      setAssociatingFile(null)
      await fetchFiles()
    } catch (err: unknown) {
      console.error('Error updating file associations:', err)
      setError(err instanceof Error ? err.message : 'Failed to update file associations')
    } finally {
      setIsAssociating(false)
    }
  }

  const handleRemoveAssociations = async (fileId: string, botIds?: string[]) => {
    try {
      const response = await fetch('/api/files/associate', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          botIds
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove associations')
      }

      // Refresh the file list
      await fetchFiles()
    } catch (err: unknown) {
      console.error('Error removing associations:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove associations')
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      // Refresh the file list
      await fetchFiles()
    } catch (err: unknown) {
      console.error('Error deleting file:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return <div className="p-6">Loading files...</div>
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Files</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all files uploaded to your OpenAI account.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <label
            htmlFor="file-upload"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Upload File
          </label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Filename
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Purpose
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Size
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Created At
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {file.filename}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {file.purpose}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatBytes(file.bytes)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatDate(file.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleAssociateClick(file.fileId)}
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                          >
                            <LinkIcon className="h-5 w-5 mr-1" />
                            Associate
                          </button>
                          {file.associatedBots.length > 0 && (
                            <>
                              <span className="text-gray-500">
                                ({file.associatedBots.length} bot{file.associatedBots.length !== 1 ? 's' : ''})
                              </span>
                              <button
                                onClick={() => handleRemoveAssociations(file.fileId)}
                                className="inline-flex items-center text-red-600 hover:text-red-900"
                              >
                                <XMarkIcon className="h-5 w-5 mr-1" />
                                Remove All
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteFile(file.fileId)}
                            className="inline-flex items-center text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Associate Modal */}
      {associatingFile && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Associate File with Bots</h3>
            <div className="space-y-4">
              {bots.map((bot) => (
                <label key={bot.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedBots.includes(bot.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBots([...selectedBots, bot.id])
                      } else {
                        setSelectedBots(selectedBots.filter(id => id !== bot.id))
                      }
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-900">{bot.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setAssociatingFile(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssociateSubmit}
                disabled={selectedBots.length === 0 || isAssociating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isAssociating ? 'Associating...' : 'Associate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 