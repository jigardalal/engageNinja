import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  // Stronger contrast for errors so they stand out consistently everywhere.
  error: 'bg-red-100 text-red-900 border-red-300'
};

// Accept both `variant` and legacy `type` props for compatibility.
export function Alert({ variant = 'info', type, className, title, children }) {
  const chosen = type || variant || 'info';
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm',
        variants[chosen] || variants.info,
        className
      )}
      role="alert"
    >
      <div className="flex-1">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function AlertDescription({ children, className }) {
  return (
    <p className={cn('text-sm leading-relaxed', className)}>
      {children}
    </p>
  );
}

export default Alert;
