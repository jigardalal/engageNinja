import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  Input,
  Label,
  Badge,
  LoadingState,
  ErrorState
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import PageHeader from '../components/layout/PageHeader'
import { Sparkles, Users, Pencil, ListChecks } from 'lucide-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import '../styles/quillOverrides.css'

export default function CreateCampaignPage() {
  useAuth()
  const navigate = useNavigate()
  const { id: campaignId } = useParams()
  const isEditing = Boolean(campaignId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [tags, setTags] = useState([])
  const [contacts, setContacts] = useState([])
  const [templates, setTemplates] = useState([])
  const [loadingTags, setLoadingTags] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [stepError, setStepError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const steps = ['Basics', 'Audience', 'Content', 'Review']

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'whatsapp',
    template_id: '',
    message_content: '',
    subject: '',
    textBody: '',
    selectedTags: [],
    audienceType: 'all'
  })
  const [templateVariables, setTemplateVariables] = useState({})
  const [templateVariableSources, setTemplateVariableSources] = useState({})
  const [headerMediaLink, setHeaderMediaLink] = useState('')
  const [loadedMessageContent, setLoadedMessageContent] = useState(null)
  const [hasHydratedFromSaved, setHasHydratedFromSaved] = useState(false)

  const stripHtml = (html = '') => {
    const withoutTags = html.replace(/<[^>]+>/g, ' ')
    return withoutTags.replace(/\s+/g, ' ').trim()
  }
  // Fetch tags, contacts, and templates on mount
  useEffect(() => {
    fetchTags()
    fetchContacts()
    fetchTemplates()
  }, [])

  // Load campaign for editing
  useEffect(() => {
    const loadCampaign = async () => {
      if (!isEditing) return
      try {
        setLoading(true)
        const res = await fetch(`/api/campaigns/${campaignId}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load campaign')
        const data = await res.json()
        const campaign = data.campaign || data.data
        if (!campaign) throw new Error('Campaign not found')
        if (campaign.status !== 'draft') throw new Error('Only draft campaigns can be edited')

        // Parse content
        let parsedContent = {}
        if (campaign.message_content) {
          try {
            parsedContent = typeof campaign.message_content === 'string'
              ? JSON.parse(campaign.message_content)
              : campaign.message_content
          } catch {
            parsedContent = {}
          }
        }

        const staticVars = parsedContent.static || {}
        const mappingVars = parsedContent.mapping || {}
        setTemplateVariables(staticVars)
        setTemplateVariableSources(mappingVars)
        if (parsedContent.media?.header_link) {
          setHeaderMediaLink(parsedContent.media.header_link)
        }
        setLoadedMessageContent(parsedContent)

        setFormData(prev => ({
          ...prev,
          name: campaign.name || '',
          description: campaign.description || '',
          channel: campaign.channel || 'whatsapp',
          template_id: campaign.template_id || '',
          message_content: parsedContent.htmlBody || parsedContent.textBody || '',
          textBody: parsedContent.textBody || '',
          subject: parsedContent.subject || '',
          audienceType: (campaign.audience_filters && campaign.audience_filters.tags && campaign.audience_filters.tags.length > 0) ? 'filtered' : 'all',
          selectedTags: (campaign.audience_filters && campaign.audience_filters.tags) ? campaign.audience_filters.tags : []
        }))
      } catch (err) {
        console.error('Load campaign error:', err)
        setError(err.message || 'Failed to load campaign for editing')
      } finally {
        setLoading(false)
      }
    }
    loadCampaign()
  }, [isEditing, campaignId])

  // Hydrate variables/media once templates are available to avoid losing mapping selections
  useEffect(() => {
    if (!isEditing || hasHydratedFromSaved) return
    if (!loadedMessageContent) return
    if (!formData.template_id) return
    if (!templates || templates.length === 0) return

    const selectedTemplate = templates.find(t => t.id === formData.template_id)
    if (!selectedTemplate || !Array.isArray(selectedTemplate.variables)) return

    const nextSources = {}
    const nextVars = {}
    selectedTemplate.variables.forEach((v) => {
      if (loadedMessageContent.mapping && loadedMessageContent.mapping[v]) {
        nextSources[v] = loadedMessageContent.mapping[v]
      } else {
        nextSources[v] = 'custom'
        if (loadedMessageContent.static && loadedMessageContent.static[v]) {
          nextVars[v] = loadedMessageContent.static[v]
        }
      }
      if (loadedMessageContent.static && loadedMessageContent.static[v] && nextSources[v] === 'custom') {
        nextVars[v] = loadedMessageContent.static[v]
      }
    })

    setTemplateVariableSources(nextSources)
    setTemplateVariables(() => ({ ...nextVars }))
    if (loadedMessageContent.media?.header_link) {
      setHeaderMediaLink(loadedMessageContent.media.header_link)
    }
    setHasHydratedFromSaved(true)
  }, [isEditing, hasHydratedFromSaved, loadedMessageContent, formData.template_id, templates])

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
      const incomingContacts = data.contacts || data.data || []
      setContacts(Array.isArray(incomingContacts) ? incomingContacts : [])
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
      const incoming = Array.isArray(data.templates)
        ? data.templates
        : Array.isArray(data.data)
          ? data.data
          : []
      setTemplates(incoming)
    } catch (err) {
      console.error('Error fetching templates:', err)
      // Templates optional; swallow error
    } finally {
      setLoadingTemplates(false)
    }
  }

  const getSelectedTemplate = () => {
    if (!formData.template_id) return null
    return templates.find(t => t.id === formData.template_id) || null
  }

  const getAudienceCount = () => {
    const list = Array.isArray(contacts) ? contacts : []
    if (formData.audienceType === 'all') {
      return list.length
    }
    if (formData.selectedTags.length === 0) return list.length
    return list.filter(contact => {
      const contactTags = contact.tags || []
      return formData.selectedTags.some(tagId => {
        const tag = tags.find(t => t.id === tagId)
        return contactTags.includes(tag?.name)
      })
    }).length
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
      message_content: '',
      subject: ''
    }))
    setTemplateVariables({})
    setTemplateVariableSources({})
    setHeaderMediaLink('')
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

  const handleTemplateChange = (e) => {
    const value = e.target.value
    setHasHydratedFromSaved(false) // allow re-hydration when switching templates
    setFormData(prev => ({
      ...prev,
      template_id: value
    }))

    const tmplSelection = templates.find(t => t.id === value)
    if (!value) {
      setTemplateVariables({})
      setTemplateVariableSources({})
      setHeaderMediaLink('')
      return
    }

    if (tmplSelection && Array.isArray(tmplSelection.variables)) {
      const nextVars = {}
      const nextSources = {}
      tmplSelection.variables.forEach(v => {
        // Preserve existing values where possible
        if (templateVariableSources[v]) {
          nextSources[v] = templateVariableSources[v]
        } else if (loadedMessageContent?.mapping && loadedMessageContent.mapping[v]) {
          nextSources[v] = loadedMessageContent.mapping[v]
        } else {
          nextSources[v] = 'custom'
        }

        if (templateVariables[v]) {
          nextVars[v] = templateVariables[v]
        } else if (loadedMessageContent?.static && loadedMessageContent.static[v]) {
          nextVars[v] = loadedMessageContent.static[v]
        } else {
          nextVars[v] = ''
        }
      })
      setTemplateVariables(nextVars)
      setTemplateVariableSources(nextSources)
    } else {
      setTemplateVariables({})
      setTemplateVariableSources({})
    }

    const tmpl = tmplSelection
    if (!tmpl || !['IMAGE', 'VIDEO', 'DOCUMENT'].includes(tmpl.header_type)) {
      setHeaderMediaLink('')
    }
  }

  const handleTemplateVariableChange = (name, value) => {
    setTemplateVariables(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTemplateVariableSourceChange = (name, source) => {
    setTemplateVariableSources(prev => ({
      ...prev,
      [name]: source
    }))
  }

  const validateStep = () => {
    if (currentStep === 0) {
      if (!formData.name.trim()) {
        setStepError('Campaign name is required.')
        return false
      }
    }
    if (currentStep === 1) {
      if (formData.audienceType === 'filtered' && formData.selectedTags.length === 0) {
        setStepError('Select at least one tag or choose All Contacts.')
        return false
      }
    }
    if (currentStep === 2) {
      if (formData.channel === 'whatsapp' && !formData.template_id) {
        setStepError('Select a WhatsApp template.')
        return false
      }
      if (formData.channel === 'whatsapp') {
        const template = getSelectedTemplate()
        if (template && Array.isArray(template.variables) && template.variables.length > 0) {
          const missing = template.variables.filter(v => {
            const source = templateVariableSources[v] || 'custom'
            if (source !== 'custom') return false
            return !templateVariables[v]?.trim()
          })
          if (missing.length > 0) {
            setStepError(`Enter values for: ${missing.join(', ')}`)
            return false
          }
        }
        if (template && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.header_type || '')) {
          if (!headerMediaLink.trim()) {
            setStepError('Media header requires a URL.')
            return false
          }
        }
      }
      if (formData.channel === 'email') {
        if (!formData.subject?.trim()) {
          setStepError('Subject is required for email.')
          return false
        }
        const hasHtml = stripHtml(formData.message_content || '').length > 0
        const hasText = (formData.textBody || '').trim().length > 0
        if (!hasHtml && !hasText) {
          setStepError('Message content is required for email.')
          return false
        }
      }
    }
    setStepError('')
    return true
  }

  const goToNextStep = () => {
    if (!validateStep()) return
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const goToPrevStep = () => {
    setStepError('')
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const audienceFilters = formData.audienceType === 'filtered'
        ? { tags: formData.selectedTags }
        : null

      let messageContentPayload = null
      if (formData.channel === 'whatsapp') {
        const staticVars = {}
        const mapping = {}
        const keys = new Set([
          ...Object.keys(templateVariables || {}),
          ...Object.keys(templateVariableSources || {})
        ])

        keys.forEach(key => {
          const source = templateVariableSources[key] || 'custom'
          if (source === 'custom') {
            staticVars[key] = templateVariables?.[key] || ''
          } else {
            mapping[key] = source
          }
        })
        const media = headerMediaLink ? { header_link: headerMediaLink.trim() } : undefined
        messageContentPayload = JSON.stringify({ static: staticVars, mapping, ...(media ? { media } : {}) })
      } else {
        const htmlContent = formData.message_content || ''
        const fallbackText = formData.textBody?.trim() || stripHtml(htmlContent) || htmlContent
        messageContentPayload = JSON.stringify({
          subject: formData.subject?.trim(),
          htmlBody: htmlContent,
          textBody: fallbackText
        })
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        channel: formData.channel,
        template_id: formData.template_id || null,
        message_content: messageContentPayload,
        subject: formData.subject || null,
        audience_filters: audienceFilters
      }

      const url = isEditing ? `/api/campaigns/${campaignId}` : '/api/campaigns'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save campaign')
      }

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess(isEditing ? 'Campaign updated successfully!' : 'Campaign created successfully!')
        setTimeout(() => navigate('/campaigns'), 1000)
      } else {
        setError(data.message || 'Failed to save campaign')
      }
    } catch (err) {
      console.error('Error saving campaign:', err)
      setError(err.message || 'Failed to save campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/campaigns')
  }

  if (loadingTags || loadingContacts || loadingTemplates) {
    return (
      <AppShell title="Create Campaign">
        <LoadingState message="Loading form..." />
      </AppShell>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Holiday Promotion"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g., Special holiday offer for all customers"
                  rows="3"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div className="border rounded-xl border-[var(--border)] p-4 space-y-4">
              <Label className="font-semibold">Channel *</Label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-[var(--text)]">
                  <input
                    type="radio"
                    name="channel"
                    value="whatsapp"
                    checked={formData.channel === 'whatsapp'}
                    onChange={handleChannelChange}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span>📱 WhatsApp</span>
                </label>
                <label className="flex items-center gap-3 text-[var(--text)]">
                  <input
                    type="radio"
                    name="channel"
                    value="email"
                    checked={formData.channel === 'email'}
                    onChange={handleChannelChange}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span>📧 Email</span>
                </label>
              </div>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="border rounded-xl border-[var(--border)] p-4 space-y-4">
            <CardTitle className="text-xl">Audience</CardTitle>
            <CardDescription>Choose who receives this campaign</CardDescription>

            <div className="space-y-3">
              <label className="flex items-center gap-3 text-[var(--text)]">
                <input
                  type="radio"
                  name="audienceType"
                  value="all"
                  checked={formData.audienceType === 'all'}
                  onChange={handleAudienceTypeChange}
                  className="h-4 w-4 text-primary-600"
                />
                <span>All Contacts ({Array.isArray(contacts) ? contacts.length : 0})</span>
              </label>
              <label className="flex items-center gap-3 text-[var(--text)]">
                <input
                  type="radio"
                  name="audienceType"
                  value="filtered"
                  checked={formData.audienceType === 'filtered'}
                  onChange={handleAudienceTypeChange}
                  className="h-4 w-4 text-primary-600"
                />
                <span>Filter by Tags</span>
              </label>
            </div>

            {formData.audienceType === 'filtered' && tags.length > 0 && (
              <div className="space-y-2">
                <Label>Select Tags</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tags.map(tag => (
                    <label key={tag.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                      <input
                        type="checkbox"
                        checked={formData.selectedTags.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        className="h-4 w-4 text-primary-600"
                      />
                      <span className="text-[var(--text)]">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-sm font-semibold text-[var(--text)]">
                Audience Preview: <span className="text-primary-600">{getAudienceCount()} contacts</span>
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                This campaign will be sent to {getAudienceCount()} contact{getAudienceCount() !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )
      case 2:
        return formData.channel === 'whatsapp' ? (
          <div className="border rounded-xl border-[var(--border)] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">WhatsApp Configuration</CardTitle>
                <CardDescription>Select a template synced from Settings</CardDescription>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template *</Label>
              {templates.length > 0 ? (
                <>
                  <select
                    name="template_id"
                    value={formData.template_id}
                    onChange={handleTemplateChange}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
                  <p className="text-sm text-[var(--text-muted)]">
                    Templates synced from your WhatsApp Business account
                  </p>
                  {formData.template_id && (
                    <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-3">
                      <p className="text-xs font-semibold text-[var(--text)]">Required placeholders</p>
                      {(() => {
                        const tmpl = getSelectedTemplate()
                        const vars = tmpl?.variables || []
                        if (vars.length === 0 && typeof tmpl?.variable_count === 'number') {
                          return (
                            <p className="text-xs text-[var(--text-muted)]">
                              Template expects {tmpl.variable_count} placeholders.
                            </p>
                          )
                        }
                        if (vars.length === 0) {
                          return <p className="text-xs text-[var(--text-muted)]">No variables required.</p>
                        }
                        return (
                          <p className="text-xs text-[var(--text-muted)]">
                            {vars.map((v, i) => `${v}${i < vars.length - 1 ? ', ' : ''}`)}
                          </p>
                        )
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <Alert variant="warning">
                  No templates available. Please sync templates in Settings first.
                </Alert>
              )}
            </div>

            {formData.template_id && templates.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                {(() => {
                  const selectedTemplate = getSelectedTemplate()
                  return (
                    <>
                      <p className="text-sm font-semibold text-[var(--text)] mb-2">Template Variables</p>
                      {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-[var(--text-muted)]">
                            Provide values for each variable below or map to a contact field.
                          </p>
                          <div className="grid gap-3 md:grid-cols-2">
                            {selectedTemplate.variables.map((variable) => {
                              const source = templateVariableSources[variable] || 'custom'
                              return (
                                <div key={variable} className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <Label className="text-sm font-semibold">{variable}</Label>
                                    <select
                                      value={source}
                                      onChange={(e) => handleTemplateVariableSourceChange(variable, e.target.value)}
                                      className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                                    >
                                      <option value="custom">Custom value</option>
                                      <option value="contact.name">Contact name</option>
                                      <option value="contact.email">Contact email</option>
                                      <option value="contact.phone">Contact phone</option>
                                    </select>
                                  </div>
                                  {source !== 'custom' ? (
                                    <p className="text-xs text-[var(--text-muted)]">
                                      Will use {source.replace('contact.', 'contact ')}
                                    </p>
                                  ) : (
                                    <Input
                                      type="text"
                                      value={templateVariables[variable] || ''}
                                      onChange={(e) => handleTemplateVariableChange(variable, e.target.value)}
                                      placeholder={`Value for ${variable}`}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {selectedTemplate.header_type && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTemplate.header_type) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Media Header URL</Label>
                              <Input
                                type="url"
                                value={headerMediaLink}
                                onChange={(e) => setHeaderMediaLink(e.target.value)}
                                placeholder="https://example.com/your-media.jpg"
                              />
                              <p className="text-xs text-[var(--text-muted)]">
                                Required for {selectedTemplate.header_type.toLowerCase()} headers. Must be a publicly accessible URL.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">
                          This template has no variables and will send the same message to all contacts.
                        </p>
                      )}

                      {(selectedTemplate?.body || selectedTemplate?.header_text || selectedTemplate?.footer_text) && (
                        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-alt, var(--card))] p-4">
                          <p className="text-sm font-semibold text-[var(--text)] mb-2">Preview</p>
                          <div className="space-y-2">
                            {selectedTemplate.header_text && (
                              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                                {renderTemplateText(selectedTemplate.header_text, templateVariableSources, templateVariables, contacts)}
                              </p>
                            )}
                            {selectedTemplate.header_type && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTemplate.header_type) && (
                              <p className="text-xs text-[var(--text-muted)]">
                                Media header ({selectedTemplate.header_type.toLowerCase()}): {headerMediaLink || 'No URL provided'}
                              </p>
                            )}
                            {selectedTemplate.body && (
                              <p className="text-sm whitespace-pre-wrap text-[var(--text)]">
                                {renderTemplateText(selectedTemplate.body, templateVariableSources, templateVariables, contacts)}
                              </p>
                            )}
                            {selectedTemplate.footer_text && (
                              <p className="text-xs text-[var(--text-muted)]">
                                {renderTemplateText(selectedTemplate.footer_text, templateVariableSources, templateVariables, contacts)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="border rounded-xl border-[var(--border)] p-4 space-y-4">
            <CardTitle className="text-xl">Email Configuration</CardTitle>
            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input
                type="text"
                name="subject"
                value={formData.subject}
                placeholder="e.g., Special Holiday Offer Just for You!"
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Message *</Label>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
                  <ReactQuill
                    theme="snow"
                    value={formData.message_content}
                    onChange={(value) => setFormData(prev => ({ ...prev, message_content: value }))}
                    placeholder="Write your email content..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plain Text Fallback (optional)</Label>
                  <textarea
                    name="textBody"
                    value={formData.textBody}
                    onChange={(e) => setFormData(prev => ({ ...prev, textBody: e.target.value }))}
                    placeholder="Optional plain text version"
                    rows="3"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  />
                  <p className="text-xs text-[var(--text-muted)]">If left blank, we’ll generate text from your HTML.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-3">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Subject</p>
                    <p className="text-sm text-[var(--text)] font-medium">{formData.subject || '(no subject)'}</p>
                  </div>
                  <div className="border border-dashed border-[var(--border)] rounded-lg p-3 min-h-[160px] bg-white text-[var(--text)]">
                    {formData.message_content
                      ? <div dangerouslySetInnerHTML={{ __html: formData.message_content }} />
                      : <p className="text-sm text-[var(--text-muted)]"><em>Your email content will appear here.</em></p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="border rounded-xl border-[var(--border)] p-4 space-y-4">
            <CardTitle className="text-xl">Review</CardTitle>
            <CardDescription>Confirm details before creating the campaign</CardDescription>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-[var(--text-muted)]">Name</p>
                <p className="text-[var(--text)] font-semibold">{formData.name || '-'}</p>
                <p className="text-sm text-[var(--text-muted)]">Channel</p>
                <Badge variant="primary" className="capitalize">{formData.channel}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-[var(--text-muted)]">Audience</p>
                <p className="text-[var(--text)]">
                  {formData.audienceType === 'all'
                    ? `All contacts (${contacts.length})`
                    : `${formData.selectedTags.length} tag(s) selected`}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-muted)]">Summary</p>
              <p className="text-sm text-[var(--text-muted)]">Will send to {getAudienceCount()} contacts.</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <AppShell
      title={isEditing ? 'Edit Campaign' : 'Create Campaign'}
      subtitle={isEditing ? 'Update your WhatsApp or Email campaign' : 'Create a new WhatsApp or Email campaign'}
    >
      <PageHeader
        icon={Sparkles}
        title={isEditing ? 'Edit your campaign' : 'Create your next campaign'}
        description="Follow the guided steps to configure audience, content, and review before sending."
        helper={`${tags.length || 0} templates • ${contacts.length || 0} contacts`}
        actions={
          <div className="flex flex-wrap gap-3">
            <PrimaryAction onClick={() => navigate('/campaigns')}>
              <ListChecks className="h-4 w-4" />
              <span>View campaigns</span>
            </PrimaryAction>
            <SecondaryAction onClick={() => navigate('/templates')}>
              <Users className="h-4 w-4" />
              <span>Manage templates</span>
            </SecondaryAction>
          </div>
        }
        meta={<p className="text-sm text-[var(--text-muted)]">Steps: Basics • Audience • Content • Review</p>}
      />
      {error && (
        <ErrorState
          title="Unable to save campaign"
          description={error}
          onRetry={handleSubmit}
          retryLabel="Retry save"
          className="mb-4"
        />
      )}

      {success && (
        <Alert variant="success" className="mb-4">{success}</Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr,1fr]">
        <Card variant="glass" className="space-y-6">
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              {steps.map((label, idx) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-sm font-semibold ${
                    idx === currentStep ? 'bg-primary-500 text-white border-primary-500' : 'border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {idx + 1}
                  </div>
                <span className={idx === currentStep ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-muted)] text-sm'}>
                  {label}
                </span>
                {idx < steps.length - 1 && <div className="w-10 h-px bg-[var(--border)]" />}
              </div>
            ))}
          </div>

          {stepError && <Alert variant="error">{stepError}</Alert>}

          {renderStep()}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={goToPrevStep} disabled={currentStep === 0}>Back</Button>
            {currentStep < steps.length - 1 ? (
              <Button onClick={goToNextStep}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Campaign' : 'Create Campaign')}
              </Button>
            )}
          </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="space-y-4">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary-500" />
              <CardTitle className="text-lg">Progress summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--text-muted)]">
            <p>Current step: <strong>{steps[currentStep]}</strong></p>
            <p>Audience: {formData.audienceType === 'all' ? 'All contacts' : `${formData.selectedTags.length} tag(s)`}</p>
            <p>Template: {formData.template_id ? 'Selected' : 'Choose template in Content step'}</p>
          </CardContent>
          <CardContent className="pt-0">
            <SecondaryAction className="w-full" onClick={handleCancel}>
              Cancel & close
            </SecondaryAction>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

function renderTemplateText(text, variableSources, variableValues, contacts) {
  if (!text) return ''
  return text.replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
    const sourceMap = variableSources || {}
    const valMap = variableValues || {}
    const source = sourceMap[varName] || 'custom'
    if (source.startsWith('contact.')) {
      const sampleContact = (contacts && contacts[0]) || {}
      const field = source.split('.')[1]
      const value = sampleContact[field] || ''
      return value || `{{${varName}}}`
    }
    const val = valMap[varName]
    return val && String(val).trim() ? String(val).trim() : `{{${varName}}}`
  })
}
