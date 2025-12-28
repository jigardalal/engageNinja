import React, { useState } from 'react'
import { Dialog, Button } from '../ui'
import { Lock, CheckCircle } from 'lucide-react'
import { useFeatureAccess } from '../../hooks/useFeatureAccess'

/**
 * FeatureLock Component
 *
 * Wraps premium features to lock them behind plan tiers.
 * Shows a lock overlay and modal with upgrade prompt when user lacks access.
 *
 * Usage:
 * <FeatureLock
 *   feature="Scheduled Sending"
 *   requiredPlan="starter"
 *   benefits={['Schedule sends', 'Resend workflows', '5x capacity']}
 *   onUpgrade={() => navigate('/settings?tab=billing')}
 * >
 *   <Button>Schedule Send</Button>
 * </FeatureLock>
 */
export default function FeatureLock({
  feature,
  requiredPlan = 'starter',
  benefits = [],
  children,
  onUpgrade
}) {
  const { hasAccess, currentPlan, currentTier, requiredTier } = useFeatureAccess(requiredPlan)
  const [showModal, setShowModal] = useState(false)

  // If user has access, render children normally
  if (hasAccess) {
    return <>{children}</>
  }

  const PLAN_NAMES = {
    free: 'Free',
    starter: 'Starter',
    growth: 'Growth',
    pro: 'Pro',
    enterprise: 'Enterprise'
  }

  const TIER_PRICES = {
    starter: '$49/mo',
    growth: '$129/mo',
    pro: '$299/mo',
    enterprise: 'Custom'
  }

  return (
    <>
      {/* Locked overlay wrapper */}
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>

        {/* Lock icon overlay */}
        <button
          onClick={() => setShowModal(true)}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/5 hover:bg-black/10 transition-colors cursor-pointer backdrop-blur-sm"
          aria-label={`Feature locked: ${feature}`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-lg">
              <Lock className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-xs font-semibold text-white drop-shadow-md">
              {PLAN_NAMES[requiredPlan]} feature
            </p>
          </div>
        </button>
      </div>

      {/* Feature lock modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        title={feature}
        description={`This feature is available on ${PLAN_NAMES[requiredPlan]} and above.`}
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Maybe later
            </Button>
            <Button
              onClick={() => {
                setShowModal(false)
                onUpgrade?.()
              }}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Unlock now
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Current plan info */}
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
            <p className="text-xs text-[var(--text-muted)]">YOUR CURRENT PLAN</p>
            <p className="text-lg font-semibold text-[var(--text)]">
              {PLAN_NAMES[currentPlan]}
            </p>
          </div>

          {/* Benefits list */}
          {benefits && benefits.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--text)]">
                {PLAN_NAMES[requiredPlan]} includes:
              </p>
              <div className="space-y-2">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[var(--text)]">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="p-3 rounded-lg border border-[var(--border)] bg-white/50 dark:bg-slate-900/50">
            <p className="text-xs text-[var(--text-muted)] mb-1">STARTING PRICE</p>
            <p className="text-xl font-bold text-[var(--text)]">
              {TIER_PRICES[requiredPlan] || 'Contact sales'}
            </p>
          </div>
        </div>
      </Dialog>
    </>
  )
}
