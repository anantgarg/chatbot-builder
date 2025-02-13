'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import IntegrationsModal from '@/components/IntegrationsModal'
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline'

interface IntegrationData {
  cometChatEnabled: boolean
  cometChatAppId?: string
  cometChatRegion?: string
  cometChatApiKey?: string
  cometChatBotUid?: string
}

export default function BotSettingsPage() {
  const params = useParams()
  const botId = params?.id as string
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false)
  const [integrationData, setIntegrationData] = useState<IntegrationData>({
    cometChatEnabled: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!botId) return

    const fetchIntegrationSettings = async () => {
      try {
        const response = await fetch(`/api/bots/${botId}/integrations`)
        if (!response.ok) {
          throw new Error('Failed to fetch integration settings')
        }
        const data = await response.json()
        setIntegrationData(data)
      } catch (error) {
        console.error('Error fetching integration settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntegrationSettings()
  }, [botId])

  const handleIntegrationsSubmit = async (data: IntegrationData) => {
    try {
      const response = await fetch(`/api/bots/${botId}/integrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update integrations')
      }

      setIntegrationData(data)
    } catch (error) {
      console.error('Error updating integrations:', error)
      throw error
    }
  }

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhook/cometchat/${botId}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Bot Settings</h1>
      
      {/* General Settings Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">General Settings</h2>
        <p className="text-gray-600 mb-4">
          Configure your bot&apos;s basic settings and behavior
        </p>
        {/* Add general settings here */}
      </div>

      {/* Integrations Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold">Integrations</h2>
            <p className="text-gray-600 mt-1">
              Connect your bot with third-party services to extend its capabilities
            </p>
          </div>
          <button
            onClick={() => setIsIntegrationsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Configure Integrations
          </button>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* CometChat Integration Card */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">CometChat</h3>
                    <p className="text-sm text-gray-500">Real-time chat integration</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    integrationData.cometChatEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {integrationData.cometChatEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              {integrationData.cometChatEnabled && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-medium">App ID</p>
                      <p className="truncate">{integrationData.cometChatAppId}</p>
                    </div>
                    <div>
                      <p className="font-medium">Region</p>
                      <p>{integrationData.cometChatRegion}</p>
                    </div>
                    <div>
                      <p className="font-medium">Bot UID</p>
                      <p className="truncate">{integrationData.cometChatBotUid}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="font-medium text-sm text-gray-600 mb-2">Webhook URL</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-50 rounded text-sm break-all">
                        {webhookUrl}
                      </code>
                      <button
                        onClick={copyToClipboard}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <CheckIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ClipboardIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use this URL in your CometChat dashboard to configure the webhook
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        onSubmit={handleIntegrationsSubmit}
        initialData={integrationData}
      />
    </div>
  )
} 