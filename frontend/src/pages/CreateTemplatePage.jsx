import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import TemplateBuilder from '../components/templates/TemplateBuilder'
import WhatsAppPreview from '../components/templates/WhatsAppPreview'
import PageHeader from '../components/layout/PageHeader'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Alert,
  LoadingState,
  Select,
  toast
} from '../components/ui'
import { SecondaryAction } from '../components/ui/ActionButtons'
import { Sparkles, MessageSquare, Globe } from 'lucide-react'

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
      const errorMsg = 'Template name is required'
      setError(errorMsg)
      toast({
        title: 'Validation error',
        description: errorMsg,
        variant: 'error'
      })
      return false
    }

    if (!/^[a-z0-9_]+$/.test(templateData.name)) {
      const errorMsg = 'Template name must be lowercase alphanumeric with underscores only'
      setError(errorMsg)
      toast({
        title: 'Invalid template name',
        description: errorMsg,
        variant: 'error'
      })
      return false
    }

    if (!templateData.components.BODY?.text?.trim()) {
      const errorMsg = 'Template body is required'
      setError(errorMsg)
      toast({
        title: 'Validation error',
        description: errorMsg,
        variant: 'error'
      })
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
      toast({
        title: 'Template created',
        description: 'Your template has been created and submitted to Meta for approval',
        variant: 'success'
      })
      setTimeout(() => {
        navigate('/templates')
      }, 2000)
    } catch (err) {
      console.error('Create error:', err)
      const errorMsg = err.message || 'Failed to create template. Please try again.'
      setError(errorMsg)
      toast({
        title: 'Failed to create template',
        description: errorMsg,
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell hideTitleBlock>
        <LoadingState message="Creating template..." />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <PageHeader
          icon={Sparkles}
          title="Create WhatsApp template"
          description="Design your message template. It will be submitted to Meta for approval."
          helper="Use lowercase names + underscores"
          actions={
            <SecondaryAction onClick={() => navigate('/templates')}>
              Back to templates
            </SecondaryAction>
          }
        />

        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Card variant="glass" className="space-y-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary-500" />
                  <CardTitle>Template details</CardTitle>
                </div>
                <CardDescription>Name, language, and category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Lowercase letters, numbers, and underscores only
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      id="language"
                      value={templateData.language}
                      onChange={(e) =>
                        setTemplateData({ ...templateData, language: e.target.value })
                      }
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
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      id="category"
                      value={templateData.category}
                      onChange={(e) =>
                        setTemplateData({ ...templateData, category: e.target.value })
                      }
                      disabled={loading}
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="space-y-4">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary-500" />
                  <CardTitle>Components</CardTitle>
                </div>
                <CardDescription>Build the message body, headers, and buttons.</CardDescription>
              </CardHeader>
              <CardContent>
                <TemplateBuilder
                  components={templateData.components}
                  onChange={handleComponentsChange}
                  disabled={loading}
                />
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-3">
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
              >
                {loading ? 'Creating...' : 'Create template'}
              </Button>
            </div>
          </div>

          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-500" />
                <CardTitle>Preview</CardTitle>
              </div>
              <CardDescription>Live preview of how the template renders in WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WhatsAppPreview components={templateData.components} />
            </CardContent>
          </Card>
        </form>
      </div>
    </AppShell>
  )
}

export default CreateTemplatePage
