import React, { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { Input, Button, Alert, toast } from '../components/ui';
import TenantFormField from '../components/TenantFormField';
import { useAuth } from '../context/AuthContext';
import { timezoneOptions } from '../data/timezones';

export default function TenantProfilePage({ embedded = false } = {}) {
  const { hasRole } = useAuth();
  const planOptions = [
    { value: 'free', label: 'Free' },
    { value: 'starter', label: 'Starter' },
    { value: 'growth', label: 'Growth' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
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
    { value: 'Other/Global (UTC)', label: 'Other/Global (UTC)' },
  ];
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const isPaidPlan = form.plan_id && form.plan_id !== 'free';

  useEffect(() => {
    fetchProfile();
  }, []);

  const resolvePlanId = (incomingPlan) => {
    if (!incomingPlan) return planOptions[0].value;
    const normalized = `${incomingPlan}`.trim();
    const direct = planOptions.find((p) => p.value === normalized);
    if (direct) return direct.value;
    const labelMatch = planOptions.find((p) => p.label.toLowerCase() === normalized.toLowerCase());
    if (labelMatch) return labelMatch.value;
    const keywordMatch = planOptions.find((p) => normalized.toLowerCase().includes(p.value));
    if (keywordMatch) return keywordMatch.value;
    return planOptions[0].value;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/tenant/profile', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      const initialPlanId = resolvePlanId(
        data.tenant?.plan_id ?? data.tenant?.planId ?? data.tenant?.plan
      );
      setForm({
        ...(data.tenant || {}),
        plan_id: initialPlanId,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!error) return;
    const trimmedName = `${form.name || ''}`.trim();
    const hasName = Boolean(trimmedName);
    const hasPlan = Boolean(form.plan_id);
    const isPaid = hasPlan && form.plan_id !== 'free';
    const hasTimezone = !isPaid || Boolean(form.timezone);
    const requiredPaidFields = [
      'legal_name',
      'billing_email',
      'support_email',
      'address_line1',
      'city',
      'state',
      'postal_code',
      'country',
    ];
    const paidFieldsFilled = requiredPaidFields.every((key) => form[key] && `${form[key]}`.trim());
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
  }, [error, form]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !`${form.name}`.trim()) {
      setError('Tenant name is required.');
      setSuccess(null);
      return;
    }
    if (!form.plan_id) {
      setError('Plan is required.');
      setSuccess(null);
      return;
    }
    if (isPaidPlan && !form.timezone) {
      setError('Timezone is required for paid plans.');
      setSuccess(null);
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
        'country',
      ];
      const missing = requiredPaidFields.filter((field) => !form[field] || !`${form[field]}`.trim());
      if (missing.length) {
        setError('Please fill in all required details for paid plans.');
        setSuccess(null);
        return;
      }
    }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/tenant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      setForm((prev) => ({
        ...prev,
        ...(data.tenant || {}),
        plan_id: resolvePlanId(
          data.tenant?.plan_id ?? data.tenant?.planId ?? data.tenant?.plan ?? prev.plan_id
        ),
      }));
      toast({
        title: 'Tenant updated',
        description: 'Changes saved successfully.',
        variant: 'success'
      });
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

  if (!hasRole('admin') && !hasRole('owner')) {
    return embedded ? (
      <Alert type="error" title="Access denied">Only tenant admin/owner can edit tenant profile.</Alert>
    ) : (
      <AppShell title="Tenant Profile" subtitle="Access denied">
        <Alert type="error" title="Access denied">Only tenant admin/owner can edit tenant profile.</Alert>
      </AppShell>
    );
  }

  const Shell = ({ children }) => (
    embedded ? <>{children}</> : (
      <AppShell title="Tenant Profile" subtitle="Manage tenant info and contacts">
        {children}
      </AppShell>
    )
  );

  return (
    <Shell>
      {error && <Alert type="error" title="Error" className="mb-4">{error}</Alert>}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      ) : (
        (() => {
          const currentPlanMissing = form.plan_id && !planOptions.some((p) => p.value === form.plan_id);
          return (
        <form onSubmit={handleSave} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow p-6 space-y-6">
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-black/5 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Basics</p>
                <p className="text-xs text-[var(--text-muted)]">Name and contact emails shown to your team and customers.</p>
              </div>
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
                  value={form.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="tenant-plan" className="text-sm font-medium text-[var(--text)]">Plan</label>
                  <span className="required-badge">Required</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Choose the plan for this tenant.</p>
                <select
                  id="tenant-plan"
                  value={form.plan_id || ''}
                  onChange={(e) => handleChange('plan_id', e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)] text-sm"
                  required
                >
                  <option value="" disabled>Select a plan</option>
                  {currentPlanMissing && (
                    <option value={form.plan_id}>{form.plan_id} (current)</option>
                  )}
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

          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-black/5 p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Address</p>
              <p className="text-xs text-[var(--text-muted)]">Used for receipts and location-aware features.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TenantFormField
                id="tenant-address1"
                label="Address line 1"
                value={form.address_line1}
                onChange={(val) => handleChange('address_line1', val)}
                placeholder="123 Main St."
                isPaidPlan={isPaidPlan}
              />
              <div className="space-y-1.5">
                <label htmlFor="tenant-address2" className="text-sm font-medium text-[var(--text)]">Address line 2</label>
                <Input
                  id="tenant-address2"
                  value={form.address_line2 || ''}
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

          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-black/5 p-4">
            <TenantFormField
              id="tenant-timezone"
              label="Timezone"
              type="select"
              value={form.timezone}
              onChange={(val) => handleChange('timezone', val)}
              isPaidPlan={isPaidPlan}
              helper="Choose an IANA timezone for scheduling."
            >
              <option value="" disabled>Select a timezone</option>
              {timezoneOptions.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </TenantFormField>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
          );
        })()
      )}
    </Shell>
  );
}
