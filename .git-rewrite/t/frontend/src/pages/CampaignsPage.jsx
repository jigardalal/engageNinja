import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'

export default function CampaignsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 })

  useEffect(() => {
    fetchCampaigns()
  }, [search, statusFilter, pagination.offset])

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
        return 'bg-white/10 text-gray-200 border border-white/20'
      case 'sending':
        return 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
      case 'sent':
        return 'bg-green-500/20 text-green-100 border border-green-500/30'
      default:
        return 'bg-white/10 text-gray-200 border border-white/20'
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

  return (
    <AppShell
      title="Campaigns"
      subtitle="Create and manage WhatsApp and Email campaigns"
      actions={
        <button onClick={handleCreateCampaign} className="btn-primary">
          + New Campaign
        </button>
      }
    >
      <div className="card mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPagination(prev => ({ ...prev, offset: 0 }))
          }}
          className="flex-1 input-field"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination(prev => ({ ...prev, offset: 0 }))
          }}
          className="input-field w-full md:w-48"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-200 border border-red-500/30 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-300">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📧</div>
          <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
          <p className="text-gray-300 mb-6">Create your first campaign to get started</p>
          <button onClick={handleCreateCampaign} className="btn-primary">
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl shadow-lg border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-white/5">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Channel</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Audience</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Metrics</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Last Sent</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {getChannelLabel(campaign.channel)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {campaign.audience_count || 0} contacts
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {campaign.delivered_count || 0} delivered, {campaign.read_count || 0} read
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {formatDate(campaign.sent_at)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleViewCampaign(campaign.id)}
                      className="text-primary-200 hover:text-primary-100"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 bg-white/5 text-sm text-gray-300">
            <div>
              Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={pagination.offset === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={pagination.offset + pagination.limit >= pagination.total}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
