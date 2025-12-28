import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(function Input(
  { className, type = 'text', error, ...props },
  ref
) {
  return (
    <>
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full rounded-lg border bg-[var(--card)] px-4 py-2 text-[var(--text)] shadow-sm',
          error ? 'border-red-500 focus-visible:ring-red-500' : 'border-[var(--border)] focus-visible:ring-primary-500',
          'placeholder:text-[var(--text-muted)] placeholder:opacity-50 placeholder:italic',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
});

export default Input;
