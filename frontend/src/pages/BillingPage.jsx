import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { AlertCircle, CheckCircle, TrendingUp, Check, X, Clock, AlertTriangle } from 'lucide-react';

// Plan tier hierarchy
const PLAN_TIERS = {
  'free': 0,
  'starter': 1,
  'growth': 2,
  'pro': 3,
  'enterprise': 4
};

const getActionType = (currentPlanId, targetPlanId) => {
  const currentTier = PLAN_TIERS[currentPlanId] || 0;
  const targetTier = PLAN_TIERS[targetPlanId] || 0;
  if (targetTier > currentTier) return 'upgrade';
  if (targetTier < currentTier) return 'downgrade';
  return 'current';
};

const getButtonLabel = (currentPlanId, targetPlanId, targetPlanName) => {
  const action = getActionType(currentPlanId, targetPlanId);
  if (action === 'upgrade') return `Upgrade to ${targetPlanName}`;
  if (action === 'downgrade') return `Downgrade to ${targetPlanName}`;
  return 'Current Plan';
};

const getButtonVariant = (currentPlanId, targetPlanId) => {
  const action = getActionType(currentPlanId, targetPlanId);
  if (action === 'upgrade') return 'outline';
  if (action === 'downgrade') return 'outline';
  return 'disabled';
};

