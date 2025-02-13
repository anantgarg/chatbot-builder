import { useState } from 'react'

interface IntegrationsModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: IntegrationData) => Promise<void>
  initialData?: IntegrationData
  botId: string
}

interface IntegrationData {
  cometChatEnabled: boolean
  cometChatAppId?: string
  cometChatRegion?: string
  cometChatApiKey?: string
  cometChatBotUid?: string
}

export default function IntegrationsModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  botId
}: IntegrationsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<IntegrationData>(initialData || {
    cometChatEnabled: false,
    cometChatAppId: '',
    cometChatRegion: '',
    cometChatApiKey: '',
    cometChatBotUid: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Failed to update integrations:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bot Integrations</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.cometChatEnabled}
                onChange={(e) => setFormData({
                  ...formData,
                  cometChatEnabled: e.target.checked
                })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-gray-900">Enable CometChat Integration</span>
            </label>
          </div>

          {formData.cometChatEnabled && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  App ID
                </label>
                <input
                  type="text"
                  value={formData.cometChatAppId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cometChatAppId: e.target.value
                  })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  App Region
                </label>
                <input
                  type="text"
                  value={formData.cometChatRegion || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cometChatRegion: e.target.value
                  })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  API Key
                </label>
                <input
                  type="password"
                  value={formData.cometChatApiKey || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cometChatApiKey: e.target.value
                  })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bot UID
                </label>
                <input
                  type="text"
                  value={formData.cometChatBotUid || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cometChatBotUid: e.target.value
                  })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 