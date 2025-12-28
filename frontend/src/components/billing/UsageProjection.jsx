import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, Badge } from '../ui'
import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react'

/**
 * UsageProjection Component
 *
 * Predicts if user will exceed usage limits based on current pace.
 * Shows projection for each channel (WhatsApp, Email, SMS).
 *
 * Logic:
 * - Daily average = current usage / days into month
 * - Projected usage = daily average * total days in month
 * - Shows warning if projected to exceed
 *
 * Usage:
 * <UsageProjection
 *   usage={{ whatsapp_messages: 450, emails: 1200, sms: 50 }}
 *   limits={{ whatsapp_messages: 1000, emails: 5000, sms: 500 }}
 *   plan={{ id: 'starter', name: 'Starter' }}
 * />
 */
export default function UsageProjection({ usage = {}, limits = {}, plan = {} }) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()

  const projections = useMemo(() => {
    const channels = ['whatsapp_messages', 'emails', 'sms']
    const result = {}

    channels.forEach(channel => {
      const currentUsage = usage[channel] || 0
      const limit = limits[channel]

      if (!limit || limit === 0) {
        result[channel] = { willExceed: false, projected: 0, daysRemaining: daysInMonth - dayOfMonth }
        return
      }

      const dailyAverage = dayOfMonth > 0 ? currentUsage / dayOfMonth : 0
      const projectedUsage = dailyAverage * daysInMonth
      const willExceed = projectedUsage > limit

      result[channel] = {
        willExceed,
        projected: Math.round(projectedUsage),
        daysRemaining: daysInMonth - dayOfMonth,
        overage: Math.round(projectedUsage - limit),
        percentage: Math.round((projectedUsage / limit) * 100)
      }
    })

    return result
  }, [usage, limits, dayOfMonth, daysInMonth])

  const channelLabels = {
    whatsapp_messages: 'WhatsApp',
    emails: 'Email',
    sms: 'SMS'
  }

  const hasWarnings = Object.values(projections).some(p => p.willExceed)

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <div>
              <CardTitle>Usage Projection</CardTitle>
              <CardDescription>Forecast based on current pace</CardDescription>
            </div>
          </div>
          {hasWarnings && (
            <Badge variant="warning" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Overage risk
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {['whatsapp_messages', 'emails', 'sms'].map(channel => {
          const projection = projections[channel]
          const currentUsage = usage[channel] || 0
          const limit = limits[channel]
          const label = channelLabels[channel]

          if (!limit || limit === 0) {
            return (
              <div key={channel} className="p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-[var(--border)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{label}</p>
                    <p className="text-xs text-[var(--text-muted)]">Unlimited</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            )
          }

          return (
            <div
              key={channel}
              className={`p-3 rounded-lg border ${
                projection.willExceed
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-white/50 dark:bg-slate-900/50 border-[var(--border)]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{label}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Current: {currentUsage.toLocaleString()} / {limit.toLocaleString()}
                  </p>
                </div>
                {projection.willExceed && (
                  <Badge variant="error" className="text-xs">
                    +{projection.overage.toLocaleString()} overage
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-[var(--text)]">
                    Projected: {projection.projected.toLocaleString()}
                  </p>
                  <p className="text-[var(--text-muted)]">
                    {projection.daysRemaining} days remaining
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${projection.willExceed ? 'text-red-600' : 'text-green-600'}`}>
                    {projection.percentage}%
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {hasWarnings && (
          <Alert variant="warning" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <div className="ml-2">
              <p className="font-semibold text-sm">Approaching limits</p>
              <p className="text-xs text-[var(--text-muted)]">
                Based on your current usage pace, you may exceed your plan limits this month.
                <a href="/settings?tab=billing" className="ml-1 text-primary-600 hover:underline">
                  Upgrade plan
                </a>
              </p>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
