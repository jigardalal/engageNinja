import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCampaignSSE } from '../hooks/useCampaignSSE'
import AppShell from '../components/layout/AppShell'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  Badge,
  Dialog,
  LoadingState,
  ErrorState
} from '../components/ui'

export default function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [resending, setResending] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [detailedMetrics, setDetailedMetrics] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showResendConfirm, setShowResendConfirm] = useState(false)
  const [resendError, setResendError] = useState(null)
  const [resendSuccess, setResendSuccess] = useState(null)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateError, setDuplicateError] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [retryingFailed, setRetryingFailed] = useState(false)
  const [retryMessage, setRetryMessage] = useState(null)
  const [retryWarning, setRetryWarning] = useState(null)
  const resendMetrics = detailedMetrics?.resend_metrics
  const uplift = detailedMetrics?.uplift
  const totalMetric = metrics?.total ?? metrics?.total_sent ?? 0
  const queuedMetric = metrics?.queued ?? metrics?.queued_count ?? 0
  const processingMetric = metrics?.processing ?? metrics?.processing_count ?? 0
  const sentMetric = metrics?.sent ?? metrics?.sent_count ?? 0
  const deliveredMetric = metrics?.delivered ?? metrics?.delivered_count ?? 0
  const readMetric = metrics?.read ?? metrics?.read_count ?? 0
  const failedMetric = metrics?.failed ?? metrics?.failed_count ?? 0
  const originalReadRate = useMemo(() => parseFloat(resendMetrics?.original_read_rate ?? 0), [resendMetrics])
  const resendReadRate = useMemo(() => parseFloat(resendMetrics?.resend_read_rate ?? 0), [resendMetrics])
  const showWebhookWait = useMemo(() => {
    const hasSent = (metrics?.sent || 0) > 0
    const hasDelivery = (metrics?.delivered || 0) > 0 || (metrics?.read || 0) > 0
    const noneQueued = (metrics?.queued || 0) === 0 && (metrics?.processing || 0) === 0
    return hasSent && !hasDelivery && noneQueued
  }, [metrics])

  // Use SSE for real-time metrics when campaign is sending
  const {
    metrics: sseMetrics,
    isConnected: sseConnected,
    isFallback: usePolling,
    error: sseError
  } = useCampaignSSE(id, campaign && campaign.status !== 'draft')

  // Fetch campaign details
  useEffect(() => {
    fetchCampaign()
  }, [id])

  // Update metrics from SSE stream
  useEffect(() => {
    if (sseMetrics) {
      setMetrics(sseMetrics.metrics)
      setDetailedMetrics(sseMetrics)
      if (sseMetrics.campaign?.status) {
        setCampaign(prev => prev ? { ...prev, status: sseMetrics.campaign.status } : prev)
      }
      if (sseMetrics.metrics?.last_error) {
        setLastError(sseMetrics.metrics.last_error)
      }
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
      setLastError(data.data.metrics?.last_error || null)
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
      setLastError(data.metrics?.last_error || null)
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

  const handleResendCampaign = async () => {
    setResending(true)
    setResendError(null)
    setResendSuccess(null)
    try {
      const response = await fetch(`/api/campaigns/${id}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        setResendError(data.message || 'Failed to resend campaign')
        setResending(false)
        return
      }

      setShowResendConfirm(false)
      setResendSuccess(data.message || 'Resend started')
      setResending(false)

      if (data.data?.id) {
        navigate(`/campaigns/${data.data.id}`)
      }
    } catch (err) {
      console.error('Error resending campaign:', err)
      setResendError(err.message)
      setResending(false)
    }
  }

  const statusVariant = (status) => {
    if (status === 'sent') return 'success'
    if (status === 'sending') return 'primary'
    if (status === 'archived') return 'outline'
    return 'neutral'
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    setDuplicateError(null)
    try {
      const response = await fetch(`/api/campaigns/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to duplicate campaign')
      }
      if (data.data?.id) {
        navigate(`/campaigns/${data.data.id}/edit`)
      }
    } catch (err) {
      console.error('Duplicate campaign error:', err)
      setDuplicateError(err.message)
    } finally {
      setDuplicating(false)
    }
  }

  const handleRetryFailed = async () => {
    setRetryingFailed(true)
    setRetryMessage(null)
    setRetryWarning(null)
    setError(null)
    try {
      const response = await fetch(`/api/campaigns/${id}/retry-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      const data = await response.json()
      if (!response.ok) {
        if (data.error === 'Retry Already In Progress') {
          setRetryWarning(data.message || 'Retries already in progress for this campaign')
          return
        }
        throw new Error(data.message || 'Failed to retry failed messages')
      }
      setRetryMessage(data.message || 'Queued failed messages for retry')
      await fetchDetailedMetrics()
    } catch (err) {
      console.error('Retry failed messages error:', err)
      setError(err.message)
    } finally {
      setRetryingFailed(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Campaign">
        <LoadingState message="Loading campaign..." />
      </AppShell>
    )
  }

  if (!campaign) {
    return (
      <AppShell title="Campaign">
        <Card className="max-w-2xl">
          <CardContent className="text-center space-y-3 py-10">
            <CardTitle>Campaign not found</CardTitle>
            <Button variant="secondary" onClick={() => navigate('/campaigns')}>Back to campaigns</Button>
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      title={campaign.name}
      subtitle={campaign.description || 'Campaign details'}
      actions={<Badge variant={statusVariant(campaign.status)} className="capitalize">{campaign.status}</Badge>}
    >
      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate('/campaigns')}>
          ← Back to Campaigns
        </Button>
      </div>

      {error && (
        <ErrorState
          title="Unable to load campaign details"
          description={error}
          onRetry={() => window.location.reload()}
          retryLabel="Reload"
          className="mb-4"
        />
      )}

      {resendError && (
        <Alert variant="error" className="mb-4">
          {resendError}
        </Alert>
      )}
      {resendSuccess && (
        <Alert variant="success" className="mb-4">
          {resendSuccess}
        </Alert>
      )}
      {retryWarning && (
        <Alert variant="warning" className="mb-4">
          {retryWarning}
        </Alert>
      )}
      {retryMessage && (
        <Alert variant="success" className="mb-4">
          {retryMessage}
        </Alert>
      )}
      {duplicateError && (
        <Alert variant="error" className="mb-4">
          {duplicateError}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-[var(--text-muted)]">
              <div className="font-semibold text-[var(--text)]">Channel</div>
              <div className="capitalize">{campaign.channel}</div>
            </div>
            {campaign.template_id && (
              <div className="text-sm text-[var(--text-muted)]">
                <div className="font-semibold text-[var(--text)]">Template</div>
                <div>{campaign.template_id}</div>
              </div>
            )}
            <div className="text-sm text-[var(--text-muted)]">
              <div className="font-semibold text-[var(--text)]">Created</div>
              <div>{new Date(campaign.created_at).toLocaleDateString()}</div>
            </div>
            {campaign.sent_at && (
              <div className="text-sm text-[var(--text-muted)]">
                <div className="font-semibold text-[var(--text)]">Sent</div>
                <div>{new Date(campaign.sent_at).toLocaleDateString()}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>Live delivery and engagement</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span>{sseConnected ? 'Webhooks live' : usePolling ? 'Polling' : 'Connecting...'}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Metric label="Total" value={totalMetric} />
              <Metric label="Queued" value={queuedMetric} accent="text-primary-600" />
              <Metric label="Processing" value={processingMetric} accent="text-blue-600" />
              <Metric label="Sent" value={sentMetric} accent="text-green-600" />
              <Metric label="Delivered" value={deliveredMetric} accent="text-purple-600" />
              <Metric label="Read" value={readMetric} accent="text-orange-600" />
              <Metric label="Failed" value={failedMetric} accent="text-red-600" />
              {detailedMetrics?.metrics?.read_rate !== undefined && (
                <Metric label="Read Rate" value={`${detailedMetrics.metrics.read_rate.toFixed(1)}%`} accent="text-indigo-600" />
              )}
            </div>
            {sseError && (
              <p className="text-xs text-red-500 mt-3">
                Real-time updates unavailable: {sseError}
              </p>
            )}
            {lastError && (
              <div className="mt-3">
                <Alert variant="error">
                  <div className="font-semibold">Delivery issues</div>
                  <p className="text-sm">Latest provider error: {lastError}</p>
                </Alert>
              </div>
            )}
            {showWebhookWait && (
              <div className="mt-3">
                <Alert variant="warning">
                  <div className="font-semibold">Waiting for webhook updates</div>
                  <p className="text-sm">Messages sent. Delivery/read will update when we receive webhook events from the provider.</p>
                </Alert>
              </div>
            )}

            {resendMetrics && (
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Original read rate</p>
                    <p className="text-lg font-semibold">
                      {originalReadRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)]">Resend read rate</p>
                    <p className="text-lg font-semibold text-green-600">
                      {resendReadRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">Additional reads</p>
                    <p className="text-lg font-semibold text-primary-600">
                      +{resendMetrics.additional_reads ?? 0}
                    </p>
                  </div>
                </div>
                {uplift && (
                  <Alert variant="success">
                    <div className="font-semibold mb-1">Resend uplift</div>
                    <p className="text-sm">{uplift.message}</p>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {campaign.message_content && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Message Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 font-mono text-sm whitespace-pre-wrap">
              {typeof campaign.message_content === 'string'
                ? campaign.message_content
                : JSON.stringify(campaign.message_content, null, 2)}
            </div>
          </CardContent>
        </Card>
      )}

      {campaign.audience_filters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Audience</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-muted)] space-y-2">
            {campaign.audience_filters.tags && campaign.audience_filters.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {campaign.audience_filters.tags.map((tag) => (
                  <Badge key={tag} variant="primary">{tag}</Badge>
                ))}
              </div>
            ) : (
              <p>All contacts</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {campaign.status === 'draft' ? (
          <>
            <Button onClick={() => setShowConfirm(true)} disabled={sending}>
              {sending ? 'Sending...' : 'Send Campaign'}
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/campaigns/${id}/edit`)}>
              Edit
            </Button>
          </>
        ) : (
          <>
            {!campaign.resend_of_campaign_id && campaign.status !== 'archived' && (
              <Button onClick={() => setShowResendConfirm(true)} disabled={resending}>
                {resending ? 'Starting resend...' : 'Resend to non-readers'}
              </Button>
            )}
            <Button variant="secondary" onClick={handleDuplicate} disabled={duplicating}>
              {duplicating ? 'Preparing draft...' : 'Edit as new draft'}
            </Button>
            {metrics?.failed > 0 && (
              <Button variant="secondary" onClick={handleRetryFailed} disabled={retryingFailed}>
                {retryingFailed ? 'Retrying failed...' : `Retry failed (${metrics.failed})`}
              </Button>
            )}
          </>
        )}
        <Button variant="secondary" onClick={() => navigate('/campaigns')}>
          Back
        </Button>
      </div>

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Send Campaign?"
        description="This will send the campaign to all contacts in your audience. This action cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendCampaign} disabled={sending}>
              {sending ? 'Sending...' : 'Confirm & Send'}
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-muted)]">
          Proceed to dispatch this campaign now?
        </p>
      </Dialog>

      <Dialog
        open={showResendConfirm}
        onClose={() => setShowResendConfirm(false)}
        title="Resend to non-readers?"
        description="We will send this campaign again to anyone who has not read it yet (once per campaign, 24h after the original send)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowResendConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleResendCampaign} disabled={resending}>
              {resending ? 'Starting...' : 'Confirm resend'}
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-muted)]">
          Need to nudge non-readers? We&apos;ll keep metrics linked for uplift tracking.
        </p>
      </Dialog>
    </AppShell>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${accent || 'text-[var(--text)]'}`}>{value}</div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  )
}
