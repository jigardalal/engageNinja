import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import TemplateBuilder from '../components/templates/TemplateBuilder'
import WhatsAppPreview from '../components/templates/WhatsAppPreview'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
  LoadingState
} from '../components/ui'

/**
 * Create Template Page
 * Form to create new WhatsApp templates with live preview
 */
export const CreateTemplatePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [templateData, setTemplateData] = useState({
    name: '',
    language: 'en',
    category: 'MARKETING',
    components: {
      HEADER: null,
      BODY: { type: 'BODY', text: '', example: { body_text: [[]] } },
      FOOTER: null,
      BUTTONS: null
    }
  })

  const handleNameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setTemplateData({ ...templateData, name: value })
  }

  const handleComponentsChange = (components) => {
    setTemplateData({ ...templateData, components })
  }

  const validateTemplate = () => {
    if (!templateData.name.trim()) {
      setError('Template name is required')
      return false
    }

    if (!/^[a-z0-9_]+$/.test(templateData.name)) {
      setError('Template name must be lowercase alphanumeric with underscores only')
      return false
    }

    if (!templateData.components.BODY?.text?.trim()) {
      setError('Template body is required')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateTemplate()) return

    try {
      setLoading(true)

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateData.name,
          language: templateData.language,
          category: templateData.category,
          components: templateData.components
        })
      })

      if (!response.ok) {
        const data = await response.json()

        // Handle specific error scenarios
        if (response.status === 400) {
          if (data.message?.includes('already exists')) {
            throw new Error('A template with this name already exists. Please choose a different name.')
          }
          if (data.message?.includes('not configured')) {
            throw new Error('WhatsApp channel is not configured. Please go to Settings to connect WhatsApp.')
          }
          throw new Error(data.message || 'Invalid template data. Please check your inputs.')
        }

        if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.')
        }

        if (response.status === 403) {
          throw new Error('You do not have permission to create templates.')
        }

        throw new Error(data.message || 'Failed to create template')
      }

      const result = await response.json()
      setSuccess('Template created successfully! Redirecting...')
      setTimeout(() => {
        navigate('/templates')
      }, 2000)
    } catch (err) {
      console.error('Create error:', err)
      setError(err.message || 'Failed to create template. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Creating template..." />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create WhatsApp Template</h1>
          <p className="text-gray-600 mt-1">
            Design your message template. It will be submitted to Meta for approval.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert variant="success" className="mb-4">
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Builder (Left Column) */}
            <div className="lg:col-span-2">
              {/* Basic Info Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Name */}
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={templateData.name}
                      onChange={handleNameChange}
                      placeholder="order_confirmation"
                      className="mt-1"
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lowercase letters, numbers, and underscores only
                    </p>
                  </div>

                  {/* Language */}
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={templateData.language}
                      onChange={(e) =>
                        setTemplateData({ ...templateData, language: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-2 mt-1"
                      disabled={loading}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="pt">Portuguese</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      value={templateData.category}
                      onChange={(e) =>
                        setTemplateData({ ...templateData, category: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-2 mt-1"
                      disabled={loading}
                    >
                      <option value="MARKETING">📢 Marketing</option>
                      <option value="UTILITY">⚙️ Utility</option>
                      <option value="AUTHENTICATION">🔐 Authentication</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Components Builder */}
              <TemplateBuilder
                components={templateData.components}
                onChange={handleComponentsChange}
                disabled={loading}
              />

              {/* Action Buttons */}
              <div className="flex justify-between gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/templates')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !templateData.name.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Creating...' : '✨ Create Template'}
                </Button>
              </div>
            </div>

            {/* Preview (Right Column) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <WhatsAppPreview components={templateData.components} />
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  )
}

export default CreateTemplatePage
