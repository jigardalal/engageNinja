import React from 'react';
import { cn } from '../../lib/utils';

const cardVariants = {
  solid: 'rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg backdrop-blur',
  glass:
    'rounded-2xl border border-white/30 bg-white/60 dark:bg-slate-900/60 shadow-[0_25px_50px_rgba(15,23,42,0.25)] backdrop-blur',
  outline: 'rounded-2xl border border-[var(--border)] bg-transparent shadow-sm backdrop-blur'
};

export function Card({ className, children, variant = 'solid', ...props }) {
  return (
    <div
      className={cn(
        cardVariants[variant] || cardVariants.solid,
        'transition-colors overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-6 pt-6 pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-2xl font-semibold text-[var(--text)]', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-[var(--text-muted)]', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-5 space-y-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('px-6 pb-6 pt-2', className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
