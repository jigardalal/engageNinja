import React, { useState, useMemo, useEffect } from 'react'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  Badge,
  Button
} from '../components/ui'
import { AlertDescription } from '../components/ui/Alert'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import { AlertCircle, CheckCircle, TrendingUp, Check, X, Clock, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react'

const PLAN_TIERS = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
  enterprise: 4
}

const getActionType = (currentPlanId, targetPlanId) => {
  const currentTier = PLAN_TIERS[currentPlanId] || 0
  const targetTier = PLAN_TIERS[targetPlanId] || 0
  if (targetTier > currentTier) return 'upgrade'
  if (targetTier < currentTier) return 'downgrade'
  return 'current'
}

const getButtonLabel = (currentPlanId, targetPlanId, targetPlanName) => {
  const action = getActionType(currentPlanId, targetPlanId)
  if (action === 'upgrade') return `Upgrade to ${targetPlanName}`
  if (action === 'downgrade') return `Downgrade to ${targetPlanName}`
  return 'Current plan'
}

const getButtonVariant = (currentPlanId, targetPlanId) => {
  const action = getActionType(currentPlanId, targetPlanId)
  if (action === 'upgrade') return 'outline'
  if (action === 'downgrade') return 'outline'
  return 'disabled'
}

export default function BillingPage({ embedded = false }) {
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState(null)
  const [plans, setPlans] = useState([])
  const [error, setError] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  useEffect(() => {
    fetchData()
    const params = new URLSearchParams(window.location.search)
    if (params.has('session_id')) {
      const timer = setTimeout(fetchData, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [summaryRes, plansRes] = await Promise.all([
        fetch('/api/billing/summary', { credentials: 'include' }),
        fetch('/api/billing/plans', { credentials: 'include' })
      ])

      if (!summaryRes.ok || !plansRes.ok) {
        throw new Error('Failed to fetch billing data')
      }

      const summaryData = await summaryRes.json()
      const plansData = await plansRes.json()

      setBillingData(summaryData)
      setPlans(plansData.plans)
      setError(null)
    } catch (err) {
      console.error('Error fetching billing data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const syncSubscription = async () => {
    try {
      setSyncLoading(true)
      const response = await fetch('/api/billing/sync-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          setError(`${data.error}: ${data.details}`)
        } else {
          setError(data.error || data.message || 'Failed to sync subscription')
        }
        return
      }

      setBillingData(data)
      setError(null)
    } catch (err) {
      console.error('Error syncing subscription:', err)
      setError(err.message || 'Failed to sync subscription')
    } finally {
      setSyncLoading(false)
    }
  }

  const handleUpgrade = async (planId) => {
    try {
      setCheckoutLoading(true)
      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_key: planId })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const session = await response.json()
      if (session.url) {
        window.location.href = session.url
      }
    } catch (err) {
      console.error('Error creating checkout session:', err)
      setError(err.message)
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setCheckoutLoading(true)
      const response = await fetch('/api/billing/portal-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const session = await response.json()
      if (session.url) {
        window.location.href = session.url
      }
    } catch (err) {
      console.error('Error creating portal session:', err)
      setError(err.message)
    } finally {
      setCheckoutLoading(false)
    }
  }

  const Shell = ({ children }) => (
    embedded ? <div className="space-y-6">{children}</div> : (
      <AppShell hideTitleBlock title="Billing" subtitle="Manage your subscription and payments">
        {children}
      </AppShell>
    )
  )

  const headerHelper = useMemo(() => {
    if (!billingData) return 'Latest billing status'
    const status = billingData.billing_status?.subscription_status || 'active'
    return `${billingData.plan?.name || 'Free plan'} • ${status}`
  }, [billingData])

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <SecondaryAction onClick={syncSubscription} disabled={syncLoading}>
        <RefreshCw className="h-4 w-4" />
        Sync status
      </SecondaryAction>
      <PrimaryAction onClick={handleManageSubscription} disabled={checkoutLoading}>
        <CreditCard className="h-4 w-4" />
        Manage billing portal
      </PrimaryAction>
    </div>
  )

  const subscriptionSeverity = useMemo(() => {
    const status = billingData?.billing_status?.subscription_status
    if (status === 'failed') return 'destructive'
    if (status === 'cancelled') return 'secondary'
    if (billingData?.billing_status?.is_in_grace_period) return 'warning'
    return 'success'
  }, [billingData])

  if (loading) {
    return (
      <Shell>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
                <p className="text-sm text-[var(--text-muted)]">Loading billing information...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <PageHeader
        icon={CreditCard}
        title="Billing & Subscription"
        description="Stay on top of your plan, payment status, and billing history."
        helper={headerHelper}
        actions={headerActions}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {billingData?.billing_status?.is_in_grace_period && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 space-y-1">
            <p className="font-semibold">⚠️ Payment Failed — Grace Period Active</p>
            <p>Your payment failed ({billingData.billing_status.failure_reason}). Update your card before the deadline.</p>
            <p className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3" />
              {new Date(billingData.billing_status.grace_period_until).toLocaleString()}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {billingData?.billing_status?.subscription_status === 'failed' && !billingData?.billing_status?.is_in_grace_period && (
        <Alert variant="destructive" className="border-red-400 bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <AlertDescription className="space-y-1 text-red-900">
            <p className="font-semibold">❌ Payment Failed — Action Required</p>
            <p>Your campaigns are paused until payment is reset.</p>
            <PrimaryAction onClick={handleManageSubscription} disabled={checkoutLoading}>
              Update payment method
            </PrimaryAction>
          </AlertDescription>
        </Alert>
      )}

      {billingData?.billing_status?.subscription_status === 'cancelled' && (
        <Alert variant="secondary" className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="space-y-1 text-amber-900">
            <p className="font-semibold">📋 Subscription Cancelled</p>
            <p>Your subscription was cancelled and reverted to the free tier.</p>
            {billingData?.billing_status?.subscription_cancelled_at && (
              <p>Cancelled on {new Date(billingData.billing_status.subscription_cancelled_at).toLocaleDateString()}</p>
            )}
            <SecondaryAction onClick={handleManageSubscription} disabled={checkoutLoading}>
              Reactivate subscription
            </SecondaryAction>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {billingData && (
          <Card variant="glass" className="space-y-4">
            <CardHeader>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-xl">Current plan</CardTitle>
              </div>
                <CardDescription>{billingData.plan?.description || "You're subscribed to the selected tier."}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Active plan</p>
                <p className="text-3xl font-bold capitalize text-[var(--text)]">{billingData.plan?.name}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {billingData.billing?.price ? (
                    <>
                      <span className="text-2xl font-bold text-[var(--text)]">${billingData.billing.price.toFixed(2)}</span>
                      <span className="ml-1 text-[var(--text-muted)]">/month</span>
                    </>
                  ) : (
                    'Free plan — no charges'
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={subscriptionSeverity} className="flex items-center gap-1 font-semibold">
                  {subscriptionSeverity === 'destructive' && <AlertCircle className="h-3 w-3" />}
                  {billingData.billing_status?.subscription_status || 'Active'}
                </Badge>
                {billingData.subscription?.current_period_end && (
                  <p className="text-xs text-[var(--text-muted)]">Renews {new Date(billingData.subscription.current_period_end).toLocaleDateString()}</p>
                )}
                {billingData.subscription?.cancel_at_period_end && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg">⚠ Will cancel at period end</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">Choose your plan</CardTitle>
            </div>
            <CardDescription>Upgrade or downgrade anytime without long-term contracts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300 ${plan.isCurrent ? 'border-2 border-primary/50 bg-primary/5 shadow-lg scale-100' : 'border border-[var(--border)] bg-[var(--card)] hover:border-primary/30 hover:shadow-lg hover:scale-[1.01]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold capitalize text-[var(--text)]">{plan.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">{plan.description}</p>
                    </div>
                    {plan.isCurrent && (
                      <Badge variant="secondary" className="uppercase text-xs">Active</Badge>
                    )}
                  </div>
                  <div>
                    {plan.price ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-[var(--text)]">${Number(plan.price).toFixed(2)}</span>
                        <span className="text-sm text-[var(--text-muted)]">/month</span>
                      </div>
                    ) : (
                      <span className="text-4xl font-bold text-[var(--text)]">Free</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-[var(--text-muted)]">
                    {['whatsapp', 'email', 'sms', 'users'].map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        {plan.features?.[feature] > 0 ? (
                          <Check className="mt-1 h-4 w-4 text-green-600" />
                        ) : (
                          <X className="mt-1 h-4 w-4 text-gray-300" />
                        )}
                        <span>
                          {feature === 'users' ? `${plan.features[feature] || 0} team members` : `${plan.features[feature] || 0} ${feature === 'whatsapp' ? 'WhatsApp' : feature === 'email' ? 'Email' : 'SMS'} messages/mo`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={checkoutLoading || plan.isCurrent}
                    variant={plan.isCurrent ? 'ghost' : 'primary'}
                    className="mt-auto"
                  >
                    {getButtonLabel(billingData?.plan?.id, plan.id, plan.name)}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}
