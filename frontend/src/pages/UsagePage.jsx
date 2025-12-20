import React, { useState, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Alert, AlertDescription } from '../components/ui/Alert';
import UsageBar from '../components/billing/UsageBar';
import { AlertCircle, TrendingUp, Zap, Mail, MessageSquare } from 'lucide-react';

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const summaryRes = await fetch('/api/billing/summary', { credentials: 'include' });

      if (!summaryRes.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const summaryData = await summaryRes.json();
      setBillingData(summaryData);
      setError(null);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <AppShell title="Usage & Billing" subtitle="Monitor your current usage and plan limits">
      {error && (
        <Alert variant="error" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-[var(--text-muted)] text-lg">Loading usage data...</p>
          </div>
        </div>
      ) : billingData ? (
        <div className="space-y-8">
          {/* Current Usage Summary - Hero Card */}
          <Card className="border-2 border-[var(--primary)]/20 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">Current Usage</CardTitle>
                  <CardDescription className="mt-2">
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </CardDescription>
                </div>
                <div className="text-[var(--primary)]">
                  <TrendingUp className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Message Usage Bars */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-[var(--text)]">WhatsApp Messages</span>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(getUsagePercentage(billingData.usage.whatsapp_messages, billingData.limits.whatsapp_messages))}`}>
                      {billingData.usage.whatsapp_messages.toLocaleString()} / {billingData.limits.whatsapp_messages?.toLocaleString() || '∞'}
                    </span>
                  </div>
                  <UsageBar
                    used={billingData.usage.whatsapp_messages}
                    limit={billingData.limits.whatsapp_messages}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-[var(--text)]">Email Messages</span>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(getUsagePercentage(billingData.usage.emails, billingData.limits.emails))}`}>
                      {billingData.usage.emails.toLocaleString()} / {billingData.limits.emails?.toLocaleString() || '∞'}
                    </span>
                  </div>
                  <UsageBar
                    used={billingData.usage.emails}
                    limit={billingData.limits.emails}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-[var(--text)]">SMS Messages</span>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(getUsagePercentage(billingData.usage.sms, billingData.limits.sms))}`}>
                      {billingData.usage.sms.toLocaleString()} / {billingData.limits.sms?.toLocaleString() || '∞'}
                    </span>
                  </div>
                  <UsageBar
                    used={billingData.usage.sms}
                    limit={billingData.limits.sms}
                  />
                </div>
              </div>

              {/* Remaining Summary - Grid Cards */}
              <div className="border-t border-[var(--border)] pt-6">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Remaining Balance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-green-200/50 bg-green-50/30 dark:bg-green-950/20 dark:border-green-900/50 p-4">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">WhatsApp Messages</p>
                    <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                      {billingData.remaining.whatsapp_messages.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-green-600/70 dark:text-green-400/70">messages left</p>
                  </div>
                  <div className="rounded-lg border border-purple-200/50 bg-purple-50/30 dark:bg-purple-950/20 dark:border-purple-900/50 p-4">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide">Email Messages</p>
                    <p className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {billingData.remaining.emails.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-purple-600/70 dark:text-purple-400/70">messages left</p>
                  </div>
                  <div className="rounded-lg border border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-900/50 p-4">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">SMS Messages</p>
                    <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {billingData.remaining.sms.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/70">messages left</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Limits & Features</CardTitle>
              <CardDescription>Your current plan includes these features and limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Team Members */}
                <div className="rounded-lg border border-[var(--border)] bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Team Members</p>
                      <p className="mt-3 text-3xl font-bold text-[var(--text)]">
                        {billingData.plan_limits?.max_users || '∞'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">users allowed</p>
                    </div>
                    <div className="text-blue-600/30">
                      <UserGroupIcon className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* Contacts Limit */}
                <div className="rounded-lg border border-[var(--border)] bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Contact Limit</p>
                      <p className="mt-3 text-3xl font-bold text-[var(--text)]">
                        {billingData.plan_limits?.contacts_limit
                          ? billingData.plan_limits.contacts_limit.toLocaleString()
                          : '∞'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">contacts</p>
                    </div>
                    <div className="text-purple-600/30">
                      <UsersIcon className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* API Access */}
                {billingData.plan_limits?.api_enabled && (
                  <div className="rounded-lg border border-green-200/50 bg-green-50/30 dark:bg-green-950/20 dark:border-green-900/50 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">✓ API Access</p>
                        <p className="mt-3 font-semibold text-green-700 dark:text-green-400">Full API</p>
                        <p className="mt-1 text-xs text-green-600/70 dark:text-green-400/70">available</p>
                      </div>
                      <div className="text-green-600/30">
                        <CodeIcon className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Features */}
                {billingData.plan_limits?.ai_features_enabled && (
                  <div className="rounded-lg border border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/50 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">✓ AI Features</p>
                        <p className="mt-3 font-semibold text-amber-700 dark:text-amber-400">Campaign Gen</p>
                        <p className="mt-1 text-xs text-amber-600/70 dark:text-amber-400/70">included</p>
                      </div>
                      <div className="text-amber-600/30">
                        <SparklesIcon className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Tips */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Need more quota? Visit the <strong>Billing</strong> tab in Settings to upgrade your plan or contact support at support@engageninja.com
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </AppShell>
  );
}

// Icon imports
function UserGroupIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646zM19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CodeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function SparklesIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.166 2.111c.395-1.291 2.278-1.291 2.673 0l1.154 3.757 3.954 0c1.361 0 1.927 1.742.726 2.585l-3.204 2.33 1.155 3.758c.395 1.291-.913 2.369-2.113 1.527L12 13.223l-3.205 2.32c-1.201.842-2.508-.236-2.113-1.527l1.155-3.757-3.204-2.33c-1.201-.843-.635-2.585.726-2.585l3.954 0 1.155-3.757z" />
    </svg>
  );
}
