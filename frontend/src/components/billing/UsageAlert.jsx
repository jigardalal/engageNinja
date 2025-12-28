import React, { useState } from 'react';
import { Alert, AlertDescription } from '../ui/Alert';
import { PrimaryAction, SecondaryAction } from '../ui/ActionButtons';
import { AlertCircle, TrendingUp } from 'lucide-react';

/**
 * UsageAlert Component
 *
 * Reusable alert for usage-based upgrade prompts
 * Shows at 70% (info), 80% (warning), and 90%+ (error) usage thresholds
 *
 * Props:
 * - channel: 'whatsapp' | 'email' | 'sms'
 * - used: current usage (number)
 * - limit: plan limit (number)
 * - currentPlan: current plan name (string)
 * - targetPlan: recommended upgrade plan name (string)
 * - targetPrice: price of target plan (number)
 * - targetLimit: message limit of target plan (number)
 * - onUpgrade: callback when user clicks upgrade (function)
 * - onDismiss: callback when user dismisses alert (function, optional)
 * - dismissible: show dismiss button (boolean, default: true)
 *
 * Example:
 * <UsageAlert
 *   channel="whatsapp"
 *   used={78}
 *   limit={100}
 *   currentPlan="Free Plan"
 *   targetPlan="Starter"
 *   targetPrice={49}
 *   targetLimit={250}
 *   onUpgrade={() => navigate('/settings?tab=billing')}
 *   onDismiss={() => handleDismiss('whatsapp')}
 * />
 */
export function UsageAlert({
  channel,
  used,
  limit,
  currentPlan,
  targetPlan,
  targetPrice,
  targetLimit,
  onUpgrade,
  onDismiss,
  dismissible = true
}) {
  const [dismissed, setDismissed] = useState(false);

  // Calculate percentage
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

  // Determine variant based on percentage
  let variant = 'info';
  if (percentage >= 90) {
    variant = 'error';
  } else if (percentage >= 80) {
    variant = 'warning';
  }

  // If dismissed, don't render
  if (dismissed) {
    return null;
  }

  // Channel info
  const channelConfig = {
    whatsapp: { emoji: '📱', label: 'WhatsApp' },
    email: { emoji: '📧', label: 'Email' },
    sms: { emoji: '💬', label: 'SMS' }
  };

  const { emoji, label } = channelConfig[channel] || { emoji: '📊', label: 'Messages' };

  // Calculate multiplier for upgrade
  const multiplier = targetLimit > limit ? Math.floor(targetLimit / limit) : 1;

  // Handle dismiss
  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Alert variant={variant}>
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <AlertDescription>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-sm">
              {emoji} {label} at {percentage}%
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              You've used <strong>{used.toLocaleString()}</strong> of your{' '}
              <strong>{limit.toLocaleString()}</strong> messages this month.{' '}
              {targetPlan && (
                <>
                  <strong>{targetPlan}</strong> plan (${targetPrice}/mo) includes{' '}
                  <strong>{targetLimit.toLocaleString()} messages/mo</strong>
                  {multiplier > 1 && ` (${multiplier}x more)`}.
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            <PrimaryAction onClick={onUpgrade} size="sm">
              <TrendingUp className="h-4 w-4" />
              Upgrade
            </PrimaryAction>
            {dismissible && (
              <SecondaryAction onClick={handleDismiss} size="sm">
                Dismiss
              </SecondaryAction>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default UsageAlert;
