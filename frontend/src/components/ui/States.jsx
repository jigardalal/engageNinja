import React from 'react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export function LoadingState({ message = 'Loading...', className }) {
  return (
    <div className={cn('flex items-center justify-center py-12 text-[var(--text-muted)]', className)}>
      <div className="flex items-center gap-3">
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-b-2 border-primary-600" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, retryLabel = 'Retry', className }) {
  return (
    <div className={cn('rounded-xl border border-red-200 bg-red-50 text-red-800 p-4', className)}>
      <div className="font-semibold mb-1">{title}</div>
      {description && <div className="text-sm mb-3">{description}</div>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="bg-white text-red-800 border-red-200 hover:border-red-300">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
