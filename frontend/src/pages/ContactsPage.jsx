import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CreateContactModal } from '../components/CreateContactModal'
import { CSVImportModal } from '../components/CSVImportModal'
import AppShell from '../components/layout/AppShell'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  Badge,
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  LoadingState,
  ErrorState
} from '../components/ui'

/**
 * Contacts Page
 * List and manage contacts for the current tenant
 */
export const ContactsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [availableTags, setAvailableTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState([])
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [bulkTagSelection, setBulkTagSelection] = useState([])
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkTagError, setBulkTagError] = useState('')
  const [bulkDeleteError, setBulkDeleteError] = useState('')

  useEffect(() => {
    fetchContacts()
    fetchTags()
  }, [searchTerm, selectedTag])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      setError('')

      let url = '/api/contacts?limit=50&offset=0'
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`
      }
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`
      }

      const response = await fetch(url, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      setContacts(data.contacts || [])
      setPagination(data.pagination || {})

      const tags = new Set()
      ;(data.contacts || []).forEach(contact => {
        ;(contact.tags || []).forEach(tag => tags.add(tag))
      })
      setAvailableTags(Array.from(tags).sort())
      setSelectedContactIds([])
      setSelectAllChecked(false)
    } catch (err) {
      console.error('Fetch contacts error:', err)
      setError(err.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/contacts/tags/list', { credentials: 'include' })
      if (!response.ok) return
      const data = await response.json()
      const tags = data.data || []
      setAllTags(tags)
      if (tags.length > 0 && availableTags.length === 0) {
        setAvailableTags(tags.map(t => t.name))
      }
    } catch (err) {
      console.error('Fetch tags error:', err)
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/contacts/export', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to export contacts')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export contacts')
    }
  }

  const toggleSelect = (id) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedContactIds([])
      setSelectAllChecked(false)
    } else {
      const ids = contacts.map(c => c.id)
      setSelectedContactIds(ids)
      setSelectAllChecked(true)
    }
  }

  const toggleBulkTag = (tagId) => {
    setBulkTagSelection(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const handleBulkAddTags = async () => {
    setBulkTagError('')
    if (bulkTagSelection.length === 0 || selectedContactIds.length === 0) return
    try {
      const response = await fetch('/api/contacts/bulk/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contact_ids: selectedContactIds,
          tag_ids: bulkTagSelection
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add tags')
      }
      await fetchContacts()
      setShowBulkTagModal(false)
      setBulkTagSelection([])
      setBulkTagError('')
    } catch (err) {
      console.error('Bulk tag error', err)
      setBulkTagError(err.message || 'Failed to add tags')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedContactIds.length === 0) return
    setShowBulkDeleteModal(true)
    setBulkDeleteError('')
  }

  const handleBulkDeleteConfirm = async () => {
    try {
      const response = await fetch('/api/contacts/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contact_ids: selectedContactIds })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete contacts')
      }
      await fetchContacts()
      setSelectedContactIds([])
      setSelectAllChecked(false)
      setShowBulkDeleteModal(false)
      setBulkDeleteError('')
    } catch (err) {
      console.error('Bulk delete error', err)
      setBulkDeleteError(err.message || 'Failed to delete contacts')
    }
  }

  return (
    <AppShell
      title="Contacts"
      subtitle="Manage your customer contacts and segment with tags"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            ⬆ Import CSV
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            ⬇ Export CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowBulkTagModal(true)}
            disabled={selectedContactIds.length === 0}
          >
            + Add Tags (bulk)
          </Button>
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedContactIds.length === 0}
          >
            Delete Selected
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>+ New Contact</Button>
        </div>
      }
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search contacts or filter by tags</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 space-y-0">
          <div className="flex-1 space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11"
            />
          </div>

          {availableTags.length > 0 && (
            <div className="flex-1 space-y-2">
              <Label htmlFor="tags">Tag</Label>
              <select
                id="tags"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <option value="">All Tags</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <ErrorState
          title="Unable to load contacts"
          description={error}
          onRetry={fetchContacts}
          retryLabel="Retry"
          className="mb-6"
        />
      )}

      {loading && <LoadingState message="Loading contacts..." />}

      {!loading && contacts.length === 0 && (
        <Card className="text-center">
          <CardContent className="space-y-3">
            <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <h3 className="text-lg font-medium text-[var(--text)]">No contacts found</h3>
            <p className="text-[var(--text-muted)]">Get started by creating your first contact</p>
            <Button onClick={() => setShowCreateModal(true)}>Create Contact</Button>
          </CardContent>
        </Card>
      )}

      {!loading && contacts.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={selectAllChecked}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Consent</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map(contact => (
              <TableRow key={contact.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedContactIds.includes(contact.id)}
                    onChange={() => toggleSelect(contact.id)}
                    aria-label={`Select ${contact.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-[var(--text)]">{contact.name}</div>
                  <div className="text-sm text-[var(--text-muted)]">{contact.phone}</div>
                </TableCell>
                <TableCell className="text-sm text-[var(--text)]">{contact.phone || '-'}</TableCell>
                <TableCell className="text-sm text-[var(--text)]">{contact.email || '-'}</TableCell>
                <TableCell>
                  {(contact.tags || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag, index) => (
                        <Badge key={index} variant="primary">{tag}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)] text-sm">No tags</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {contact.consent_whatsapp && <Badge variant="success">WhatsApp</Badge>}
                    {contact.consent_email && <Badge variant="primary">Email</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm font-semibold text-primary-600">
                  <button
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                    className="hover:underline"
                  >
                    View
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateContactModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchContacts}
        availableTags={allTags}
      />

      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={fetchContacts}
      />

      <Dialog
        open={showBulkTagModal}
        onClose={() => setShowBulkTagModal(false)}
        title="Add Tags to Selected Contacts"
        description={`Selected ${selectedContactIds.length} contact(s)`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkTagModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAddTags} disabled={bulkTagSelection.length === 0}>
              Add Tags
            </Button>
          </>
        }
      >
        {bulkTagError && <Alert variant="error" className="mb-3">{bulkTagError}</Alert>}
        {bulkTagSelection.length === 0 && (
          <Alert variant="warning" className="mb-3">
            Choose at least one tag to add.
          </Alert>
        )}
        {allTags.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No tags available.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allTags.map(tag => (
              <label key={tag.id} className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={bulkTagSelection.includes(tag.id)}
                  onChange={() => toggleBulkTag(tag.id)}
                  className="h-4 w-4"
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        )}
      </Dialog>

      <Dialog
        open={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Selected Contacts"
        description={`This will delete ${selectedContactIds.length} contact(s) and their messages.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDeleteConfirm}>
              Delete
            </Button>
          </>
        }
      >
        {bulkDeleteError && <Alert variant="error" className="mb-3">{bulkDeleteError}</Alert>}
        <p className="text-sm text-[var(--text-muted)]">
          This action cannot be undone.
        </p>
      </Dialog>
    </AppShell>
  )
}

export default ContactsPage
