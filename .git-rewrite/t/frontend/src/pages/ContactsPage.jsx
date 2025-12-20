import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CreateContactModal } from '../components/CreateContactModal'
import { CSVImportModal } from '../components/CSVImportModal'
import AppShell from '../components/layout/AppShell'

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
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    fetchContacts()
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
    } catch (err) {
      console.error('Fetch contacts error:', err)
      setError(err.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
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

  return (
    <AppShell
      title="Contacts"
      subtitle="Manage your customer contacts and segment with tags"
      actions={
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary">
            ⬆ Import CSV
          </button>
          <button onClick={handleExportCSV} className="btn-secondary">
            ⬇ Export CSV
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + New Contact
          </button>
        </div>
      }
    >
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field flex-1"
          />

          {availableTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="input-field w-full md:w-60"
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-400">Loading contacts...</div>
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="card text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-white">No contacts found</h3>
          <p className="mt-1 text-gray-400">Get started by creating your first contact</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-4 btn-primary">
            Create Contact
          </button>
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <div className="bg-white/5 rounded-xl shadow-lg border border-white/10 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Consent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/5 divide-y divide-gray-200">
              {contacts.map(contact => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{contact.name}</div>
                    <div className="text-sm text-gray-400">{contact.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{contact.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{contact.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {(contact.tags || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {contact.tags.map((tag, index) => (
                            <span key={index} className="badge badge-primary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {contact.consent_whatsapp && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">WhatsApp</span>
                      )}
                      {contact.consent_email && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Email</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                      className="text-primary-200 hover:text-primary-100 font-semibold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateContactModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchContacts}
        availableTags={availableTags}
      />

      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={fetchContacts}
      />
    </AppShell>
  )
}

export default ContactsPage
