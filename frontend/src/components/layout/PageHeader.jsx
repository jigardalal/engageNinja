import React from 'react'
import { cn } from '../../lib/utils'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../ui'

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
    <Card
      variant="glass"
      className={cn('w-full border border-white/30 bg-white/60 dark:bg-slate-900/60 shadow-lg', className)}
    >
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {Icon && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 dark:bg-slate-800/70 text-primary-500 shadow-inner">
              <Icon className="h-7 w-7" aria-hidden />
            </div>
          )}
          <div>
            {title && <CardTitle className="text-2xl md:text-3xl">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
            {helper && <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{helper}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </CardHeader>
      {meta && (
        <CardContent className="flex flex-col gap-2 pt-0 pb-5">
          {typeof meta === 'string' ? (
            <p className="text-sm text-[var(--text-muted)]">{meta}</p>
          ) : (
            meta
          )}
        </CardContent>
      )}
    </Card>
  )
}
