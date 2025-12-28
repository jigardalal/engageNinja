import React from 'react'
import { cn } from '../../lib/utils'

export default function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  meta,
  className,
  helper
}) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between pb-6">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
          )}
          <div>
            {title && <h1 className="text-h1 text-[var(--text)]">{title}</h1>}
            {description && <p className="text-body text-[var(--text-muted)] mt-1">{description}</p>}
            {helper && <p className="text-caption uppercase tracking-[0.15em] text-[var(--text-muted)] mt-1">{helper}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {meta && (
        <div className="pb-4 border-b border-[var(--border)]">
          {typeof meta === 'string' ? <p className="text-body-sm text-[var(--text-muted)]">{meta}</p> : meta}
        </div>
      )}
    </div>
  )
}
