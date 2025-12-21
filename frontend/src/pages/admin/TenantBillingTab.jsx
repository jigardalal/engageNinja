import React, { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle, TrendingUp, Download } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  LoadingState,
  EmptyState,
  ErrorState,
  PrimaryAction,
  SecondaryAction
} from '../../components/ui'
import UsageBar from '../../components/billing/UsageBar'

export default function TenantBillingTab({ tenantId }) {
  const [billingData, setBillingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState(null)

  const usageSummary = billingData?.usage ?? {
    whatsapp_messages: 0,
    emails: 0,
    sms: 0
  }
  const limitSummary = billingData?.limits ?? {
    whatsapp_messages: 0,
    emails: 0,
    sms: 0
  }
  const remainingSummary = billingData?.remaining ?? {
    whatsapp_messages: 0,
    emails: 0,
    sms: 0
  }

  const formatCount = (value) => {
    const normalized = Number(value ?? 0)
    return Number.isFinite(normalized) ? normalized.toLocaleString() : '0'
  }

  const fetchBillingSummary = useCallback(async () => {
    if (!tenantId) {
      setError('Tenant ID is missing')
      setBillingData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/billing`, {
        credentials: 'include'
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load billing data')
      }
      setBillingData(data)
    } catch (err) {
      console.error('Failed to load tenant billing data:', err)
      setBillingData(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchBillingSummary()
  }, [fetchBillingSummary])

  const handleInitiateCheckout = async () => {
    if (checkoutLoading || !tenantId) return
    setCheckoutLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/billing/checkout-session`, {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create checkout session')
      }
      if (data.url) {
        window.open(data.url, '_blank', 'noopener')
      } else {
        throw new Error('Checkout URL not returned')
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err)
      setError(err.message)
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleOpenPortal = async () => {
    if (portalLoading || !tenantId) return
    setPortalLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/billing/portal-session`, {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create Stripe portal session')
      }
      if (data.url) {
        window.open(data.url, '_blank', 'noopener')
      } else {
        throw new Error('Stripe portal URL not returned')
      }
    } catch (err) {
      console.error('Failed to create billing portal session:', err)
      setError(err.message)
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <Card variant="glass">
        <CardContent>
          <LoadingState message="Loading billing summary..." />
        </CardContent>
      </Card>
    )
  }

  if (!billingData) {
    return (
      <Card variant="glass">
        <CardContent className="space-y-4">
          {error && (
            <ErrorState title="Unable to load billing" description={error} />
          )}
          <EmptyState
            title="No billing summary"
            description="We could not retrieve Stripe billing data yet. Refresh or try again later."
            icon={AlertCircle}
          />
          <div className="flex gap-2">
            <Button onClick={fetchBillingSummary}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState title="Billing warning" description={error} />
      )}
      <Card variant="glass" className="space-y-6">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Billing overview</CardTitle>
                <CardDescription className="text-slate-500">
                  Stripe subscription and usage snapshot for this tenant.
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--text)] capitalize">
                  {billingData.plan?.name || 'Unknown'}
                </p>
                {billingData.subscription && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {billingData.subscription.status === 'active' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" /> Active
                      </span>
                    ) : (
                      `Status: ${billingData.subscription.status}`
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">WhatsApp</p>
              <UsageBar
                label="WhatsApp"
                used={usageSummary.whatsapp_messages}
                limit={limitSummary.whatsapp_messages}
                remaining={remainingSummary.whatsapp_messages}
              />
              <p className="text-xs text-[var(--text-muted)]">
                Used {formatCount(usageSummary.whatsapp_messages)} of {formatCount(limitSummary.whatsapp_messages)}
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Email</p>
              <UsageBar
                label="Email"
                used={usageSummary.emails}
                limit={limitSummary.emails}
                remaining={remainingSummary.emails}
              />
              <p className="text-xs text-[var(--text-muted)]">
                Used {formatCount(usageSummary.emails)} of {formatCount(limitSummary.emails)} email sends
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">SMS</p>
              <UsageBar
                label="SMS"
                used={usageSummary.sms}
                limit={limitSummary.sms}
                remaining={remainingSummary.sms}
              />
              <p className="text-xs text-[var(--text-muted)]">
                Used {formatCount(usageSummary.sms)} of {formatCount(limitSummary.sms)} SMS sends
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Remaining quota</p>
              <div className="rounded-2xl bg-white/80 p-4 shadow-inner dark:bg-slate-900/70">
                <p className="text-sm text-[var(--text-muted)]">WhatsApp · Email · SMS remaining</p>
                <p className="text-lg font-semibold text-[var(--text)]">
                  {formatCount(remainingSummary.whatsapp_messages)} · {formatCount(remainingSummary.emails)} · {formatCount(remainingSummary.sms)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 justify-end">
          <PrimaryAction onClick={handleInitiateCheckout} disabled={checkoutLoading}>
            <Download className="h-4 w-4" /> New checkout
          </PrimaryAction>
          <SecondaryAction onClick={handleOpenPortal} disabled={portalLoading}>
            <TrendingUp className="h-4 w-4" /> Open Stripe portal
          </SecondaryAction>
        </CardFooter>
      </Card>
    </div>
  )
}
