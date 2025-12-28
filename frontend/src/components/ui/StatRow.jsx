import React from 'react'
import { cn } from '../../lib/utils'

/**
 * StatRow Component
 *
 * Purpose: Horizontal row of stats for top-of-page summaries
 * Replaces sidebar stat cards with compact horizontal layout
 *
 * Usage:
 * <StatRow
 *   stats={[
 *     { label: 'Active', value: 42, icon: Activity },
 *     { label: 'Total Contacts', value: '1,234', icon: Users },
 *     { label: 'Read Rate', value: '85%', icon: Eye },
 *     { label: 'Last Send', value: 'Today', icon: Clock }
 *   ]}
 * />
 *
 * Responsive: 4-col → 2-col → 1-col based on breakpoints
 */
export function StatRow({ stats, className }) {
  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm",
      className
    )}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-3">
          {stat.icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
              <stat.icon className="h-5 w-5 text-primary-500" aria-hidden />
            </div>
          )}
          <div>
            <p className="text-caption uppercase tracking-[0.15em] text-[var(--text-muted)]">
              {stat.label}
            </p>
            <p className="text-h3 font-semibold text-[var(--text)]">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatRow
