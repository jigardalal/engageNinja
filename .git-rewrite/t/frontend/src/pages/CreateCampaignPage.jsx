import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function CreateCampaignPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [tags, setTags] = useState([])
  const [contacts, setContacts] = useState([])
  const [templates, setTemplates] = useState([])
  const [loadingTags, setLoadingTags] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'whatsapp',
    template_id: '',
    message_content: '',
    selectedTags: [],
    audienceType: 'all', // 'all' or 'filtered'
  })

  // Fetch tags, contacts, and templates on mount
  useEffect(() => {
    fetchTags()
    fetchContacts()
    fetchTemplates()
  }, [])

  const fetchTags = async () => {
    try {
      setLoadingTags(true)
      const response = await fetch('/api/contacts/tags/list', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }

      const data = await response.json()
      if (data.status === 'success') {
        setTags(data.data)
      }
    } catch (err) {
      console.error('Error fetching tags:', err)
      setError('Failed to load tags')
    } finally {
      setLoadingTags(false)
    }
  }

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true)
      const response = await fetch('/api/contacts?limit=1000', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      if (data.status === 'success') {
        setContacts(data.data)
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
    } finally {
      setLoadingContacts(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await fetch('/api/templates', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      if (data.templates && Array.isArray(data.templates)) {
        setTemplates(data.templates)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      // Don't show error to user - templates are optional
    } finally {
      setLoadingTemplates(false)
    }
  }

  const getAudienceCount = () => {
    if (formData.audienceType === 'all') {
      return contacts.length
    } else {
      // Filter contacts by selected tags
      if (formData.selectedTags.length === 0) {
        return contacts.length
      }
      return contacts.filter(contact => {
        // Check if contact has any of the selected tags
        const contactTags = contact.tags || []
        return formData.selectedTags.some(tagId => {
          const tag = tags.find(t => t.id === tagId)
          return contactTags.includes(tag?.name)
        })
      }).length
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleChannelChange = (e) => {
    setFormData(prev => ({
      ...prev,
      channel: e.target.value,
      template_id: '',
      message_content: ''
    }))
  }

  const handleAudienceTypeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      audienceType: e.target.value
    }))
  }

  const handleTagToggle = (tagId) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Campaign name is required')
      return
    }

    if (formData.channel === 'whatsapp' && !formData.template_id.trim()) {
      setError('Please select a WhatsApp template')
      return
    }

    if (formData.channel === 'email' && !formData.message_content.trim()) {
      setError('Message content is required for email campaigns')
      return
    }

    setLoading(true)

    try {
      const audienceFilters = formData.audienceType === 'filtered'
        ? { tags: formData.selectedTags }
        : null

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          channel: formData.channel,
          template_id: formData.template_id || null,
          message_content: formData.message_content || null,
          audience_filters: audienceFilters
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create campaign')
      }

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess('Campaign created successfully!')
        // Redirect to campaigns list after a brief delay
        setTimeout(() => {
          navigate('/campaigns')
        }, 1000)
      } else {
        setError(data.message || 'Failed to create campaign')
      }
    } catch (err) {
      console.error('Error creating campaign:', err)
      setError(err.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/campaigns')
  }

  if (loadingTags || loadingContacts || loadingTemplates) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Campaign</h1>
          <p className="text-gray-600">Create a new WhatsApp or Email campaign</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
          {/* Campaign Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Holiday Promotion"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="e.g., Special holiday offer for all customers"
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Channel Selection */}
          <div className="mb-8 pb-8 border-b">
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Channel *
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="channel"
                  value="whatsapp"
                  checked={formData.channel === 'whatsapp'}
                  onChange={handleChannelChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-gray-900">📱 WhatsApp</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="channel"
                  value="email"
                  checked={formData.channel === 'email'}
                  onChange={handleChannelChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-gray-900">📧 Email</span>
              </label>
            </div>
          </div>

          {/* WhatsApp Section */}
          {formData.channel === 'whatsapp' && (
            <div className="mb-8 pb-8 border-b">
              <h3 className="text-lg font-medium text-gray-900 mb-4">WhatsApp Configuration</h3>

              {/* Template Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Template *
                </label>
                {templates.length > 0 ? (
                  <>
                    <select
                      name="template_id"
                      value={formData.template_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                          {template.variables && template.variables.length > 0
                            ? ` (${template.variables.join(', ')})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm text-gray-600">
                      Templates synced from your WhatsApp Business account
                    </p>
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      No templates available. Please sync templates in Settings first.
                    </p>
                  </div>
                )}
              </div>

              {/* Template Variables Note */}
              {formData.template_id && templates.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  {(() => {
                    const selectedTemplate = templates.find(t => t.id === formData.template_id)
                    return (
                      <>
                        <p className="text-sm text-gray-900 font-medium mb-2">Template Variables:</p>
                        {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
                          <p className="text-sm text-gray-600">
                            This template uses the following variables: <strong>{selectedTemplate.variables.join(', ')}</strong>.
                            These will be automatically mapped to contact fields.
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">
                            This template has no variables and will send the same message to all contacts.
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Email Section */}
          {formData.channel === 'email' && (
            <div className="mb-8 pb-8 border-b">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email Configuration</h3>

              {/* Email Subject */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Subject Line *
                </label>
                <input
                  type="text"
                  name="subject"
                  placeholder="e.g., Special Holiday Offer Just for You!"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              {/* Email Body */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Message *
                </label>
                <textarea
                  name="message_content"
                  value={formData.message_content}
                  onChange={handleInputChange}
                  placeholder="Enter your email message here..."
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-sm text-gray-600">
                  You can use contact variables in your message (e.g., contact name, email, etc.)
                </p>
              </div>
            </div>
          )}

          {/* Audience Selection */}
          <div className="mb-8 pb-8 border-b">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Audience</h3>

            {/* Audience Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Select Audience
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="audienceType"
                    value="all"
                    checked={formData.audienceType === 'all'}
                    onChange={handleAudienceTypeChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-900">All Contacts ({contacts.length})</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="audienceType"
                    value="filtered"
                    checked={formData.audienceType === 'filtered'}
                    onChange={handleAudienceTypeChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-900">Filter by Tags</span>
                </label>
              </div>
            </div>

            {/* Tag Selection (if filtered) */}
            {formData.audienceType === 'filtered' && tags.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Select Tags
                </label>
                <div className="space-y-2">
                  {tags.map(tag => (
                    <label key={tag.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.selectedTags.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="ml-3 text-gray-900">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Audience Preview */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                Audience Preview: <span className="text-blue-600 font-bold">{getAudienceCount()} contacts</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                This campaign will be sent to {getAudienceCount()} contact{getAudienceCount() !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? 'Creating...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
