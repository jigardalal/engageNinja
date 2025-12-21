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
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  LoadingState,
  ErrorState
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Tag, Filter, Columns } from 'lucide-react'
import { PrimaryAction } from '../components/ui/ActionButtons'

const statusBadgeClass = (status) => {
  if (status === 'archived') return 'bg-gray-100 text-gray-800'
  return 'bg-green-100 text-green-800'
}

const filterOptions = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All tags' }
]

export default function TagsPage({ embedded = false } = {}) {
  const { userRole } = useAuth()
  const canManage = ['admin', 'owner'].includes(userRole)
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/contacts/tags/list?include_archived=1', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load tags')
      }
      setTags(data.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

  const handleSaveTag = useCallback(
    async (tagId, name, status) => {
      if (!canManage) return
      try {
        setSavingId(tagId)
        setError(null)
        const res = await fetch(`/api/contacts/tags/${tagId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, status })
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update tag')
        }
        setTags((prev) =>
          prev.map((tag) =>
            tag.id === tagId
              ? { ...tag, name: data.name, status: data.status }
              : tag
          )
        )
      } catch (err) {
        setError(err.message)
      } finally {
        setSavingId(null)
      }
    },
    [canManage]
  )

  const visibleTags = useMemo(() => {
    return tags.filter((tag) => {
      if (statusFilter === 'all') return true
      return (tag.status || 'active') === statusFilter
    })
  }, [tags, statusFilter])

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

  const Shell = ({ children }) => (
    embedded ? <>{children}</> : (
      <AppShell title="Tags" subtitle="Manage tags for this workspace">
        {children}
      </AppShell>
    )
  )

  return (
    <Shell>
      <PageHeader
        icon={Tag}
        title="Tag management"
        description="Create, archive, and edit tags that keep your campaigns organized."
        helper={canManage ? 'Admins can edit tags. Others can view status.' : 'Contact an admin to update tags.'}
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
            <CardDescription>
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

        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Columns className="h-5 w-5 text-primary-500" />
              <CardTitle>Workspace tags</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {error && <ErrorState title="Something went wrong" description={error} />}
            {loading ? (
              <LoadingState message="Loading tags..." />
            ) : visibleTags.length === 0 ? (
              <EmptyState
                title="No tags"
                description="No tags match the current filter."
                icon={Tag}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTags.map((tag) => (
                    <TagRow
                      key={tag.id}
                      tag={tag}
                      canManage={canManage}
                      savingId={savingId}
                      onSave={handleSaveTag}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="text-xs text-[var(--text-muted)]">
            Tags are shared across campaigns and contacts, so changes ripple instantly.
          </CardFooter>
        </Card>
      </div>
    </Shell>
  )
}

const TagRow = React.memo(({ tag, canManage, savingId, onSave }) => {
  const [name, setName] = useState(tag.name)
  const [status, setStatus] = useState(tag.status || 'active')

  useEffect(() => {
    setName(tag.name)
    setStatus(tag.status || 'active')
  }, [tag.id, tag.name, tag.status])

  const trimmedName = name.trim()
  const isSaving = savingId === tag.id

  return (
    <TableRow className="hover:bg-black/3 transition">
      <TableCell>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            disabled={!canManage}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <Badge className={`${statusBadgeClass(status)} text-xs font-semibold`}>{status}</Badge>
        </div>
      </TableCell>
      <TableCell>
        {tag.is_default ? (
          <Badge className="bg-blue-100 text-blue-800 text-xs font-semibold">Default</Badge>
        ) : (
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Editable</span>
        )}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          disabled={!canManage || isSaving || trimmedName.length === 0}
          onClick={() => onSave(tag.id, trimmedName, status)}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </TableCell>
    </TableRow>
  )
})
