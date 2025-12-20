import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import UsageBar from '../../components/billing/UsageBar';
import { AlertCircle, CheckCircle, TrendingUp, Download } from 'lucide-react';

export default function TenantBillingTab({ tenantId }) {
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);
  const usageSummary = billingData?.usage ?? {
    whatsapp_messages: 0,
    emails: 0,
    sms: 0
  };
  const limitSummary = billingData?.limits ?? {
    whatsapp_messages: 0,
    emails: 0,
    sms: 0
  };
  const remainingSummary = billingData?.remaining ?? {
    whatsapp_messages: 0,
    emails: 0,
    sms: 0
  };
  const formatCount = (value) => {
    const normalized = Number(value ?? 0);
    return Number.isFinite(normalized) ? normalized.toLocaleString() : '0';
  };

  const fetchBillingSummary = useCallback(async () => {
    if (!tenantId) {
      setError('Tenant ID is missing');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/billing`, {
        credentials: 'include'
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load billing data');
      }
      setBillingData(data);
    } catch (err) {
      console.error('Failed to load tenant billing data:', err);
      setBillingData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchBillingSummary();
  }, [fetchBillingSummary]);

  const handleInitiateCheckout = async () => {
    if (!tenantId) {
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/billing/checkout-session`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create checkout session');
      }
      if (data.url) {
        window.open(data.url, '_blank', 'noopener');
      } else {
        throw new Error('Checkout URL not returned');
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!tenantId) {
      return;
    }

    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/billing/portal-session`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create Stripe portal session');
      }
      if (data.url) {
        window.open(data.url, '_blank', 'noopener');
      } else {
        throw new Error('Stripe portal URL not returned');
      }
    } catch (err) {
      console.error('Failed to create billing portal session:', err);
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
              <p className="text-sm text-[var(--text-muted)]">Loading billing summary...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!billingData) {
    return (
      <div className="space-y-4">
        {error && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Unable to load billing information for this tenant. Platform admins can still open the Stripe portal to
              configure billing.
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={fetchBillingSummary} disabled={loading}>
                Retry
              </Button>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Once the tenant completes a checkout, you'll be able to manage their subscription via Stripe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Billing Overview</CardTitle>
              <CardDescription>Stripe subscription details for this tenant</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold capitalize">{billingData.plan?.name || 'Unknown'}</p>
              {billingData.subscription && (
                <p className="text-xs text-[var(--text-muted)]">
                  {billingData.subscription.status === 'active' ? '✓ Active' : `Status: ${billingData.subscription.status}`}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Monthly Price</p>
              <p className="text-lg font-bold text-[var(--text)]">
                {billingData.billing?.price ? `$${billingData.billing.price.toFixed(2)}` : 'Free'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!billingData.subscription ? (
                <Button
                  type="button"
                  onClick={handleInitiateCheckout}
                  disabled={checkoutLoading}
                  loading={checkoutLoading}
                >
                  Initiate Subscription
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  loading={portalLoading}
                >
                  Open Stripe Portal
                </Button>
              )}
              <Button type="button" variant="outline" onClick={fetchBillingSummary}>
                Refresh
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Current Period</p>
              {billingData.subscription ? (
                <p className="text-sm font-semibold">
                  {new Date(billingData.subscription.current_period_start).toLocaleDateString()} -{' '}
                  {new Date(billingData.subscription.current_period_end).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-sm font-semibold text-[var(--text-muted)]">Not subscribed</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">Subscription Status</p>
              <p className="flex items-center justify-end gap-1 text-sm font-semibold">
                {billingData.subscription && <CheckCircle className="h-4 w-4 text-green-600" />}
                {billingData.subscription ? billingData.subscription.status : 'None'}
              </p>
            </div>
          </div>
          {billingData.subscription?.cancel_at_period_end && (
            <p className="text-xs text-yellow-600">
              ⚠ This subscription will be canceled at the end of the current period
            </p>
          )}
          {!billingData.subscription && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-900">
                This tenant doesn't have an active subscription yet. Click "Initiate Subscription" above to create a checkout session for their current plan ({billingData.plan?.name}).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <CardTitle className="text-sm">Monthly Usage</CardTitle>
          </div>
          <CardDescription>
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar
            label="WhatsApp Messages"
            used={usageSummary.whatsapp_messages}
            limit={limitSummary.whatsapp_messages}
          />
          <UsageBar
            label="Email Messages"
            used={usageSummary.emails}
            limit={limitSummary.emails}
          />
          <UsageBar
            label="SMS Messages"
            used={usageSummary.sms}
            limit={limitSummary.sms}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-xs text-[var(--text-muted)]">WhatsApp Remaining</p>
        <p className="text-lg font-bold text-green-600">
          {formatCount(remainingSummary.whatsapp_messages)}
        </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-[var(--text-muted)]">Email Remaining</p>
        <p className="text-lg font-bold text-green-600">
          {formatCount(remainingSummary.emails)}
        </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-[var(--text-muted)]">SMS Remaining</p>
        <p className="text-lg font-bold text-green-600">
          {formatCount(remainingSummary.sms)}
        </p>
          </CardContent>
        </Card>
      </div>

      {billingData.invoices && billingData.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Download billing history and receipts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {billingData.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{invoice.id}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(invoice.created_at).toLocaleDateString()} • {invoice.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {(invoice.amount / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: invoice.currency.toUpperCase()
                      })}
                    </span>
                    {invoice.download_url && (
                      <a
                        href={invoice.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary)] hover:underline"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Need help with billing? Reach out to support@engageninja.com for setup and troubleshooting.
        </AlertDescription>
      </Alert>
    </div>
  );
}
