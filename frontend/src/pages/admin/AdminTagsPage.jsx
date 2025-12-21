import React, { useEffect, useState } from 'react'
import { Tag as TagIcon } from 'lucide-react'
import AdminPageLayout from '../../components/layout/AdminPageLayout'
import {
  Input,
  Button,
  Badge,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LoadingState,
  EmptyState,
  PrimaryAction
} from '../../components/ui'

export const AdminTagsPage = () => {
  const [tags, setTags] = useState([])
  const [drafts, setDrafts] = useState({})
  const [newTag, setNewTag] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    fetchTags()
  }, [statusFilter])

  const fetchTags = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const qs = params.toString()
      const res = await fetch(`/api/admin/global-tags${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load tags')
      const data = await res.json()
      const tagList = Array.isArray(data.tags) ? data.tags : []
      setTags(tagList)
      const map = {}
      tagList.forEach((t) => {
        map[t.id] = { name: t.name, status: t.status }
      })
      setDrafts(map)
    } catch (err) {
      console.error('AdminTagsPage fetchTags error', err)
      const rawMessage = err && typeof err.message === 'string' ? err.message : ''
      const normalized = rawMessage === '{} is not a function' ? '' : rawMessage
      setError(normalized || 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTag.trim()) return
    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/admin/global-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newTag.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tag')
      }
      setNewTag('')
      await fetchTags()
    } catch (err) {
      console.error('AdminTagsPage create tag error', err)
      setError(err.message || 'Failed to create tag')
    } finally {
      setCreating(false)
    }
  }

  const handleSave = async (tagId) => {
    const draft = drafts[tagId]
    if (!draft) return
    try {
      setSavingId(tagId)
      setError(null)
      const res = await fetch(`/api/admin/global-tags/${tagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: draft.name, status: draft.status })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update tag')
      }
      await fetchTags()
    } catch (err) {
      console.error('AdminTagsPage save tag error', err)
      setError(err.message || 'Failed to update tag')
    } finally {
      setSavingId(null)
    }
  }

  const updateDraft = (tagId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [tagId]: {
        ...prev[tagId],
        ...patch
      }
    }))
  }

  const statusBadge = (status) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  if (error && tags.length === 0 && !loading) {
    // Keep showing layout even if error occurs, so we can update filters
  }

  return (
    <AdminPageLayout
      shellTitle="Admin — Global Tags"
      shellSubtitle="Manage platform-wide default tags"
      hero={{
        icon: TagIcon,
        description: 'Update default tags that appear across every tenant workspace.',
        helper: 'Create new tags or edit status without leaving this panel.',
        actions: (
          <PrimaryAction onClick={fetchTags} disabled={loading}>
            Refresh tags
          </PrimaryAction>
        )
      }}
    >
      <Card variant="glass">
        <CardHeader>
          <div>
            <CardTitle>Status filter</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Show active or archived tags.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <div>
            <CardTitle>Create a tag</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Tags can be applied to contacts and campaigns.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[1fr,auto]">
            <div>
              <label className="text-sm font-medium text-[var(--text)]">New tag name</label>
              <Input
                type="text"
                placeholder="e.g., VIP"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                disabled={creating}
              />
            </div>
            <Button type="submit" disabled={creating || !newTag.trim()}>
              {creating ? 'Creating...' : 'Create tag'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert type="error" title="Error" className="w-full">
          {error}
        </Alert>
      )}

      <Card variant="glass">
        <CardHeader>
          <div>
            <CardTitle>Global tag list</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Edit names and statuses inline.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading tags..." />
          ) : tags.length === 0 ? (
            <EmptyState
              title="No tags yet"
              description="Create one to get started."
              icon={TagIcon}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <Input
                          value={drafts[tag.id]?.name || ''}
                          onChange={(e) => updateDraft(tag.id, { name: e.target.value })}
                          className="min-w-[220px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <select
                            value={drafts[tag.id]?.status || 'active'}
                            onChange={(e) => updateDraft(tag.id, { status: e.target.value })}
                            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                          </select>
                          <Badge className={`${statusBadge(drafts[tag.id]?.status || tag.status)} text-xs font-semibold`}>
                            {drafts[tag.id]?.status || tag.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-muted)]">
                        {new Date(tag.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleSave(tag.id)} disabled={savingId === tag.id}>
                          {savingId === tag.id ? 'Saving...' : 'Save'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}

export default AdminTagsPage
