import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  EmptyState
} from '../components/ui'
import { PrimaryAction, SecondaryAction, GhostAction } from '../components/ui/ActionButtons'
import PageHeader from '../components/layout/PageHeader'
import { Users, Tag, Search, FilePlus, Download, UserPlus } from 'lucide-react'

/**
 * Contacts Page
 * List and manage contacts for the current tenant
 */
export const ContactsPage = () => {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [availableTags, setAvailableTags] = useState([])
  const [allTags, setAllTags] = useState([])
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

      const tags = new Set()
      const contactList = data.contacts || []
      contactList.forEach(contact => {
        const contactTags = contact.tags || []
        contactTags.forEach(tag => tags.add(tag))
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
    <AppShell title="Contacts" subtitle="Manage your customer contacts and segment with tags">
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="Contacts workspace"
          description="Search, filter, and act on the people you message most."
          helper={`${availableTags.length} tag${availableTags.length === 1 ? '' : 's'} • ${contacts.length} contacts`}
          actions={
            <div className="flex flex-wrap gap-3">
              <PrimaryAction onClick={() => setShowCreateModal(true)}>
                <UserPlus className="h-4 w-4" />
                <span>Create contact</span>
              </PrimaryAction>
              <SecondaryAction onClick={() => setShowImportModal(true)}>
                <FilePlus className="h-4 w-4" />
                <span>Import CSV</span>
              </SecondaryAction>
              <SecondaryAction onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
                <span>Export</span>
              </SecondaryAction>
            </div>
          }
        />

        {error && <Alert variant="error">{error}</Alert>}

        <div className="space-y-6">
          <Card variant="glass" className="space-y-4 w-full">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Contacts list</CardTitle>
                  <CardDescription>Use tags and filters to find the right audience.</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {availableTags.length} tags
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="searchTerm">
                    <span className="flex items-center gap-1">
                      <Search className="h-4 w-4 text-[var(--text-muted)]" />
                      Search
                    </span>
                  </Label>
                  <Input
                    id="searchTerm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Name, phone, or email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1">
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
                <div className="flex items-center justify-end gap-3">
                  <SecondaryAction
                    onClick={() => setShowBulkTagModal(true)}
                    disabled={selectedContactIds.length === 0}
                  >
                    + Add tags
                  </SecondaryAction>
                  <GhostAction
                    onClick={handleBulkDelete}
                    disabled={selectedContactIds.length === 0}
                  >
                    Delete selected
                  </GhostAction>
                </div>
              </div>

              {loading ? (
                <LoadingState message="Loading contacts..." />
              ) : contacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No contacts yet"
                  description="Add the first contact or import a CSV to get started."
                  action={
                    <PrimaryAction onClick={() => setShowCreateModal(true)}>
                      Create contact
                    </PrimaryAction>
                  }
                />
              ) : (
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
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card variant="glass" className="space-y-3">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  <Tag className="h-4 w-4 text-primary-500" />
                  Tag insights
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Total tags</p>
                    <p className="text-2xl font-bold text-[var(--text)]">{availableTags.length}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] p-3">
                    <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Selection</p>
                    <p className="text-2xl font-bold text-[var(--text)]">{selectedContactIds.length}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Bulk readiness</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Select contacts to reveal bulk tag/delete actions. Filters keep the list manageable.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="space-y-3">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  <Users className="h-4 w-4 text-primary-500" />
                  Contact health
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-primary-50/40 to-transparent p-3">
                  <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Audience size</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{contacts.length}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    Consent badges show opt-in status. Use filters to isolate WhatsApp or Email-ready contacts.
                  </p>
                </div>
                <SecondaryAction onClick={() => setShowBulkTagModal(true)}>
                  Add tags to selection
                </SecondaryAction>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
