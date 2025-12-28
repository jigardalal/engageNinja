import React from 'react'
import { Alert, Card, CardContent, Button } from '../ui'
import { ArrowRight, Sparkles, CheckCircle } from 'lucide-react'

/**
 * UpgradeBanner Component
 *
 * Reusable upgrade prompt banner with two variants:
 * - compact: Single-line banner with icon + message + CTA
 * - full: Card with feature list + benefits + CTA
 *
 * Usage:
 * <UpgradeBanner
 *   variant="compact"
 *   message="Unlock scheduled sending"
 *   benefits={['Schedule sends', '5x capacity']}
 *   onUpgrade={() => navigate('/settings?tab=billing')}
 * />
 */
export default function UpgradeBanner({
  variant = 'compact',
  title,
  message,
  benefits = [],
  onUpgrade,
  dismissible = false,
  onDismiss,
  icon: Icon = Sparkles,
  ctaText = 'Upgrade Plan'
}) {
  if (variant === 'compact') {
    return (
      <Alert variant="info" className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <Icon className="h-4 w-4 text-primary-600 flex-shrink-0" />
          <span className="text-sm font-medium text-[var(--text)]">{message}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={onUpgrade}
            className="gap-1"
          >
            {ctaText}
            <ArrowRight className="h-3 w-3" />
          </Button>
          {dismissible && (
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </Alert>
    )
  }

  // Full variant
  return (
    <Card variant="glass">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/20">
              <Icon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text)]">{title || message}</h3>
              {title && (
                <p className="text-sm text-[var(--text-muted)] mt-1">{message}</p>
              )}
            </div>
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-lg"
            >
              ✕
            </button>
          )}
        </div>

        {/* Benefits list */}
        {benefits && benefits.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-[var(--text)]">{benefit}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <Button
          onClick={onUpgrade}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white gap-2"
        >
          {ctaText}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
