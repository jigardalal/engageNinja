import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, Badge } from '../components/ui'
import { AlertDescription } from '../components/ui/Alert'
import { PrimaryAction, SecondaryAction } from '../components/ui/ActionButtons'
import UsageBar from '../components/billing/UsageBar'
import UsageAlert from '../components/billing/UsageAlert'
import { AlertCircle, TrendingUp, Zap, Mail, MessageSquare, RefreshCw, Users } from 'lucide-react'

export default function UsagePage({ embedded = false }) {
  const { activeTenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState(null)
  const [error, setError] = useState(null)
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    // Load from localStorage
    const stored = localStorage.getItem('dismissedUsageAlerts')
    return stored ? JSON.parse(stored) : {}
  })

  useEffect(() => {
    if (!activeTenant) {
      return
    }
    fetchData()
  }, [activeTenant])

  const fetchData = async () => {
    try {
      setLoading(true)
      const summaryRes = await fetch('/api/billing/summary', { credentials: 'include' })

      if (!summaryRes.ok) {
        throw new Error('Failed to fetch usage data')
      }

      const summaryData = await summaryRes.json()
      setBillingData(summaryData)
      setError(null)
    } catch (err) {
      console.error('Error fetching usage data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const Shell = ({ children }) => (
    embedded ? <div className="space-y-6">{children}</div> : (
      <AppShell hideTitleBlock title="Usage & Billing" subtitle="Monitor usage and limits">
        {children}
      </AppShell>
    )
  )

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-amber-600'
    return 'text-green-600'
  }

  // Check if alert should be shown (not dismissed and usage > 70%)
  const shouldShowAlert = (channel, percentage) => {
    if (percentage < 70) return false
    const threshold = Math.floor(percentage / 10) * 10
    const dismissKey = `${channel}-${threshold}`
    return !dismissedAlerts[dismissKey]
  }

  // Handle alert dismissal
  const handleDismissAlert = (channel, percentage) => {
    const threshold = Math.floor(percentage / 10) * 10
    const dismissKey = `${channel}-${threshold}`
    const updated = { ...dismissedAlerts, [dismissKey]: Date.now() }
    setDismissedAlerts(updated)
    localStorage.setItem('dismissedUsageAlerts', JSON.stringify(updated))
  }

  // Get next tier plan
  const getNextTierPlan = (currentPlanId) => {
    const planOrder = ['free', 'starter', 'growth', 'pro', 'enterprise']
    const currentIndex = planOrder.indexOf(currentPlanId)
    return planOrder[currentIndex + 1]
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
            <p className="text-[var(--text-muted)] text-lg">Loading usage data...</p>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <PageHeader
        icon={TrendingUp}
        title="Usage overview"
        description="Track WhatsApp, email, and SMS consumption relative to plan limits."
        helper={`Billing period: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`}
        actions={(
          <SecondaryAction onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </SecondaryAction>
        )}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {billingData && (
        <div className="space-y-6">
          {/* Usage Alerts */}
          <div className="space-y-3">
            {(() => {
              const alerts = [];
              const channels = ['whatsapp_messages', 'emails', 'sms'];
              const channelNames = { whatsapp_messages: 'whatsapp', emails: 'email', sms: 'sms' };
              const nextTierPlanId = getNextTierPlan(billingData.plan?.id);

              channels.forEach(channel => {
                const percentage = getUsagePercentage(
                  billingData.usage[channel],
                  billingData.limits[channel]
                );

                if (shouldShowAlert(channelNames[channel], percentage)) {
                  const channelLabel = channel === 'whatsapp_messages' ? 'whatsapp'
                    : channel === 'emails' ? 'email'
                    : 'sms';

                  // Find next tier plan details
                  let nextTierDetails = null;
                  if (billingData.plan?.id === 'free') {
                    nextTierDetails = { name: 'Starter', price: 49, limit: 250 };
                    if (channelLabel === 'email') nextTierDetails.limit = 10000;
                    if (channelLabel === 'sms') nextTierDetails.limit = 500;
                  } else if (billingData.plan?.id === 'starter') {
                    nextTierDetails = { name: 'Growth', price: 129, limit: 1000 };
                    if (channelLabel === 'email') nextTierDetails.limit = 50000;
                    if (channelLabel === 'sms') nextTierDetails.limit = 2000;
                  } else if (billingData.plan?.id === 'growth') {
                    nextTierDetails = { name: 'Pro', price: 299, limit: 5000 };
                    if (channelLabel === 'email') nextTierDetails.limit = 200000;
                    if (channelLabel === 'sms') nextTierDetails.limit = 10000;
                  }

                  if (nextTierDetails) {
                    alerts.push(
                      <UsageAlert
                        key={channelLabel}
                        channel={channelLabel}
                        used={billingData.usage[channel]}
                        limit={billingData.limits[channel]}
                        currentPlan={billingData.plan?.name}
                        targetPlan={nextTierDetails.name}
                        targetPrice={nextTierDetails.price}
                        targetLimit={nextTierDetails.limit}
                        onUpgrade={() => window.location.href = '/settings?tab=billing'}
                        onDismiss={() => handleDismissAlert(channelLabel, percentage)}
                      />
                    );
                  }
                }
              });

              return alerts.length > 0 ? alerts : null;
            })()}
          </div>

          <Card variant="glass" className="space-y-4">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-xl">Current usage</CardTitle>
              </div>
              <CardDescription>{billingData.plan?.name || 'Plan limits'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[{
                label: 'WhatsApp',
                icon: Zap,
                used: billingData.usage.whatsapp_messages,
                limit: billingData.limits.whatsapp_messages
              }, {
                label: 'Email',
                icon: Mail,
                used: billingData.usage.emails,
                limit: billingData.limits?.emails
              }, {
                label: 'SMS',
                icon: MessageSquare,
                used: billingData.usage.sms,
                limit: billingData.limits?.sms
              }].map(({ label, icon: Icon, used, limit }) => {
                const percentage = getUsagePercentage(used, limit)
                return (
                  <div key={label} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary-600" />
                        <span className="font-medium text-[var(--text)]">{label} messages</span>
                      </div>
                      <span className={`text-sm font-semibold ${getStatusColor(percentage)}`}>
                        {used?.toLocaleString()} / {limit?.toLocaleString() || '∞'}
                      </span>
                    </div>
                    <UsageBar used={used} limit={limit} />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary-500" />
                <CardTitle className="text-xl">Plan limits & perks</CardTitle>
              </div>
              <CardDescription>Summary of the max usage and user counts included.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">Team members</p>
                  <p className="text-3xl font-bold text-[var(--text)] mt-3">{billingData.plan_limits?.max_users || '∞'}</p>
                  <p className="text-xs text-[var(--text-muted)]">included</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">Contact limit</p>
                  <p className="text-3xl font-bold text-[var(--text)] mt-3">{billingData.plan_limits?.contacts_limit?.toLocaleString() || '∞'}</p>
                  <p className="text-xs text-[var(--text-muted)]">contacts</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">Automation tasks</p>
                  <p className="text-3xl font-bold text-[var(--text)] mt-3">{billingData.plan_limits?.automation_tasks || '∞'}</p>
                  <p className="text-xs text-[var(--text-muted)]">per month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Shell>
  )
}
