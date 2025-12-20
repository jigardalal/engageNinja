import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import WhatsAppPreview from '../components/templates/WhatsAppPreview'
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, Badge, LoadingState, ErrorState } from '../components/ui'

/**
 * Template Detail Page
 * View a specific template and its preview
 */
export const TemplateDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTemplate()
  }, [id])

  const fetchTemplate = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/templates/${id}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 404) {
          throw new Error('Template not found.')
        }

        if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.')
        }

        throw new Error(data.message || 'Failed to fetch template')
      }

      const data = await response.json()
      setTemplate(data.data || data.template || data)
    } catch (err) {
      console.error('Fetch template error:', err)
      setError(err.message || 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading template..." />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <ErrorState message={error} />
      </AppShell>
    )
  }

  if (!template) {
    return (
      <AppShell>
        <ErrorState message="Template not found" />
      </AppShell>
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      APPROVED: 'success',
      PENDING: 'warning',
      REJECTED: 'destructive',
      PAUSED: 'secondary',
      draft: 'secondary'
    }
    return colors[status] || 'secondary'
  }

  const getLanguageLabel = (code) => {
    const languages = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      pt: 'Portuguese',
      de: 'German',
      it: 'Italian',
      ja: 'Japanese',
      zh: 'Chinese'
    }
    return languages[code] || code
  }

  const getCategoryLabel = (category) => {
    const categories = {
      MARKETING: '📢 Marketing',
      UTILITY: '⚙️ Utility',
      AUTHENTICATION: '🔐 Authentication'
    }
    return categories[category] || category
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)]">{template.name}</h1>
            <p className="text-[var(--text-muted)] mt-1">Template Details</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/templates')}>
            ← Back to Templates
          </Button>
        </div>

        {/* Template Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[var(--text-muted)] mb-1">Status</p>
              <Badge variant={getStatusColor(template.status)}>
                {template.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[var(--text-muted)] mb-1">Language</p>
              <p className="text-lg font-semibold text-[var(--text)]">
                {getLanguageLabel(template.language)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[var(--text-muted)] mb-1">Category</p>
              <p className="text-lg font-semibold text-[var(--text)]">
                {getCategoryLabel(template.category)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[var(--text-muted)] mb-1">Variables</p>
              <p className="text-lg font-semibold text-[var(--text)]">
                {template.variable_count || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <WhatsAppPreview template={template} />
          </CardContent>
        </Card>

        {/* Template Details */}
        {(template.body || template.body_template) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Message Body</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text)] whitespace-pre-wrap">
                {template.body || template.body_template}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Created</p>
                <p className="text-[var(--text)]">
                  {template.created_at ? new Date(template.created_at).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Updated</p>
                <p className="text-[var(--text)]">
                  {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : '-'}
                </p>
              </div>
              {template.meta_template_id && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Meta Template ID</p>
                  <p className="text-[var(--text)] font-mono text-xs">{template.meta_template_id}</p>
                </div>
              )}
              {template.waba_id && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">WABA ID</p>
                  <p className="text-[var(--text)] font-mono text-xs">{template.waba_id}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate('/templates')}>
            Back to Templates
          </Button>
          {template.status !== 'APPROVED' && (
            <Button onClick={() => navigate(`/templates/${template.id}/edit`)}>
              Edit Template
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default TemplateDetailPage
