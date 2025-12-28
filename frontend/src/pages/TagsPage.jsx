import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Input,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ErrorState,
  DataTable,
  Select
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Tag, Filter, ArrowUpDown } from 'lucide-react'
import { PrimaryAction } from '../components/ui/ActionButtons'

const statusBadgeClass = (status) => {
  if (status === 'archived') return 'bg-gray-100 text-gray-800'
  return 'bg-green-100 text-green-800'
}

export default function TagsPage({ embedded = false } = {}) {
  const { userRole } = useAuth()
  const canManage = ['admin', 'owner'].includes(userRole)
  const [tags, setTags] = useState([])
  const [drafts, setDrafts] = useState({})
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState(null)

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/contacts/tags/list?include_archived=1', {
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load tags')
      }
      const tagList = data.data || []
      setTags(tagList)
      const map = {}
      tagList.forEach((tag) => {
        map[tag.id] = { name: tag.name, status: tag.status || 'active' }
      })
      setDrafts(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!canManage || !newTag.trim()) return
    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/contacts/tags', {
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
      setError(err.message)
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

  const handleSaveTag = useCallback(
    async (tagId) => {
      if (!canManage) return
      const draft = drafts[tagId]
      if (!draft || !draft.name.trim()) return
      const trimmedName = draft.name.trim()
      const existingTag = tags.find((tag) => tag.id === tagId) || {}
      try {
        setSavingId(tagId)
        setError(null)
        const res = await fetch(`/api/contacts/tags/${tagId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: trimmedName, status: draft.status })
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update tag')
        }
        const updatedTag = {
          ...existingTag,
          name: data.name || trimmedName,
          status: data.status || draft.status
        }
        setTags((prev) =>
          prev.map((tag) => (tag.id === tagId ? updatedTag : tag))
        )
        setDrafts((prev) => ({
          ...prev,
          [tagId]: {
            name: updatedTag.name,
            status: updatedTag.status
          }
        }))
      } catch (err) {
        setError(err.message)
      } finally {
        setSavingId(null)
      }
    },
    [canManage, drafts, tags]
  )

  const stats = useMemo(() => {
    return tags.reduce(
      (acc, tag) => {
        const status = tag.status || 'active'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      { active: 0, archived: 0 }
    )
  }, [tags])

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
              value={draft.name}
              onChange={(e) => updateDraft(tag.id, { name: e.target.value })}
              disabled={!canManage}
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
                disabled={!canManage}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
              <Badge className={`${statusBadgeClass(draft.status)} text-xs font-semibold`}>
                {draft.status}
              </Badge>
            </div>
          )
        }
      },
      {
        id: 'flags',
        header: sortHeader('Flags'),
        cell: ({ row }) =>
          row.original.is_default ? (
            <Badge className="bg-blue-100 text-blue-800 text-xs font-semibold">Default</Badge>
          ) : (
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Editable</span>
          )
      },
      {
        id: 'actions',
        header: sortHeader('Actions'),
        cell: ({ row }) => {
          const tag = row.original
          const draft = drafts[tag.id] || { name: tag.name, status: tag.status || 'active' }
          return (
            <Button
              size="sm"
              onClick={() => handleSaveTag(tag.id)}
              disabled={!canManage || savingId === tag.id || !draft.name.trim()}
            >
              {savingId === tag.id ? 'Saving...' : 'Save'}
            </Button>
          )
        }
      }
    ]
  }, [drafts, savingId, updateDraft, handleSaveTag, canManage])

  const Shell = ({ children }) =>
    embedded ? (
      <>{children}</>
    ) : (
      <AppShell hideTitleBlock title="Tags" subtitle="Manage tags for this workspace">
        {children}
      </AppShell>
    )

  return (
    <Shell>
      <PageHeader
        icon={Tag}
        title="Tag management"
        description="Create, archive, and edit tags that keep your campaigns organized."
        helper={
          canManage
            ? 'Admins can edit tags. Others can view status.'
            : 'Contact an admin to update tags.'
        }
        actions={
          <PrimaryAction asChild>
            <Link to="/contacts">Go to contacts</Link>
          </PrimaryAction>
        }
      />

      <div className="grid gap-6 mt-6">
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary-500" />
              <CardTitle>Filters & creation</CardTitle>
            </div>
            <CardDescription className="text-[var(--text-muted)]">
              {stats.active} active · {stats.archived} archived.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[1.2fr,auto]">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">New tag name</label>
                <Input
                  type="text"
                  placeholder="e.g., VIP"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  disabled={!canManage || creating}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={!canManage || creating || !newTag.trim()}>
                  {creating ? 'Creating...' : 'Create tag'}
                </Button>
              </div>
            </form>
            {!canManage && (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Only tenant owners and admins can create or edit tags.
              </p>
            )}
          </CardContent>
        </Card>

        {error && <ErrorState title="Something went wrong" description={error} />}

        <DataTable
          title="Workspace tags"
          description="Create or archive tags that organize campaigns and contacts."
          columns={columns}
        data={tags}
          loading={loading}
          loadingMessage="Loading tags..."
          emptyIcon={Tag}
          emptyTitle="No tags"
          emptyDescription="Try changing the filter or create a new tag."
          searchPlaceholder="Search tags..."
          enableSelection={false}
        />
        <p className="text-xs text-[var(--text-muted)]">
          Tags are shared across campaigns and contacts, so changes ripple instantly.
        </p>
      </div>
    </Shell>
  )
}
