import React, { createContext, useContext } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

const DialogContext = createContext();

export function Dialog({ open, onClose, children, size = 'md', title, description, footer }) {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  return (
    <DialogContext.Provider value={{ onClose }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div
          className={cn(
            'relative w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl',
            'p-6 space-y-4',
            sizeClasses[size]
          )}
        >
          {title && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text)]">{title}</h3>
                {description && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
                ✕
              </Button>
            </div>
          )}
          {children}
          {footer && (
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

export function DialogContent({ children }) {
  return <div className="text-[var(--text)]">{children}</div>;
}

export function DialogHeader({ children }) {
  const { onClose } = useContext(DialogContext);
  return (
    <div className="flex items-start justify-between gap-4">
      <div>{children}</div>
      <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
        ✕
      </Button>
    </div>
  );
}

export function DialogTitle({ children }) {
  return <h3 className="text-xl font-semibold text-[var(--text)]">{children}</h3>;
}

export function DialogFooter({ children }) {
  return <div className="flex justify-end gap-3 pt-2">{children}</div>;
}

export default Dialog;
