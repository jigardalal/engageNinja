import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
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
  Badge,
  Dialog,
  EmptyState,
  LoadingState,
  ErrorState,
  DataTable,
  Alert,
  SkeletonTable,
  Select,
  StatRow,
  SectionDivider,
  toast
} from '../components/ui'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import PageHeader from '../components/layout/PageHeader'
import { Sparkles, Archive, Megaphone, Activity, BarChart3, Eye, Clock, Users, ArrowUpDown } from 'lucide-react'

export default function CampaignsPage() {
  const { activeTenant } = useAuth()
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
    if (!activeTenant) {
      return
    }
    fetchCampaigns()
    setSelectedIds([])
    setSelectAll(false)
  }, [activeTenant, search, statusFilter, hideArchived, pagination.offset])

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

  const getChannelLabel = (channel) => {
    if (channel === 'whatsapp') return '📱 WhatsApp'
    if (channel === 'sms') return '💬 SMS'
    return '📧 Email'
  }

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
      toast({
        title: 'Campaigns archived',
        description: `${selectedIds.length} campaign(s) have been archived`,
        variant: 'success'
      })
      setShowArchiveModal(false)
      setSelectedIds([])
      setSelectAll(false)
      fetchCampaigns()
    } catch (err) {
      console.error('Bulk archive campaigns error', err)
      const errorMsg = err.message || 'Failed to archive campaigns'
      setArchiveError(errorMsg)
      toast({
        title: 'Failed to archive campaigns',
        description: errorMsg,
        variant: 'error'
      })
    }
  }

  const campaignStats = campaigns.reduce((acc, campaign) => {
    const audience = campaign.audience_count || 0
    acc.audience += audience
    acc.delivered += campaign.delivered_count || 0
    acc.read += campaign.read_count || 0
    const statusKey = campaign.status || 'draft'
    acc.statusCounts[statusKey] = (acc.statusCounts[statusKey] || 0) + 1
    if (campaign.sent_at) {
      const timestamp = new Date(campaign.sent_at).getTime()
      if (!acc.latest || timestamp > acc.latest.timestamp) {
        acc.latest = { timestamp, sent_at: campaign.sent_at }
      }
    }
    return acc
  }, {
    audience: 0,
    delivered: 0,
    read: 0,
    latest: null,
    statusCounts: {}
  })

  const lastSentLabel = campaignStats.latest ? formatDate(campaignStats.latest.sent_at) : 'No sends yet'
  const readRate = campaignStats.delivered > 0 ? Math.round((campaignStats.read / campaignStats.delivered) * 100) : 0
  const activeCampaignsCount = campaigns.length - (campaignStats.statusCounts.archived || 0)
  const workspaceRangeLabel = pagination.total
    ? `Showing ${pagination.offset + 1} - ${Math.min(pagination.offset + pagination.limit, pagination.total)} of ${pagination.total} campaigns`
    : 'No campaigns to show yet'
  const insightStatuses = [
    { key: 'draft', label: 'Draft', variant: 'neutral' },
    { key: 'sending', label: 'Sending', variant: 'primary' },
    { key: 'sent', label: 'Sent', variant: 'success' },
    { key: 'archived', label: 'Archived', variant: 'warning' }
  ]

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

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all"
          checked={selectAll && campaigns.length > 0}
          onChange={toggleSelectAll}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.original.name}`}
          checked={selectedIds.includes(row.original.id)}
          onChange={() => toggleSelect(row.original.id)}
        />
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'name',
      header: sortHeader('Name'),
      cell: ({ row }) => (
        <span className="font-medium text-[var(--text)]">{row.original.name}</span>
      )
    },
    {
      accessorKey: 'channel',
      header: sortHeader('Channel'),
      cell: ({ row }) => (
        <span className="text-[var(--text-muted)]">{getChannelLabel(row.original.channel)}</span>
      )
    },
    {
      accessorKey: 'status',
      header: sortHeader('Status'),
      cell: ({ row }) => (
        <Badge variant={
          row.original.status === 'sent'
            ? 'success'
            : row.original.status === 'sending'
              ? 'primary'
              : row.original.status === 'archived'
                ? 'warning'
                : 'neutral'
        }>
          {row.original.status}
        </Badge>
      )
    },
    {
      accessorKey: 'audience_count',
      header: sortHeader('Audience'),
      cell: ({ row }) => (
        <span className="text-[var(--text-muted)]">{row.original.audience_count || 0} contacts</span>
      )
    },
    {
      id: 'metrics',
      header: 'Metrics',
      cell: ({ row }) => (
        <span className="text-[var(--text-muted)]">
          {row.original.delivered_count || 0} delivered, {row.original.read_count || 0} read
        </span>
      ),
      enableSorting: false
    },
    {
      accessorKey: 'sent_at',
      header: sortHeader('Last Sent'),
      cell: ({ row }) => (
        <span className="text-[var(--text-muted)]">{formatDate(row.original.sent_at)}</span>
      )
    }
  ], [selectedIds, selectAll, campaigns.length])

  const rowActions = useMemo(() => [
    {
      label: 'View campaign',
      icon: <Eye className="h-4 w-4" />,
      onClick: (campaign) => {
        handleViewCampaign(campaign.id)
      }
    }
  ], [navigate])

  return (
    <AppShell hideTitleBlock title="Campaigns" subtitle="Create and manage WhatsApp, Email, and SMS campaigns">
      <div className="space-y-6">
        <PageHeader
          icon={Sparkles}
          title="Campaign control center"
          description="Filter, review, and act on your campaigns before sending."
          helper={`${campaigns.length} campaigns • ${selectedIds.length} selected`}
          actions={
            <div className="flex flex-wrap gap-3">
              <PrimaryAction onClick={handleCreateCampaign}>
                <Megaphone className="h-4 w-4" />
                New campaign
              </PrimaryAction>
              <SecondaryAction onClick={handleBulkArchive} disabled={selectedIds.length === 0}>
                <Archive className="h-4 w-4" />
                Archive selected
              </SecondaryAction>
            </div>
          }
        />

        <div className="space-y-6">
          {/* Top stats bar */}
          <StatRow
            stats={[
              {
                label: 'Active',
                value: campaigns.length - (campaignStats.statusCounts.archived || 0),
                icon: Activity
              },
              {
                label: 'Total Contacts',
                value: (campaignStats.audience || 0).toLocaleString(),
                icon: Users
              },
              {
                label: 'Read Rate',
                value: `${readRate}%`,
                icon: Eye
              },
              {
                label: 'Last Send',
                value: lastSentLabel === 'No sends yet' ? '-' : new Date(campaignStats.latest.sent_at).toLocaleDateString(),
                icon: Clock
              }
            ]}
            className="mb-6"
          />

          {/* Status breakdown */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-caption uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Status:
            </span>
            {insightStatuses.map(({ key, label, variant }) => (
              <Badge key={key} variant={variant}>
                {label}: {campaignStats.statusCounts[key] || 0}
              </Badge>
            ))}
          </div>

          <SectionDivider />

          {/* Full-width table */}
          <Card variant="glass" className="space-y-5">
              <CardHeader className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-h3 md:text-h2">Campaign workspace</CardTitle>
                  <CardDescription className="text-body">Filter, review, and act on your campaigns before sending.</CardDescription>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  {workspaceRangeLabel}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[2fr,2fr,1fr] items-end">
                  <div className="space-y-1">
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
                  <div className="space-y-1">
                    <Label htmlFor="status">Status</Label>
                    <Select
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
                    >
                      <option value="">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="sending">Sending</option>
                      <option value="sent">Sent</option>
                      <option value="archived">Archived</option>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Label htmlFor="hide-archived" className="text-sm">Hide archived</Label>
                  </div>
                </div>

                {error ? (
                  <ErrorState
                    title="Unable to load campaigns"
                    description={error}
                    onRetry={fetchCampaigns}
                    retryLabel="Retry"
                  />
                ) : loading ? (
                  <SkeletonTable rows={5} columns={7} />
                ) : campaigns.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="No campaigns yet"
                    description="Create your first message to see insights and engagement."
                    action={
                      <PrimaryAction onClick={handleCreateCampaign}>Create campaign</PrimaryAction>
                    }
                    className="mt-3"
                  />
                ) : (
                  <>
                    <DataTable
                      columns={columns}
                      data={campaigns}
                      rowActions={rowActions}
                      enableSearch={false}
                      enableSelection={false}
                      hidePagination={true}
                      title="Campaigns"
                      description="Manage your campaigns with pagination controls below."
                      emptyIcon={Sparkles}
                      emptyTitle="No campaigns"
                      emptyDescription="Create a campaign to get started."
                    />
                    <div className="flex items-center justify-between px-6 py-4 text-sm text-[var(--text-muted)] border-t border-[var(--border)] bg-[var(--card)] rounded-b-2xl">
                      <div>{workspaceRangeLabel}</div>
                      <div className="flex gap-2">
                        <SecondaryAction
                          onClick={handlePrevPage}
                          disabled={pagination.offset === 0}
                        >
                          Previous
                        </SecondaryAction>
                        <SecondaryAction
                          onClick={handleNextPage}
                          disabled={pagination.offset + pagination.limit >= pagination.total}
                        >
                          Next
                        </SecondaryAction>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
        </div>
      </div>

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
