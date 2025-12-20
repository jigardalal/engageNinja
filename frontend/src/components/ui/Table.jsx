import React from 'react';
import { cn } from '../../lib/utils';

export function Table({ className, children, ...props }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table
          className={cn('min-w-full divide-y divide-[var(--border)] text-sm text-left', className)}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn('bg-black/5 text-[var(--text-muted)]', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn('divide-y divide-[var(--border)] bg-[var(--card)]', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn('transition hover:bg-black/3 data-[state=selected]:bg-primary-50', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }) {
  return (
    <th
      className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide', className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn('px-4 py-3 text-[var(--text)]', className)} {...props}>
      {children}
    </td>
  );
}

export function TableCaption({ className, children, ...props }) {
  return (
    <caption
      className={cn('px-4 py-3 text-center text-sm text-[var(--text-muted)]', className)}
      {...props}
    >
      {children}
    </caption>
  );
}

export default Table;
