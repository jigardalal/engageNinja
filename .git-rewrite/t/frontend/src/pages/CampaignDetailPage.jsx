import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCampaignSSE } from '../hooks/useCampaignSSE'

export default function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [detailedMetrics, setDetailedMetrics] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Use SSE for real-time metrics when campaign is sending
  const {
    metrics: sseMetrics,
    isConnected: sseConnected,
    isFallback: usePolling,
    error: sseError
  } = useCampaignSSE(id, campaign?.status === 'sending')

  // Fetch campaign details
  useEffect(() => {
    fetchCampaign()
  }, [id])

  // Update metrics from SSE stream
  useEffect(() => {
    if (sseMetrics) {
      setMetrics(sseMetrics.metrics)
      setDetailedMetrics(sseMetrics)
    }
  }, [sseMetrics])

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch campaign')
      }
      const data = await response.json()
      setCampaign(data.data)
      setMetrics(data.data.metrics)
      setError(null)

      // Fetch detailed metrics if campaign is sent or sending
      if (data.data.status !== 'draft') {
        fetchDetailedMetrics()
      }
    } catch (err) {
      console.error('Error fetching campaign:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedMetrics = async () => {
    try {
      const response = await fetch(`/api/campaigns/${id}/metrics`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      const data = await response.json()
      setDetailedMetrics(data)
    } catch (err) {
      console.error('Error fetching detailed metrics:', err)
      // Don't set error as this is non-critical
    }
  }

  const handleSendCampaign = async () => {
    setSending(true)
    try {
      const response = await fetch(`/api/campaigns/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to send campaign')
        setSending(false)
        return
      }

      // Update campaign state
      setCampaign(data.data)
      setMetrics(data.data.metrics)
      setShowConfirm(false)
      setError(null)

      // Poll for updates
    } catch (err) {
      console.error('Error sending campaign:', err)
      setError(err.message)
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Campaign not found</h1>
            <button
              onClick={() => navigate('/campaigns')}
              className="text-blue-600 hover:text-blue-800"
            >
              Back to campaigns
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/campaigns')}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            ← Back to Campaigns
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              campaign.status === 'draft' ? 'bg-gray-200 text-gray-800' :
              campaign.status === 'sending' ? 'bg-blue-200 text-blue-800' :
              'bg-green-200 text-green-800'
            }`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
          </div>
          {campaign.description && (
            <p className="text-gray-600 mt-2">{campaign.description}</p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Campaign details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Channel</dt>
                <dd className="font-medium capitalize">{campaign.channel}</dd>
              </div>
              {campaign.template_id && (
                <div>
                  <dt className="text-sm text-gray-600">Template</dt>
                  <dd className="font-medium">{campaign.template_id}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-600">Created</dt>
                <dd className="font-medium">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </dd>
              </div>
              {campaign.sent_at && (
                <div>
                  <dt className="text-sm text-gray-600">Sent</dt>
                  <dd className="font-medium">
                    {new Date(campaign.sent_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Metrics</h2>
              {campaign?.status === 'sending' && (
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    sseConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-gray-600">
                    {sseConnected ? 'Live' : usePolling ? 'Polling' : 'Connecting...'}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics?.total || 0}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.queued || 0}
                </div>
                <div className="text-sm text-gray-600">Queued</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.sent || 0}
                </div>
                <div className="text-sm text-gray-600">Sent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics?.delivered || 0}
                </div>
                <div className="text-sm text-gray-600">Delivered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics?.read || 0}
                </div>
                <div className="text-sm text-gray-600">Read</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.failed || 0}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              {detailedMetrics?.metrics?.read_rate !== undefined && (
                <div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {detailedMetrics.metrics.read_rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Read Rate</div>
                </div>
              )}
            </div>

            {/* Uplift/Resend metrics */}
            {detailedMetrics?.uplift && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Resend Uplift</h3>
                  <p className="text-green-700">{detailedMetrics.uplift.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message content */}
        {campaign.message_content && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Message Content</h2>
            <div className="bg-gray-50 rounded p-4 font-mono text-sm whitespace-pre-wrap">
              {typeof campaign.message_content === 'string'
                ? campaign.message_content
                : JSON.stringify(campaign.message_content, null, 2)}
            </div>
          </div>
        )}

        {/* Audience filters */}
        {campaign.audience_filters && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Audience</h2>
            <div className="text-gray-700">
              {campaign.audience_filters.tags && campaign.audience_filters.tags.length > 0 ? (
                <div>
                  <p className="font-medium mb-2">Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.audience_filters.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p>All contacts</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          {campaign.status === 'draft' && (
            <>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={sending}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400"
              >
                {sending ? 'Sending...' : 'Send Campaign'}
              </button>
              <button
                onClick={() => navigate(`/campaigns/${id}/edit`)}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
              >
                Edit
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/campaigns')}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
          >
            Back
          </button>
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Send Campaign?</h2>
              <p className="text-gray-700 mb-6">
                This will send the campaign to all contacts in your audience. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendCampaign}
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400"
                >
                  {sending ? 'Sending...' : 'Confirm & Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
