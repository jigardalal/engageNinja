import React from 'react'
import { cn } from '../../lib/utils'

/**
 * StatBlock Component
 *
 * Purpose: Replace metric cards with minimal, focused stat display
 *
 * Usage:
 * <StatBlock
 *   label="Contacts"
 *   value={1234}
 *   subtitle="Reachable audience"
 *   icon={Users}
 *   variant="subtle"
 * />
 *
 * Variants:
 * - default: Transparent background
 * - subtle: Light background with backdrop blur
 * - bordered: Border + padding
 */
export function StatBlock({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  className
}) {
  const variants = {
    default: 'bg-transparent',
    subtle: 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl p-4',
    bordered: 'border border-[var(--border)] rounded-2xl p-4'
  }

  return (
    <div className={cn(variants[variant], className)}>
      {Icon && (
        <div className="inline-flex items-center justify-center rounded-xl bg-primary-500/10 p-2 mb-2">
          <Icon className="h-5 w-5 text-primary-500" aria-hidden />
        </div>
      )}
      <p className="text-caption uppercase tracking-[0.15em] text-[var(--text-muted)] mb-1">
        {label}
      </p>
      <p className="text-h2 font-semibold text-[var(--text)] mb-0.5">
        {value}
      </p>
      {subtitle && (
        <p className="text-body-sm text-[var(--text-muted)]">
          {subtitle}
        </p>
      )}
      {trend && (
        <div className={cn(
          "text-body-sm font-medium mt-1",
          trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
        )}>
          {trend.label}
        </div>
      )}
    </div>
  )
}

export default StatBlock
