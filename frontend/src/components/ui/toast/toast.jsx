import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva } from 'class-variance-authority';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils';
import { useToast } from './use-toast';

const ToastProvider = ToastPrimitives.Provider;

const toastVariants = cva(
  'pointer-events-auto relative w-[360px] overflow-hidden rounded-lg border bg-[var(--card)] text-[var(--text)] shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border-[var(--border)]',
        success: 'border-green-200 bg-green-50 text-green-900',
        error: 'border-red-200 bg-red-50 text-red-900',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export const ToastViewport = React.forwardRef(function ToastViewport(props, ref) {
  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className="fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-[420px] flex-col gap-3 outline-none"
      {...props}
    />
  );
});

export const Toast = React.forwardRef(function Toast(
  { className, variant, ...props },
  ref
) {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});

export const ToastTitle = React.forwardRef(function ToastTitle(
  { className, ...props },
  ref
  ) {
  return (
    <ToastPrimitives.Title
      ref={ref}
      className={cn('text-sm font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
});

export const ToastDescription = React.forwardRef(function ToastDescription(
  { className, ...props },
  ref
  ) {
  return (
    <ToastPrimitives.Description
      ref={ref}
      className={cn('text-sm text-[var(--text-muted)]', className)}
      {...props}
    />
  );
});

export const ToastClose = React.forwardRef(function ToastClose(
  { className, ...props },
  ref
  ) {
  return (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        'absolute right-2 top-2 rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-black/5 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500',
        className
      )}
      toast-close=""
      {...props}
    >
      <XMarkIcon className="h-4 w-4" />
    </ToastPrimitives.Close>
  );
});

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1 p-4 pr-8">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
              {action}
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
