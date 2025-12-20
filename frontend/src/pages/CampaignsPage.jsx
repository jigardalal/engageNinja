import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Dialog,
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell
} from '../components/ui'
import { Alert, LoadingState, ErrorState } from '../components/ui'

export default function CampaignsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [hideArchived, setHideArchived] = useState(true)
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 })
  const [selectedIds, setSelectedIds] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveError, setArchiveError] = useState('')

  useEffect(() => {
    fetchCampaigns()
    setSelectedIds([])
    setSelectAll(false)
  }, [search, statusFilter, hideArchived, pagination.offset])

  const fetchCampaigns = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset
      })

      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      params.append('hide_archived', hideArchived ? 'true' : 'false')

      const response = await fetch(`/api/campaigns?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns')
      }

      const data = await response.json()

      if (data.status === 'success') {
        setCampaigns(data.data)
        setPagination(data.pagination)
      } else {
        setError(data.message || 'Failed to fetch campaigns')
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err)
      setError('Failed to fetch campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = () => {
    navigate('/campaigns/new')
  }

  const handleViewCampaign = (campaignId) => {
    navigate(`/campaigns/${campaignId}`)
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft':
        return 'glass text-gray-200 border border-white/20'
      case 'sending':
        return 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
      case 'sent':
        return 'bg-green-500/20 text-green-100 border border-green-500/30'
      default:
        return 'glass text-gray-200 border border-white/20'
    }
  }

  const getChannelLabel = (channel) => (channel === 'whatsapp' ? '📱 WhatsApp' : '📧 Email')

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleNextPage = () => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) setPagination(prev => ({ ...prev, offset: newOffset }))
  }

  const handlePrevPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    setPagination(prev => ({ ...prev, offset: newOffset }))
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
      setSelectAll(false)
    } else {
      setSelectedIds(campaigns.map(c => c.id))
      setSelectAll(true)
    }
  }

  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return
    setArchiveError('')
    setShowArchiveModal(true)
  }

  const confirmBulkArchive = async () => {
    try {
      const response = await fetch('/api/campaigns/bulk/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaign_ids: selectedIds })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to archive campaigns')
      }
      setShowArchiveModal(false)
      setSelectedIds([])
      setSelectAll(false)
      fetchCampaigns()
    } catch (err) {
      console.error('Bulk archive campaigns error', err)
      setArchiveError(err.message || 'Failed to archive campaigns')
    }
  }

  return (
    <AppShell
      title="Campaigns"
      subtitle="Create and manage WhatsApp and Email campaigns"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleBulkArchive} disabled={selectedIds.length === 0}>
            Archive Selected
          </Button>
          <Button onClick={handleCreateCampaign}>+ New Campaign</Button>
        </div>
      }
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search or narrow by status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 space-y-0">
          <div className="flex-1 space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination(prev => ({ ...prev, offset: 0 }))
              }}
              className="h-11"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value
                setStatusFilter(value)
                if (value === 'archived') {
                  setHideArchived(false)
                }
                setPagination(prev => ({ ...prev, offset: 0 }))
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="hide-archived"
              type="checkbox"
              checked={hideArchived}
              onChange={(e) => {
                setHideArchived(e.target.checked)
                setPagination(prev => ({ ...prev, offset: 0 }))
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="hide-archived" className="text-sm">Hide archived (default)</Label>
          </div>
        </CardContent>
      </Card>

      {error && (
        <ErrorState
          title="Unable to load campaigns"
          description={error}
          onRetry={fetchCampaigns}
          retryLabel="Retry"
          className="mb-6"
        />
      )}

      {loading ? (
        <LoadingState message="Loading campaigns..." />
      ) : campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <div className="text-6xl">📧</div>
            <h3 className="text-xl font-semibold text-[var(--text)]">No campaigns yet</h3>
            <p className="text-[var(--text-muted)]">Create your first campaign to get started</p>
            <Button onClick={handleCreateCampaign}>Create Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={selectAll && campaigns.length > 0}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Metrics</TableHead>
                <TableHead>Last Sent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${campaign.name}`}
                      checked={selectedIds.includes(campaign.id)}
                      onChange={() => toggleSelect(campaign.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-[var(--text)]">{campaign.name}</TableCell>
                  <TableCell className="text-[var(--text-muted)]">{getChannelLabel(campaign.channel)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      campaign.status === 'sent'
                        ? 'success'
                        : campaign.status === 'sending'
                          ? 'primary'
                          : campaign.status === 'archived'
                            ? 'warning'
                            : 'neutral'
                    }>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[var(--text-muted)]">
                    {campaign.audience_count || 0} contacts
                  </TableCell>
                  <TableCell className="text-[var(--text-muted)]">
                    {campaign.delivered_count || 0} delivered, {campaign.read_count || 0} read
                  </TableCell>
                  <TableCell className="text-[var(--text-muted)]">
                    {formatDate(campaign.sent_at)}
                  </TableCell>
                  <TableCell className="text-primary-600 font-semibold">
                    <button
                      onClick={() => handleViewCampaign(campaign.id)}
                      className="hover:underline"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-6 py-4 text-sm text-[var(--text-muted)] border-t border-[var(--border)] bg-[var(--card)]">
            <div>
              Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handlePrevPage}
                disabled={pagination.offset === 0}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={handleNextPage}
                disabled={pagination.offset + pagination.limit >= pagination.total}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Dialog
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Selected Campaigns"
        description="Archiving keeps metrics and messages but hides the campaign from active lists."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowArchiveModal(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={confirmBulkArchive} disabled={selectedIds.length === 0}>
              Archive
            </Button>
          </>
        }
      >
        {archiveError && <Alert variant="error" className="mb-3">{archiveError}</Alert>}
        <p className="text-sm text-[var(--text-muted)]">
          This will archive {selectedIds.length} selected campaign(s). Data and metrics remain intact.
        </p>
      </Dialog>
    </AppShell>
  )
}
