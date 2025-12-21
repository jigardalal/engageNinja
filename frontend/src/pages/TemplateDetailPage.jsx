import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import WhatsAppPreview from '../components/templates/WhatsAppPreview'
import PageHeader from '../components/layout/PageHeader'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  Badge,
  LoadingState,
  ErrorState
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { MessageSquare, BookOpen, Clock, Layers } from 'lucide-react'

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
      REJECTED: 'danger',
      PAUSED: 'neutral',
      draft: 'neutral'
    }
    return colors[status] || 'neutral'
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

  const headerHelper = `${getLanguageLabel(template.language)} • ${getCategoryLabel(template.category)}`
  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {template.status === 'APPROVED' ? (
        <PrimaryAction onClick={() => navigate(`/templates/create?versionOf=${template.id}`)}>
          Create version
        </PrimaryAction>
      ) : (
        <PrimaryAction onClick={() => navigate(`/templates/${template.id}/edit`)}>
          Edit template
        </PrimaryAction>
      )}
      <SecondaryAction onClick={() => navigate('/templates')}>
        Back to templates
      </SecondaryAction>
    </div>
  )

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <PageHeader
          icon={MessageSquare}
          title={template.name}
          description="Template Details"
          helper={headerHelper}
          meta={<Badge variant={getStatusColor(template.status)}>{template.status}</Badge>}
          actions={headerActions}
        />

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card variant="glass" className="space-y-6">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-xl md:text-2xl">Template workspace</CardTitle>
              </div>
              <CardDescription>Preview, message content, and core metadata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[var(--text-muted)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Language</p>
                  <p className="font-semibold text-[var(--text)]">{getLanguageLabel(template.language)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Category</p>
                  <p className="font-semibold text-[var(--text)]">{getCategoryLabel(template.category)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Variables</p>
                  <p className="font-semibold text-[var(--text)]">{template.variable_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Approved</p>
                  <p className="font-semibold text-[var(--text)]">
                    {template.status === 'APPROVED' ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  <BookOpen className="h-4 w-4 text-primary-500" />
                  <span>Live preview</span>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-inner dark:bg-slate-900/70">
                  <WhatsAppPreview template={template} />
                </div>
              </div>

              {(template.body || template.body_template) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    <BookOpen className="h-4 w-4 text-primary-500" />
                    <span>Message body</span>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/80 p-4 font-mono text-sm text-[var(--text)] shadow-inner dark:bg-slate-900/70 whitespace-pre-wrap">
                    {template.body || template.body_template}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass" className="space-y-4">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-lg">Metadata</CardTitle>
              </div>
              <CardDescription>Created, updated, and identifiers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[var(--text-muted)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Created</p>
                  <p className="text-[var(--text)]">
                    {template.created_at ? new Date(template.created_at).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Updated</p>
                  <p className="text-[var(--text)]">
                    {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
              {template.meta_template_id && (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">Meta template ID</p>
                  <p className="font-mono text-xs text-[var(--text)]">{template.meta_template_id}</p>
                </div>
              )}
              {template.waba_id && (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">WABA ID</p>
                  <p className="font-mono text-xs text-[var(--text)]">{template.waba_id}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default TemplateDetailPage
