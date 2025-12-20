import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function NavPills({ items, className }) {
  const location = useLocation();

  const isActive = (item) => {
    if (typeof item.activeWhen === 'function') {
      return item.activeWhen(location.pathname);
    }
    const exact = item.end;
    if (exact) {
      return location.pathname === item.to;
    }
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  return (
    <nav className={cn('flex items-center gap-2 rounded-full bg-black/5 p-1', className)}>
      {items.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-full transition inline-flex items-center gap-2',
              active
                ? 'bg-[var(--card)] text-primary-600 shadow-sm border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-primary-600'
            )}
          >
            {Icon && <Icon className="h-4 w-4 opacity-80" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default NavPills;
