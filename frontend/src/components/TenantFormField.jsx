import React from 'react';
import { Input } from './ui/Input';

/**
 * Reusable tenant form field component that handles:
 * - Clean labels without requirement badges
 * - Validation happens only on error display
 * - Field type (input/select)
 * - Required validation based on isPaidPlan
 */
export const TenantFormField = ({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  isPaidPlan = false,
  isRequired = false,
  helper = '',
  children = null // For select options
}) => {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--text)]">
        {label}
      </label>
      {helper && <p className="text-xs text-[var(--text-muted)]">{helper}</p>}

      {type === 'select' ? (
        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)] text-sm"
          required={isRequired || isPaidPlan}
        >
          {children}
        </select>
      ) : (
        <Input
          id={id}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={isRequired || isPaidPlan}
        />
      )}
    </div>
  );
};

export default TenantFormField;