export default function BillingPage({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // Also refetch if returning from Stripe checkout (look for session_id in URL)
    const params = new URLSearchParams(window.location.search);
    if (params.has('session_id')) {
      // Give Stripe webhook a moment to process (2 seconds)
      const timer = setTimeout(fetchData, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, plansRes] = await Promise.all([
        fetch('/api/billing/summary', { credentials: 'include' }),
        fetch('/api/billing/plans', { credentials: 'include' })
      ]);

      if (!summaryRes.ok || !plansRes.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const summaryData = await summaryRes.json();
      const plansData = await plansRes.json();

      setBillingData(summaryData);
      setPlans(plansData.plans);
      setError(null);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncSubscription = async () => {
    try {
      setSyncLoading(true);
      const response = await fetch('/api/billing/sync-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setError(`${data.error}: ${data.details}`);
        } else {
          setError(data.error || data.message || 'Failed to sync subscription');
        }
        return;
      }

      setBillingData(data);
      setError(null);
    } catch (err) {
      console.error('Error syncing subscription:', err);
      setError(err.message || 'Failed to sync subscription');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setCheckoutLoading(true);
      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_key: planId })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setCheckoutLoading(true);
      const response = await fetch('/api/billing/portal-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (err) {
      console.error('Error creating portal session:', err);
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
              <p className="text-sm text-[var(--text-muted)]">Loading billing information...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--text)]">Billing & Subscription</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Refresh billing data"
        >
          🔄 {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment Grace Period Alert */}
      {billingData?.billing_status?.is_in_grace_period && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-semibold mb-2">⚠️ Payment Failed - Grace Period Active</div>
            <div className="space-y-1 text-sm">
              <p>Your payment failed ({billingData.billing_status.failure_reason}).</p>
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                You have until {new Date(billingData.billing_status.grace_period_until).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} to update your payment method.
              </p>
              <p className="text-xs opacity-90">Campaigns will be blocked once the grace period expires. Update your payment method immediately.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Failed - Grace Period Expired Alert */}
      {billingData?.billing_status?.subscription_status === 'failed' && !billingData?.billing_status?.is_in_grace_period && (
        <Alert variant="destructive" className="border-red-400 bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <AlertDescription className="text-red-900">
            <div className="font-semibold mb-2">❌ Payment Failed - Grace Period Expired</div>
            <div className="space-y-1 text-sm">
              <p>Your payment failed and the grace period has expired.</p>
              <p>All campaign sending has been blocked. You must update your payment method immediately to restore access.</p>
              <div className="mt-2">
                <Button onClick={handleManageSubscription} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  Update Payment Method
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Cancelled Alert */}
      {billingData?.billing_status?.subscription_status === 'cancelled' && (
        <Alert variant="default" className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <div className="font-semibold mb-2">📋 Subscription Cancelled</div>
            <div className="space-y-1 text-sm">
              <p>Your subscription has been cancelled and downgraded to the free plan.</p>
              {billingData?.billing_status?.subscription_cancelled_at && (
                <p>Cancelled on {new Date(billingData.billing_status.subscription_cancelled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              )}
              {billingData?.billing_status?.subscription_cancellation_reason && (
                <p>Reason: {billingData.billing_status.subscription_cancellation_reason}</p>
              )}
              <p className="text-xs opacity-90 mt-2">You can reactivate your subscription at any time by upgrading to a paid plan.</p>
              <div className="mt-3">
                <Button onClick={handleManageSubscription} variant="outline" size="sm" className="text-amber-600 hover:text-amber-700">
                  Reactivate Subscription
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Plans Section */}
      {billingData && (
        <div className="space-y-6">
          {/* Current Plan Summary - Elegant Card with Gradient Border */}
          <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] backdrop-blur p-6 shadow-lg overflow-hidden">
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-blue-500/30 pointer-events-none" style={{
              maskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
              WebkitMaskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))'
            }}></div>

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-semibold">Active Plan</p>
                <p className="mt-2 text-3xl font-bold capitalize text-[var(--text)]">{billingData.plan.name}</p>
                <p className="mt-3 text-base text-[var(--text-muted)]">
                  {billingData.billing?.price
                    ? <><span className="text-2xl font-bold text-[var(--text)]">${billingData.billing.price.toFixed(2)}</span><span className="text-[var(--text-muted)]">/month</span></>
                    : 'Free plan - no billing'}
                </p>
              </div>
              <div className="text-right">
                {billingData?.billing_status?.subscription_status === 'cancelled' ? (
                  <>
                    <Badge variant="secondary" className="mb-3 bg-amber-100 text-amber-900">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Cancelled
                    </Badge>
                    {billingData?.billing_status?.subscription_cancelled_at && (
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        Cancelled {new Date(billingData.billing_status.subscription_cancelled_at).toLocaleDateString()}
                      </p>
                    )}
                  </>
                ) : billingData.subscription ? (
                  <>
                    <Badge variant="success" className="mb-3">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                    {billingData.subscription.current_period_end && (
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        Renews {new Date(billingData.subscription.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                    {billingData.subscription.cancel_at_period_end && (
                      <p className="mt-3 text-xs bg-yellow-50/50 text-yellow-700 px-2 py-1 rounded-md font-medium">
                        ⚠ Will cancel at period end
                      </p>
                    )}
                  </>
                ) : null}
                <button
                  onClick={syncSubscription}
                  disabled={syncLoading}
                  className="mt-4 text-xs px-3 py-1.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sync subscription status from Stripe"
                >
                  {syncLoading ? 'Syncing...' : '🔄 Sync Status'}
                </button>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div>
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-[var(--text)]">Choose Your Plan</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Upgrade or downgrade anytime. No long-term contracts. Find the perfect plan for your needs.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col min-h-[520px] ${
                    plan.isCurrent
                      ? 'border-2 border-green-500/60 bg-gradient-to-br from-green-500/8 via-[var(--card)] to-[var(--card)] shadow-lg shadow-green-500/20 scale-100'
                      : plan.id === 'growth'
                      ? 'border-2 border-blue-400/50 bg-[var(--card)] shadow-xl hover:shadow-2xl hover:scale-[1.02]'
                      : 'border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 hover:shadow-lg hover:scale-[1.01]'
                  }`}
                >
                  {/* Current Plan Highlight Accent */}
                  {plan.isCurrent && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 rounded-t-2xl"></div>
                  )}

                  {/* Gradient accent for Most Popular plan */}
                  {plan.id === 'growth' && !plan.isCurrent && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none"></div>
                  )}

                  {/* Most Popular Badge */}
                  {plan.id === 'growth' && !plan.isCurrent && (
                    <div className="absolute -top-3 right-4 z-20">
                      <Badge variant="primary" className="font-semibold">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Card Content - Flex Layout */}
                  <div className="flex flex-col h-full p-6">
                    {/* Plan Header */}
                    <div className="mb-6">
                      <h4 className="text-xl font-bold capitalize text-[var(--text)]">
                        {plan.name}
                      </h4>
                      <div className="mt-3">
                        {plan.price ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-[var(--text)]">
                              ${plan.price.toFixed(2)}
                            </span>
                            <span className="text-sm font-medium text-[var(--text-muted)]">/month</span>
                          </div>
                        ) : (
                          <span className="text-4xl font-bold text-[var(--text)]">Free</span>
                        )}
                      </div>
                    </div>

                    {/* Features List - Grows to fill space */}
                    <div className="flex-grow border-t border-[var(--border)] pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        {plan.features.whatsapp > 0 ? (
                          <Check className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="text-sm text-[var(--text-muted)]">
                          {plan.features.whatsapp?.toLocaleString() || 0} WhatsApp messages/mo
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        {plan.features.email > 0 ? (
                          <Check className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="text-sm text-[var(--text-muted)]">
                          {plan.features.email?.toLocaleString() || 0} Email messages/mo
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        {plan.features.sms > 0 ? (
                          <Check className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="text-sm text-[var(--text-muted)]">
                          {plan.features.sms?.toLocaleString() || 0} SMS messages/mo
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        {plan.features.users > 0 ? (
                          <Check className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="text-sm text-[var(--text-muted)]">
                          {plan.features.users} team members
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        {plan.features.contacts > 0 ? (
                          <Check className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="text-sm text-[var(--text-muted)]">
                          {plan.features.contacts?.toLocaleString() || 'Unlimited'} contacts
                        </span>
                      </div>

                      {plan.features.ai && (
                        <div className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-[var(--text-muted)]">AI campaign generation</span>
                        </div>
                      )}

                      {plan.features.api && (
                        <div className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-[var(--text-muted)]">API access</span>
                        </div>
                      )}
                    </div>
                    </div>

                    {/* Footer with CTA Button - Sticky to Bottom */}
                    <div className="border-t border-[var(--border)] pt-6 mt-auto">
                      {plan.isCurrent ? (
                        <Button disabled className="w-full">
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={checkoutLoading}
                          loading={checkoutLoading}
                          variant={getButtonVariant(billingData.plan.id, plan.id)}
                          className="w-full"
                        >
                          {getButtonLabel(billingData.plan.id, plan.id, plan.name)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manage Subscription */}
          {billingData.subscription && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={checkoutLoading}
              >
                Manage Subscription in Stripe
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Support Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Questions about billing? Contact our support team at support@engageninja.com
        </AlertDescription>
      </Alert>
    </div>
  );
}
