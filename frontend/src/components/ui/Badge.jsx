import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-primary-500/20 text-primary-50 border border-primary-400/60 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]',
  neutral: 'bg-white/60 text-[var(--text)] border-[var(--border)]',
  success: 'bg-green-500/15 text-green-700 border-green-200',
  warning: 'bg-amber-500/15 text-amber-800 border-amber-200',
  danger: 'bg-red-500/15 text-red-700 border-red-200'
};

export function Badge({ variant = 'neutral', className, children, ...props }) {
  const clickable = typeof props.onClick === 'function';
  return (
    <span
      {...props}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold',
        variants[variant],
        clickable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2' : '',
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
