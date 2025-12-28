import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../ui'
import { Check, X, ArrowRight } from 'lucide-react'

/**
 * PlanComparisonWidget Component
 *
 * Side-by-side comparison of current plan vs next tier.
 * Highlights features available in next tier to encourage upgrade.
 *
 * Usage:
 * <PlanComparisonWidget
 *   currentPlan={{ id: 'free', name: 'Free' }}
 *   nextPlan={{ id: 'starter', name: 'Starter', price: 49 }}
 *   onUpgrade={() => navigate('/settings?tab=billing')}
 * />
 */
export default function PlanComparisonWidget({ currentPlan = {}, nextPlan = {}, onUpgrade }) {
  const PLAN_FEATURES = {
    free: {
      whatsapp: '100',
      email: '500',
      sms: '0',
      contacts: '100',
      users: '1',
      automation: 'Limited',
      scheduling: false,
      bulkActions: false,
      apiAccess: false,
      prioritySupport: false
    },
    starter: {
      whatsapp: '250',
      email: '10,000',
      sms: '500',
      contacts: '500',
      users: '2',
      automation: 'Yes',
      scheduling: true,
      bulkActions: false,
      apiAccess: false,
      prioritySupport: false
    },
    growth: {
      whatsapp: '1,000',
      email: '50,000',
      sms: '2,000',
      contacts: '2,500',
      users: '5',
      automation: 'Advanced',
      scheduling: true,
      bulkActions: true,
      apiAccess: false,
      prioritySupport: false
    },
    pro: {
      whatsapp: '5,000',
      email: '200,000',
      sms: '10,000',
      contacts: 'Unlimited',
      users: 'Unlimited',
      automation: 'Advanced',
      scheduling: true,
      bulkActions: true,
      apiAccess: true,
      prioritySupport: true
    },
    enterprise: {
      whatsapp: 'Custom',
      email: 'Custom',
      sms: 'Custom',
      contacts: 'Unlimited',
      users: 'Unlimited',
      automation: 'Advanced',
      scheduling: true,
      bulkActions: true,
      apiAccess: true,
      prioritySupport: true
    }
  }

  const featureList = [
    { key: 'whatsapp', label: 'WhatsApp/month', type: 'number' },
    { key: 'email', label: 'Email/month', type: 'number' },
    { key: 'sms', label: 'SMS/month', type: 'number' },
    { key: 'contacts', label: 'Max contacts', type: 'number' },
    { key: 'users', label: 'Team members', type: 'number' },
    { key: 'automation', label: 'Automation', type: 'text' },
    { key: 'scheduling', label: 'Schedule sends', type: 'boolean' },
    { key: 'bulkActions', label: 'Bulk actions', type: 'boolean' },
    { key: 'apiAccess', label: 'API access', type: 'boolean' },
    { key: 'prioritySupport', label: 'Priority support', type: 'boolean' }
  ]

  const currentFeatures = PLAN_FEATURES[currentPlan.id] || PLAN_FEATURES.free
  const nextFeatures = PLAN_FEATURES[nextPlan?.id] || PLAN_FEATURES.starter

  const newFeatures = useMemo(() => {
    return featureList.filter(feature => {
      const current = currentFeatures[feature.key]
      const next = nextFeatures[feature.key]

      if (feature.type === 'boolean') {
        return !current && next
      } else if (feature.type === 'number') {
        const currentVal = parseInt(String(current).replace(/,/g, '')) || 0
        const nextVal = parseInt(String(next).replace(/,/g, '')) || 0
        return currentVal < nextVal
      }
      return current !== next
    })
  }, [currentFeatures, nextFeatures])

  if (!nextPlan || nextPlan.id === currentPlan.id) {
    return null
  }

  return (
    <Card variant="glass" className="border-primary-200 dark:border-primary-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upgrade Comparison</CardTitle>
            <CardDescription>See what you get with {nextPlan.name}</CardDescription>
          </div>
          <Badge variant="primary" className="whitespace-nowrap">
            {newFeatures.length} new features
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Current Plan */}
          <div className="p-4 rounded-lg border border-[var(--border)] bg-white/50 dark:bg-slate-900/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Your Current Plan
            </p>
            <h4 className="text-lg font-bold text-[var(--text)] mb-4">{currentPlan.name}</h4>

            <div className="space-y-2 text-sm">
              {featureList.slice(0, 5).map(feature => (
                <div key={feature.key} className="flex items-center justify-between text-[var(--text)]">
                  <span className="text-[var(--text-muted)]">{feature.label}:</span>
                  <span className="font-semibold">{currentFeatures[feature.key]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Plan */}
          <div className="p-4 rounded-lg border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                Upgrade To
              </p>
              <Badge variant="primary">{nextPlan.price}/mo</Badge>
            </div>
            <h4 className="text-lg font-bold text-[var(--text)] mb-4">{nextPlan.name}</h4>

            <div className="space-y-2 text-sm">
              {featureList.slice(0, 5).map(feature => (
                <div key={feature.key} className="flex items-center justify-between text-[var(--text)]">
                  <span className="text-[var(--text-muted)]">{feature.label}:</span>
                  <span className="font-semibold text-primary-600">{nextFeatures[feature.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        {newFeatures.length > 0 && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900">
            <h5 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
              <Check className="h-4 w-4" />
              What You'll Unlock
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {newFeatures.map(feature => (
                <div key={feature.key} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="mt-6">
          <Button
            onClick={onUpgrade}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white gap-2"
          >
            Upgrade to {nextPlan.name}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
