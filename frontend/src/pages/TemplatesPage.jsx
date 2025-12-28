import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
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
  ErrorState,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DataTable,
  SkeletonTable,
  Select,
  toast
} from '../components/ui'
import PageHeader from '../components/layout/PageHeader'
import { PrimaryAction } from '../components/ui/ActionButtons'
import { Layers, Filter, Sparkles, BookOpen, ArrowUpDown } from 'lucide-react'

/**
 * Templates Page
 * List and manage WhatsApp templates
 */
export const TemplatesPage = ({ embedded = false } = {}) => {
  const navigate = useNavigate()
  const { activeTenant } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    language: '',
    category: ''
  })
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showVersionDialog, setShowVersionDialog] = useState(false)
  const [versionLoading, setVersionLoading] = useState(false)
  const [versionError, setVersionError] = useState('')

  const Shell = ({ children }) => (embedded ? <>{children}</> : <AppShell hideTitleBlock>{children}</AppShell>)

  useEffect(() => {
    if (!activeTenant) {
      return
    }
    fetchTemplates()
  }, [activeTenant, filters])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.language) params.append('language', filters.language)
      if (filters.category) params.append('category', filters.category)

      const response = await fetch(`/api/templates?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.')
        }

        if (response.status === 403) {
          throw new Error('You do not have permission to view templates.')
        }

        throw new Error(data.message || 'Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Fetch templates error:', err)
      setError(err.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return

    try {
      setDeleteLoading(true)
      setDeleteError('')

      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 404) {
          throw new Error('Template not found. It may have already been deleted.')
        }

        if (response.status === 400) {
          if (data.message?.includes('not configured')) {
            throw new Error('WhatsApp channel is not configured. Cannot delete template.')
          }
        }

        throw new Error(data.message || 'Failed to delete template')
      }

      toast({
        title: 'Template deleted',
        description: `${selectedTemplate.name} has been deleted`,
        variant: 'success'
      })
      setShowDeleteDialog(false)
      setSelectedTemplate(null)
      await fetchTemplates()
    } catch (err) {
      console.error('Delete error:', err)
      const errorMsg = err.message || 'Failed to delete template'
      setDeleteError(errorMsg)
      toast({
        title: 'Failed to delete template',
        description: errorMsg,
        variant: 'error'
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleVersion = async () => {
    if (!selectedTemplate) return

    try {
      setVersionLoading(true)
      setVersionError('')

      const response = await fetch(`/api/templates/${selectedTemplate.id}/duplicate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 404) {
          throw new Error('Template not found. It may have been deleted.')
        }

        if (response.status === 400) {
          if (data.message?.includes('approved')) {
            throw new Error('Only approved templates can be versioned.')
          }
        }

        throw new Error(data.message || 'Failed to create version')
      }

      const data = await response.json()
      toast({
        title: 'Version created',
        description: 'New template version ready for editing',
        variant: 'success'
      })
      setShowVersionDialog(false)
      setSelectedTemplate(null)
      navigate(`/templates/create?versionOf=${data.id}`)
    } catch (err) {
      console.error('Version error:', err)
      const errorMsg = err.message || 'Failed to create version'
      setVersionError(errorMsg)
      toast({
        title: 'Failed to create version',
        description: errorMsg,
        variant: 'error'
      })
    } finally {
      setVersionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      APPROVED: 'success',
      PENDING: 'warning',
      REJECTED: 'danger',
      PAUSED: 'neutral',
      draft: 'neutral'
    }
    return (
      <Badge variant={variants[status] || 'neutral'}>
        {status}
      </Badge>
    )
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

  const totalTemplates = templates.length
  const statusCounts = templates.reduce((acc, template) => {
    acc[template.status] = (acc[template.status] || 0) + 1
    return acc
  }, {})
  const languageCounts = templates.reduce((acc, template) => {
    if (template.language) {
      acc[template.language] = (acc[template.language] || 0) + 1
    }
    return acc
  }, {})
  const categoryCounts = templates.reduce((acc, template) => {
    if (template.category) {
      acc[template.category] = (acc[template.category] || 0) + 1
    }
    return acc
  }, {})

  const sortHeader = (label) => ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] hover:bg-transparent px-0"
    >
      {label}
      <ArrowUpDown className="ml-1 h-4 w-4 text-[var(--text-muted)]" />
    </Button>
  )

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: sortHeader('Name'),
      cell: ({ row }) => (
        <span className="font-medium text-[var(--text)]">{row.getValue('name')}</span>
      )
    },
    {
      accessorKey: 'status',
      header: sortHeader('Status'),
      cell: ({ row }) => getStatusBadge(row.getValue('status'))
    },
    {
      accessorKey: 'language',
      header: sortHeader('Language'),
      cell: ({ row }) => getLanguageLabel(row.getValue('language'))
    },
    {
      accessorKey: 'category',
      header: sortHeader('Category'),
      cell: ({ row }) => getCategoryLabel(row.getValue('category'))
    },
    {
      accessorKey: 'variable_count',
      header: sortHeader('Variables'),
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)]">{row.getValue('variable_count') || 0}</span>
      )
    },
    {
      accessorKey: 'updated_at',
      header: sortHeader('Updated'),
      cell: ({ row }) => {
        const date = row.getValue('updated_at')
        return (
          <span className="text-sm text-[var(--text-muted)]">
            {date ? new Date(date).toLocaleDateString() : '-'}
          </span>
        )
      }
    },
    {
      id: 'actions',
      header: sortHeader('Actions'),
      cell: ({ row }) => {
        const template = row.original
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/templates/${template.id}`)}
            >
              View
            </Button>

            {template.status === 'APPROVED' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTemplate(template)
                  setShowVersionDialog(true)
                }}
              >
                Version
              </Button>
            )}

            {template.status !== 'APPROVED' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/templates/${template.id}/edit`)}
              >
                Edit
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedTemplate(template)
                setShowDeleteDialog(true)
              }}
            >
              Delete
            </Button>
          </div>
        )
      }
    }
  ], [navigate, setSelectedTemplate])

  return (
    <Shell>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <PageHeader
          icon={Layers}
          title="WhatsApp Templates"
          description="Build, version, and manage templates submitted to Meta."
          helper={`${totalTemplates} template${totalTemplates !== 1 ? 's' : ''}`}
          actions={
            <PrimaryAction onClick={() => navigate('/templates/create')}>
              <Sparkles className="h-4 w-4" />
              Create template
            </PrimaryAction>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card variant="glass" className="space-y-5">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-xl md:text-2xl">Template workspace</CardTitle>
              </div>
              <CardDescription>
                Adjust filters and view templates in one workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold tracking-wide text-[var(--text-muted)]">Status</label>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="">All statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PAUSED">Paused</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold tracking-wide text-[var(--text-muted)]">Language</label>
                  <Select
                    value={filters.language}
                    onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  >
                    <option value="">All languages</option>
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
                <div className="space-y-1">
                  <label className="block text-xs font-semibold tracking-wide text-[var(--text-muted)]">Category</label>
                  <Select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">All categories</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </Select>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}

              {loading ? (
                <SkeletonTable rows={5} columns={6} />
              ) : templates.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No templates found"
                  description="Create a template to get started."
                  action={
                    <PrimaryAction onClick={() => navigate('/templates/create')}>
                      Create template
                    </PrimaryAction>
                  }
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={templates}
                />
              )}
            </CardContent>
          </Card>

          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-lg">Insights</CardTitle>
              </div>
              <CardDescription>Top-level counts for quick context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-[var(--text-muted)]">
                <p className="text-xs uppercase tracking-[0.3em]">By status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Badge key={status} variant="primary">{`${status}: ${count}`}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-sm text-[var(--text-muted)]">
                <p className="text-xs uppercase tracking-[0.3em]">Top languages</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(languageCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([lang, count]) => (
                      <Badge key={lang} variant="neutral">
                        <span className="capitalize">{lang}</span>: {count}
                      </Badge>
                    ))}
                </div>
              </div>

              <div className="space-y-2 text-sm text-[var(--text-muted)]">
                <p className="text-xs uppercase tracking-[0.3em]">Category mix</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(categoryCounts).map(([category, count]) => (
                    <Badge key={category} variant="neutral">
                      {category}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive" className="mb-4">
              {deleteError}
            </Alert>
          )}
          <p className="text-[var(--text-muted)] mb-4">
            Are you sure you want to delete <strong className="text-[var(--text)]">{selectedTemplate?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Confirmation Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version?</DialogTitle>
          </DialogHeader>
          {versionError && (
            <Alert variant="destructive" className="mb-4">
              {versionError}
            </Alert>
          )}
          <p className="text-[var(--text-muted)] mb-4">
            Create a new version of <strong className="text-[var(--text)]">{selectedTemplate?.name}</strong>?
            The original template will remain unchanged, and the new version will be ready for editing.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowVersionDialog(false)}
              disabled={versionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVersion}
              disabled={versionLoading}
            >
              {versionLoading ? 'Creating...' : 'Create Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  )
}

export default TemplatesPage
