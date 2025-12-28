import React from 'react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { FileQuestion } from 'lucide-react';

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
    <div className={cn('rounded-2xl border border-red-200 bg-red-50 text-red-800 p-4', className)}>
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

export function EmptyState({
  title = 'Nothing to show yet',
  description,
  action,
  icon: Icon = FileQuestion,
  className
}) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-8 text-center space-y-3', className)}>
      {Icon && <Icon className="mx-auto h-10 w-10 text-primary-500" aria-hidden />}
      <p className="text-xl font-semibold text-[var(--text)]">{title}</p>
      {description && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
