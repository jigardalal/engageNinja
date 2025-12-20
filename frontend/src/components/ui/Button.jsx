import React from 'react';
import { cn } from '../../lib/utils';

const variantClasses = {
  primary:
    'bg-gradient-to-r from-[var(--accent-from)] to-[var(--accent-to)] text-white shadow-lg hover:shadow-xl hover:-translate-y-[1px]',
  secondary:
    'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:border-primary-200/70 hover:text-primary-600',
  ghost: 'bg-transparent text-[var(--text)] hover:bg-black/5 hover:text-primary-600',
  outline:
    'bg-transparent text-[var(--text)] border border-[var(--border)] hover:border-primary-200/70 hover:text-primary-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
};

const sizeClasses = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm font-semibold',
  lg: 'h-11 px-5 text-base font-semibold'
};

export function Button({ variant = 'primary', size = 'md', asChild = false, className, children, loading, ...props }) {
  const baseClasses = cn(
    'inline-flex items-center justify-center rounded-lg transition-transform duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(children.props.className, baseClasses),
      ...props
    });
  }

  const buttonProps = {
    ...props,
    'aria-busy': loading ? true : undefined
  };
  const spinner = loading && (
    <span
      aria-hidden="true"
      className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );

  return (
    <button className={baseClasses} {...buttonProps} disabled={props.disabled || loading}>
      {spinner}
      {children}
    </button>
  );
}

export default Button;
