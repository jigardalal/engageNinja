import React from 'react';
import { cn } from '../../lib/utils';

export const Select = React.forwardRef(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--text)] shadow-sm',
        'placeholder:text-[var(--text-muted)] placeholder:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
