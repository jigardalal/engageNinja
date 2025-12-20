import React, { useEffect, useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { toast } from '../../components/ui';
import TenantFormField from '../../components/TenantFormField';
import { timezoneOptions } from '../../data/timezones';

const createBlankForm = () => ({
  name: '',
  planId: '',
  price: null,
  limits: {},
  legal_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  timezone: '',
  billing_email: '',
  support_email: '',
  wa_messages_override: null,
  emails_override: null,
  sms_override: null
});

export const TenantEditForm = ({ tenant, onUpdated, showProfileSections = true, showQuotaSection = true }) => {
  const planOptions = [
    { value: 'free', label: 'Free' },
    { value: 'starter', label: 'Starter' },
    { value: 'growth', label: 'Growth' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' }
  ];
  const countryOptions = [
    { value: 'United States', label: 'United States' },
    { value: 'Brazil', label: 'Brazil' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'France', label: 'France' },
    { value: 'Germany', label: 'Germany' },
    { value: 'South Africa', label: 'South Africa' },
    { value: 'United Arab Emirates', label: 'United Arab Emirates' },
    { value: 'India', label: 'India' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'Japan', label: 'Japan' },
    { value: 'China', label: 'China' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Other/Global (UTC)', label: 'Other/Global (UTC)' }
  ];

const [form, setForm] = useState(createBlankForm);
const [saving, setSaving] = useState(false);
const [error, setError] = useState(null);
const isPaidPlan = form.planId && form.planId !== 'free';
  const quotaFields = [
    {
      key: 'max_users',
      label: 'Team members',
      helper: 'Max number of tenant users (owner/admin/member/viewer).'
    },
    {
      key: 'whatsapp_messages_per_month',
      label: 'WhatsApp messages',
      helper: 'Per-plan WhatsApp cap; leave blank to inherit plan default.'
    },
    {
      key: 'email_messages_per_month',
      label: 'Email messages',
      helper: 'Per-plan email cap; leave blank to inherit plan default.'
    },
    {
      key: 'contacts_limit',
      label: 'Contacts',
      helper: 'Optional override for the tenant contact limit.'
    },
    {
      key: 'sms_messages_per_month',
      label: 'SMS per month',
      helper: 'Monthly SMS cap to guard outbound SMS traffic.'
    },
    {
      key: 'api_tokens_per_month',
      label: 'API tokens per month',
      helper: 'Monthly API token quota for integrations/exports.'
    }
  ];

  useEffect(() => {
    if (tenant) {
      setForm({
        ...createBlankForm(),
        name: tenant.name || '',
        planId: tenant.plan_id || tenant.planId || '',
        price: tenant.price ?? null,
        limits: tenant.limits || {},
        legal_name: tenant.legal_name || '',
        address_line1: tenant.address_line1 || '',
        address_line2: tenant.address_line2 || '',
        city: tenant.city || '',
        state: tenant.state || '',
        postal_code: tenant.postal_code || '',
        country: tenant.country || '',
        timezone: tenant.timezone || '',
        billing_email: tenant.billing_email || '',
        support_email: tenant.support_email || '',
        wa_messages_override: tenant.wa_messages_override ?? null,
        emails_override: tenant.emails_override ?? null,
        sms_override: tenant.sms_override ?? null
      });
    } else {
      setForm(createBlankForm());
    }
  }, [tenant]);

  useEffect(() => {
    setError(null);
  }, [tenant]);

  useEffect(() => {
    if (!error) return;
    const trimmedName = `${form.name || ''}`.trim();
    const hasName = Boolean(trimmedName);
    const hasPlan = Boolean(form.planId);
    const hasTimezone = !isPaidPlan || Boolean(form.timezone);
    const paidFields = [
      'legal_name',
      'billing_email',
      'support_email',
      'address_line1',
      'city',
      'state',
      'postal_code',
      'country'
    ];
    const paidFieldsFilled = paidFields.every((key) => form[key] && `${form[key]}`.trim());
    if (error === 'Tenant name is required.' && hasName) {
      setError(null);
      return;
    }
    if (error === 'Plan is required.' && hasPlan) {
      setError(null);
      return;
    }
    if (error === 'Timezone is required for paid plans.' && hasTimezone) {
      setError(null);
      return;
    }
    if (error === 'Please fill in all required details for paid plans.' && hasPlan && hasTimezone && paidFieldsFilled) {
      setError(null);
    }
  }, [error, form, isPaidPlan]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleLimitFieldChange = (key, value) => {
    const next = value === '' ? undefined : Number(value);
    if (next !== undefined && Number.isNaN(next)) return;
    const normalized = next === undefined ? undefined : Math.max(0, Math.floor(next));
    setForm(prev => {
      const limits = { ...(prev.limits || {}) };
      if (normalized === undefined) {
        delete limits[key];
      } else {
        limits[key] = normalized;
      }
      return { ...prev, limits };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !`${form.name}`.trim()) {
      setError('Tenant name is required.');
      return;
    }
    if (!form.planId) {
      setError('Plan is required.');
      return;
    }
    if (isPaidPlan && !form.timezone) {
      setError('Timezone is required for paid plans.');
      return;
    }
    if (isPaidPlan) {
      const requiredPaidFields = [
        'legal_name',
        'billing_email',
        'support_email',
        'address_line1',
        'city',
        'state',
        'postal_code',
        'country'
      ];
      const missing = requiredPaidFields.filter(field => !form[field] || !`${form[field]}`.trim());
      if (missing.length) {
        setError('Please fill in all required details for paid plans.');
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update tenant');
      toast({
        title: 'Tenant updated',
        description: 'Changes saved successfully.',
        variant: 'success'
      });
      setError(null);
      onUpdated?.();
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Update failed',
        description: err.message || 'Could not update tenant.',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const shouldShowSubmit = showProfileSections || showQuotaSection;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error" title="Error">{error}</Alert>}
      {showProfileSections && (
        <>
          <div className="space-y-4 rounded-lg border border-[var(--border)] bg-black/5 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Basics</p>
                <p className="text-xs text-[var(--text-muted)]">Names and emails shown to your team and customers.</p>
              </div>
              <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Required</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="tenant-name" className="text-sm font-medium text-[var(--text)]">Tenant name</label>
                  <span className="required-badge">Required</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Appears in navigation, emails, and billing docs.</p>
                <Input
                  id="tenant-name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="tenant-plan" className="text-sm font-medium text-[var(--text)]">Plan</label>
                  <span className="required-badge">Required</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Pick the plan tier for this tenant.</p>
                <select
                  id="tenant-plan"
                  value={form.planId}
                  onChange={(e) => handleChange('planId', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)] text-sm"
                  required
                >
                  <option value="" disabled>Select a plan</option>
                  {planOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <TenantFormField
                id="tenant-legal-name"
                label="Legal name"
                value={form.legal_name}
                onChange={(val) => handleChange('legal_name', val)}
                placeholder="Acme Corporation LLC"
                isPaidPlan={isPaidPlan}
                helper="Used on invoices and compliance documents."
              />
              <TenantFormField
                id="tenant-timezone"
                label="Timezone"
                type="select"
                value={form.timezone}
                onChange={(val) => handleChange('timezone', val)}
                isPaidPlan={isPaidPlan}
                helper="IANA timezone for scheduling (e.g., America/New_York)."
              >
                <option value="" disabled>Select a timezone</option>
                {timezoneOptions.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </TenantFormField>
              <TenantFormField
                id="tenant-billing-email"
                label="Billing email"
                value={form.billing_email}
                onChange={(val) => handleChange('billing_email', val)}
                placeholder="billing@acme.com"
                isPaidPlan={isPaidPlan}
                helper="Where invoices and billing alerts are sent."
              />
              <TenantFormField
                id="tenant-support-email"
                label="Support email"
                value={form.support_email}
                onChange={(val) => handleChange('support_email', val)}
                placeholder="support@acme.com"
                isPaidPlan={isPaidPlan}
                helper="Shown to customers when they need help."
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-[var(--border)] bg-black/5 p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Address</p>
              <p className="text-xs text-[var(--text-muted)]">Used for receipts and location-aware features.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TenantFormField
                id="tenant-address-line1"
                label="Address line 1"
                value={form.address_line1}
                onChange={(val) => handleChange('address_line1', val)}
                placeholder="123 Main St."
                isPaidPlan={isPaidPlan}
              />
              <div className="space-y-1.5">
                <label htmlFor="tenant-address-line2" className="text-sm font-medium text-[var(--text)]">Address line 2</label>
                <Input
                  id="tenant-address-line2"
                  value={form.address_line2}
                  onChange={(e) => handleChange('address_line2', e.target.value)}
                  placeholder="Suite 400"
                />
              </div>
              <TenantFormField
                id="tenant-city"
                label="City"
                value={form.city}
                onChange={(val) => handleChange('city', val)}
                placeholder="San Francisco"
                isPaidPlan={isPaidPlan}
              />
              <TenantFormField
                id="tenant-state"
                label="State/Province"
                value={form.state}
                onChange={(val) => handleChange('state', val)}
                placeholder="CA"
                isPaidPlan={isPaidPlan}
              />
              <TenantFormField
                id="tenant-postal"
                label="Postal code"
                value={form.postal_code}
                onChange={(val) => handleChange('postal_code', val)}
                placeholder="94107"
                isPaidPlan={isPaidPlan}
              />
              <TenantFormField
                id="tenant-country"
                label="Country"
                type="select"
                value={form.country}
                onChange={(val) => handleChange('country', val)}
                isPaidPlan={isPaidPlan}
              >
                <option value="" disabled>Select a country</option>
                {countryOptions.map((country) => (
                  <option key={country.value} value={country.value}>{country.label}</option>
                ))}
              </TenantFormField>
            </div>
          </div>
        </>
      )}

      {showQuotaSection && (
        <div className="space-y-1.5 rounded-lg border border-[var(--border)] bg-black/5 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-semibold text-[var(--text)]">Limits (JSON)</label>
            <span className="text-[11px] text-[var(--text-muted)]">Optional</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[var(--text)]">Quota overrides</label>
              <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Platform only</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Leave a field blank to inherit the plan default.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {quotaFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--text)]">{field.label}</label>
                    <span className="text-[11px] uppercase text-[var(--text-muted)]">Optional</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.limits?.[field.key] ?? ''}
                    onChange={(e) => handleLimitFieldChange(field.key, e.target.value)}
                    placeholder="Plan default"
                  />
                  <p className="text-xs text-[var(--text-muted)]">{field.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showQuotaSection && (
        <div className="space-y-1.5 rounded-lg border border-[var(--border)] bg-blue-50/30 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-semibold text-[var(--text)]">Billing Price</label>
            <span className="text-[11px] text-[var(--text-muted)]">Optional</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Monthly billing price for this tenant. Leave blank to use the plan's default price. Use this for negotiated or custom rates.
          </p>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text)]">Monthly Price ($)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.price !== null && form.price !== undefined ? form.price : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                if (val === null || !Number.isNaN(val)) {
                  handleChange('price', val);
                }
              }}
              placeholder="Plan default price"
            />
            <p className="text-xs text-[var(--text-muted)]">
              {form.planId && form.planId !== 'free'
                ? `Current plan: ${form.planId} (will use plan default if left blank)`
                : 'Free plan - leave blank'}
            </p>
          </div>
        </div>
      )}

      {shouldShowSubmit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
};

export default TenantEditForm;
