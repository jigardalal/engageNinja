import React from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn('block text-sm font-medium text-[var(--text-muted)]', className)}
      {...props}
    >
      {children}
    </label>
  );
}

export default Label;
