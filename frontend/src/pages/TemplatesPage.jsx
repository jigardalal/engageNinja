import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  LoadingState,
  ErrorState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui'

/**
 * Templates Page
 * List and manage WhatsApp templates
 */
export const TemplatesPage = ({ embedded = false } = {}) => {
  const navigate = useNavigate()
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

  const Shell = ({ children }) => (embedded ? <>{children}</> : <AppShell>{children}</AppShell>)

  useEffect(() => {
    fetchTemplates()
  }, [filters])

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

      setShowDeleteDialog(false)
      setSelectedTemplate(null)
      await fetchTemplates()
    } catch (err) {
      console.error('Delete error:', err)
      setDeleteError(err.message || 'Failed to delete template')
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
      setShowVersionDialog(false)
      setSelectedTemplate(null)
      navigate(`/templates/create?versionOf=${data.id}`)
    } catch (err) {
      console.error('Version error:', err)
      setVersionError(err.message || 'Failed to create version')
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

  if (loading && !templates.length) {
    return (
      <Shell>
        <LoadingState message="Loading templates..." />
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)]">WhatsApp Templates</h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage your WhatsApp message templates. {templates.length} template{templates.length !== 1 ? 's' : ''} found.
            </p>
          </div>
          <Button onClick={() => navigate('/templates/create')}>
            ✨ Create Template
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text)]">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-[var(--border)] rounded-md p-2 text-sm bg-[var(--input-bg)] text-[var(--text)]"
                >
                  <option value="">All Statuses</option>
                  <option value="APPROVED">✅ Approved</option>
                  <option value="PENDING">⏳ Pending</option>
                  <option value="REJECTED">❌ Rejected</option>
                  <option value="PAUSED">⏸️ Paused</option>
                </select>
              </div>

              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text)]">Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  className="w-full border border-[var(--border)] rounded-md p-2 text-sm bg-[var(--input-bg)] text-[var(--text)]"
                >
                  <option value="">All Languages</option>
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

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text)]">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full border border-[var(--border)] rounded-md p-2 text-sm bg-[var(--input-bg)] text-[var(--text)]"
                >
                  <option value="">All Categories</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card>
          {templates.length === 0 ? (
            <CardContent className="p-8 text-center">
              <p className="text-[var(--text-muted)] mb-4">No templates found</p>
              <Button onClick={() => navigate('/templates/create')} variant="outline">
                Create your first template
              </Button>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Variables</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{getStatusBadge(template.status)}</TableCell>
                      <TableCell>{getLanguageLabel(template.language)}</TableCell>
                      <TableCell>{getCategoryLabel(template.category)}</TableCell>
                      <TableCell className="text-right text-sm text-[var(--text-muted)]">
                        {template.variable_count || 0}
                      </TableCell>
                      <TableCell className="text-right text-sm text-[var(--text-muted)]">
                        {template.updated_at
                          ? new Date(template.updated_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/templates/${template.id}`)}
                          >
                            👁️ View
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
                              📋 Version
                            </Button>
                          )}

                          {template.status !== 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/templates/${template.id}/edit`)}
                            >
                              ✏️ Edit
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
                            🗑️ Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
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
