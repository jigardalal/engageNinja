import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CreateContactModal } from '../components/CreateContactModal'
import { CSVImportModal } from '../components/CSVImportModal'
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
  Dialog,
  DataTable,
  toast
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import PageHeader from '../components/layout/PageHeader'
import {
  Users,
  Tag,
  FilePlus,
  Download,
  UserPlus,
  ArrowUpDown,
  Check,
  X as XIcon,
  Edit,
  Trash2
} from 'lucide-react'
import { StatRow, SectionDivider } from '../components/ui'

/**
 * Contacts Page
 * List and manage contacts for the current tenant
 */
export const ContactsPage = () => {
  const navigate = useNavigate()
  const { activeTenant } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [availableTags, setAvailableTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [bulkTagSelection, setBulkTagSelection] = useState([])
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkTagError, setBulkTagError] = useState('')
  const [bulkDeleteError, setBulkDeleteError] = useState('')
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [contactToDelete, setContactToDelete] = useState(null)

  useEffect(() => {
    if (!activeTenant) {
      return
    }
    fetchContacts()
    fetchTags()
  }, [activeTenant, searchTerm, selectedTag])

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
    } catch (err) {
      console.error('Fetch contacts error:', err)
      const errorMsg = err.message || 'Failed to load contacts'
      setError(errorMsg)
      toast({
        title: 'Failed to load contacts',
        description: errorMsg,
        variant: 'error'
      })
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

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent px-0 font-semibold"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const name = row.getValue('name') || 'Unnamed contact'
        const initial = name.charAt(0).toUpperCase() || '?'
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <span className="text-sm font-medium text-primary">{initial}</span>
            </div>
            <span className="font-medium">{name}</span>
          </div>
        )
      },
      enableHiding: true
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent px-0 font-semibold"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.getValue('email') || '-'}</span>
      ),
      enableHiding: true
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent px-0 font-semibold"
        >
          Phone
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('phone') || '-'}</span>
      ),
      enableHiding: true
    },
    {
      accessorKey: 'consent_whatsapp',
      header: 'WhatsApp',
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue('consent_whatsapp') ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              <span className="text-xs">Opted in</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <XIcon className="h-4 w-4" />
              <span className="text-xs">Opted out</span>
            </div>
          )}
        </div>
      ),
      enableHiding: true
    },
    {
      accessorKey: 'consent_email',
      header: 'Email Consent',
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue('consent_email') ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              <span className="text-xs">Opted in</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <XIcon className="h-4 w-4" />
              <span className="text-xs">Opted out</span>
            </div>
          )}
        </div>
      ),
      enableHiding: true
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.getValue('tags') || []
        if (tags.length === 0) {
          return <span className="text-xs text-muted-foreground">No tags</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs font-normal bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-white/20">
                {tag}
              </Badge>
            ))}
          </div>
        )
      },
      enableHiding: true
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent px-0 font-semibold"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return (
          <span className="text-sm text-muted-foreground">
            {date.toLocaleDateString()}
          </span>
        )
      },
      enableHiding: true
    }
  ], [navigate])

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

      toast({
        title: 'Contacts exported',
        description: 'Your contacts have been downloaded as CSV',
        variant: 'success'
      })
    } catch (err) {
      console.error('Export error:', err)
      const errorMsg = err.message || 'Failed to export contacts'
      setError(errorMsg)
      toast({
        title: 'Export failed',
        description: errorMsg,
        variant: 'error'
      })
    }
  }

  const handleDeleteContact = (contact) => {
    setContactToDelete(contact)
    setShowDeleteConfirmDialog(true)
  }

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return

    try {
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete contact')
      }

      toast({
        title: 'Contact deleted',
        description: `${contactToDelete.name} has been removed from your contacts`,
        variant: 'success'
      })

      setShowDeleteConfirmDialog(false)
      setContactToDelete(null)
      fetchContacts()
    } catch (err) {
      console.error('Delete contact error:', err)
      toast({
        title: 'Failed to delete contact',
        description: err.message || 'Please try again',
        variant: 'error'
      })
    }
  }

  const rowActions = useMemo(() => [
    {
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: (contact) => {
        navigate(`/contacts/${contact.id}`)
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (contact) => {
        handleDeleteContact(contact)
      },
      variant: 'destructive'
    }
  ], [])

  return (
    <AppShell
      title="Contacts"
      subtitle=""
      hideFooter
      hideTitleBlock
    >
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="Contacts"
          description="Manage your contact list and their communication preferences."
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

        <div className="space-y-6">
          {error && <Alert variant="error">{error}</Alert>}

          <DataTable
            columns={columns}
            data={contacts}
            title="All Contacts"
            description="Manage your contact list and their communication preferences."
            searchPlaceholder="Search contacts..."
            loading={loading}
            rowActions={rowActions}
            emptyIcon={Users}
            emptyTitle="No contacts yet"
            emptyDescription="Add the first contact or import a CSV to get started."
            emptyAction={
              <PrimaryAction onClick={() => setShowCreateModal(true)}>
                Create contact
              </PrimaryAction>
            }
          />

          <section className="space-y-6">
            <SectionDivider label="Audience Insights" spacing="loose" />

            <StatRow
              stats={[
                {
                  label: 'Total Tags',
                  value: availableTags.length,
                  icon: Tag
                },
                {
                  label: 'Total Contacts',
                  value: contacts.length,
                  icon: Users
                },
                {
                  label: 'WhatsApp Opted In',
                  value: contacts.filter(c => c.consent_whatsapp).length,
                  icon: Check
                },
                {
                  label: 'Email Opted In',
                  value: contacts.filter(c => c.consent_email).length,
                  icon: Check
                }
              ]}
            />
          </section>
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
        open={showDeleteConfirmDialog}
        onClose={() => {
          setShowDeleteConfirmDialog(false)
          setContactToDelete(null)
        }}
        title="Delete contact"
        description={`Are you sure you want to delete ${contactToDelete?.name || 'this contact'}? This cannot be undone.`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteConfirmDialog(false)
                setContactToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteContact}>
              Delete
            </Button>
          </>
        }
      />
    </AppShell>
  )
}

export default ContactsPage
