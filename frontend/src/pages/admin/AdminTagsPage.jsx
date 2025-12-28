import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Tag as TagIcon, ArrowUpDown } from 'lucide-react'
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
  PrimaryAction,
  DataTable,
  Select,
  toast
} from '../../components/ui'

const statusBadge = (status) => {
  return status === 'active'
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800'
}

export const AdminTagsPage = () => {
  const [tags, setTags] = useState([])
  const [drafts, setDrafts] = useState({})
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState(null)

  const initializeDrafts = useCallback((tagList) => {
    const map = {}
    tagList.forEach((tag) => {
      map[tag.id] = { name: tag.name, status: tag.status || 'active' }
    })
    setDrafts(map)
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      const qs = params.toString()
      const res = await fetch(`/api/admin/global-tags${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load tags')
      const data = await res.json()
      const tagList = Array.isArray(data.tags) ? data.tags : []
      setTags(tagList)
      initializeDrafts(tagList)
    } catch (err) {
      console.error('AdminTagsPage fetchTags error', err)
      const rawMessage = err && typeof err.message === 'string' ? err.message : ''
      const normalized = rawMessage === '{} is not a function' ? '' : rawMessage
      setError(normalized || 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }, [initializeDrafts])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

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
      toast({
        title: 'Tag created',
        description: `Global tag "${newTag}" has been created`,
        variant: 'success'
      })
      setNewTag('')
      await fetchTags()
    } catch (err) {
      console.error('AdminTagsPage create tag error', err)
      const errorMsg = err.message || 'Failed to create tag'
      setError(errorMsg)
      toast({
        title: 'Failed to create tag',
        description: errorMsg,
        variant: 'error'
      })
    } finally {
      setCreating(false)
    }
  }

  const updateDraft = useCallback((tagId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [tagId]: {
        ...prev[tagId],
        ...patch
      }
    }))
  }, [])

  const handleSave = useCallback(
    async (tag) => {
      const draft = drafts[tag.id]
      if (!draft) return
      try {
        setSavingId(tag.id)
        setError(null)
        const res = await fetch(`/api/admin/global-tags/${tag.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: draft.name, status: draft.status })
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update tag')
        }
        toast({
          title: 'Tag updated',
          description: `Global tag "${draft.name}" has been updated`,
          variant: 'success'
        })
        await fetchTags()
      } catch (err) {
        console.error('AdminTagsPage save tag error', err)
        const errorMsg = err.message || 'Failed to update tag'
        setError(errorMsg)
        toast({
          title: 'Failed to update tag',
          description: errorMsg,
          variant: 'error'
        })
      } finally {
        setSavingId(null)
      }
    },
    [drafts, fetchTags]
  )

  const columns = useMemo(() => {
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

    return [
      {
        accessorKey: 'name',
        header: sortHeader('Name'),
        cell: ({ row }) => {
          const tag = row.original
          const draft = drafts[tag.id] || { name: tag.name, status: tag.status || 'active' }
          return (
            <Input
              value={draft.name || ''}
              onChange={(e) => updateDraft(tag.id, { name: e.target.value })}
              className="min-w-[220px]"
            />
          )
        }
      },
      {
        id: 'status',
        header: sortHeader('Status'),
        accessorFn: (tag) => drafts[tag.id]?.status || tag.status || 'active',
        cell: ({ row }) => {
          const tag = row.original
          const draft = drafts[tag.id] || { name: tag.name, status: tag.status || 'active' }
          return (
            <div className="flex items-center gap-2">
              <Select
                value={draft.status}
                onChange={(e) => updateDraft(tag.id, { status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
              <Badge className={`${statusBadge(draft.status)} text-xs font-semibold`}>
                {draft.status}
              </Badge>
            </div>
          )
        }
      },
      {
        accessorKey: 'created_at',
        header: sortHeader('Created'),
        cell: ({ row }) => (
          <p className="text-sm text-[var(--text-muted)]">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString()
              : '—'}
          </p>
        )
      },
      {
        id: 'actions',
        header: sortHeader('Actions'),
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSave(row.original.id)}
            disabled={savingId === row.original.id}
          >
            {savingId === row.original.id ? 'Saving...' : 'Save'}
          </Button>
        )
      }
    ]
  }, [drafts, savingId, updateDraft, handleSave])

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

      <DataTable
        title="Global tag list"
        description="Edit names and statuses inline."
        columns={columns}
        data={tags}
        loading={loading}
        loadingMessage="Loading tags..."
        emptyIcon={TagIcon}
        emptyTitle="No tags yet"
        emptyDescription="Create one to get started."
        searchPlaceholder="Search tags..."
        enableSelection={false}
      />
      <p className="text-xs text-[var(--text-muted)] mt-2">
        Tags are shared across campaigns and contacts, so changes ripple instantly.
      </p>
    </AdminPageLayout>
  )
}

export default AdminTagsPage
