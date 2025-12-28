import React from 'react';
import { Alert, AlertDescription } from '../ui/Alert';
import { PrimaryAction } from '../ui/ActionButtons';
import { Users, AlertTriangle } from 'lucide-react';

/**
 * ContactLimitAlert Component
 *
 * Warns when approaching contact limit (80%+)
 * Shows helpful upgrade suggestions based on current plan
 *
 * Props:
 * - currentCount: current number of contacts
 * - limit: contact limit for current plan
 * - planName: name of current plan (for messaging)
 * - nextPlanName: name of next tier plan (optional)
 * - nextPlanContacts: contact limit of next tier (optional)
 * - onUpgrade: callback when user clicks upgrade
 *
 * Example:
 * <ContactLimitAlert
 *   currentCount={40}
 *   limit={50}
 *   planName="free"
 *   nextPlanName="Starter"
 *   nextPlanContacts={500}
 *   onUpgrade={() => navigate('/settings?tab=billing')}
 * />
 */
export function ContactLimitAlert({
  currentCount,
  limit,
  planName,
  nextPlanName,
  nextPlanContacts,
  onUpgrade
}) {
  // Calculate percentage
  const percentage = (currentCount / limit) * 100;

  // Only show if approaching limit (80%+)
  if (percentage < 80) {
    return null;
  }

  // Determine variant based on percentage
  const variant = percentage >= 90 ? 'error' : 'warning';
  const remaining = limit - currentCount;

  // Get upgrade hint based on plan
  const getUpgradeHint = () => {
    if (!nextPlanName) return null;

    if (nextPlanContacts) {
      return `${nextPlanName} plan supports ${nextPlanContacts.toLocaleString()} contacts.`;
    }

    // Default hints by current plan
    const hints = {
      free: 'Starter plan supports 500 contacts.',
      starter: 'Growth plan supports 5,000 contacts.',
      growth: 'Pro plan supports 10,000 contacts.',
      pro: 'Enterprise plan supports 25,000+ contacts.'
    };

    return hints[planName?.toLowerCase()] || 'Upgrade for more contact capacity.';
  };

  const upgradeHint = getUpgradeHint();

  return (
    <Alert variant={variant}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <AlertDescription>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-sm">
              <Users className="inline h-4 w-4 mr-1" />
              Contact limit approaching
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              You have <strong>{currentCount.toLocaleString()}</strong> of{' '}
              <strong>{limit.toLocaleString()}</strong> contacts (
              <strong>{remaining.toLocaleString()}</strong> remaining).{' '}
              {upgradeHint}
            </p>
          </div>
          <PrimaryAction onClick={onUpgrade} size="sm" className="flex-shrink-0">
            Upgrade to grow
          </PrimaryAction>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default ContactLimitAlert;
