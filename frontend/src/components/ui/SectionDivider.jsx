import React from 'react'
import { cn } from '../../lib/utils'

/**
 * SectionDivider Component
 *
 * Purpose: Replace card separations with minimal horizontal dividers
 *
 * Usage:
 * <SectionDivider
 *   label="Campaign Health"
 *   action={<Button>Action</Button>}
 *   spacing="normal"
 * />
 *
 * Spacing Options:
 * - tight: 16px margins
 * - normal: 24px margins
 * - loose: 32px margins
 */
export function SectionDivider({
  label,
  action,
  className,
  spacing = 'normal'
}) {
  const spacingClasses = {
    tight: 'my-4',
    normal: 'my-6',
    loose: 'my-8'
  }

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {label || action ? (
        <div className="flex items-center justify-between mb-3">
          {label && (
            <h3 className="text-caption uppercase tracking-[0.2em] font-semibold text-[var(--text-muted)]">
              {label}
            </h3>
          )}
          {action}
        </div>
      ) : null}
      <div className="border-t border-[var(--border)]" />
    </div>
  )
}

export default SectionDivider
