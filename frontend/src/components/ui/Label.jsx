import React from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, children, required, ...props }) {
  return (
    <label
      className={cn('block text-sm font-medium text-[var(--text)]', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-500 aria-label='required'">*</span>}
    </label>
  );
}

export default Label;
