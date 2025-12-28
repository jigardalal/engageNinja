import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PrimaryAction } from '../ui/ActionButtons';
import { TrendingUp, Zap, Mail, MessageSquare } from 'lucide-react';

/**
 * PlanContextCard Component
 *
 * Dashboard banner showing:
 * - Current plan tier
 * - Real-time usage for WhatsApp, Email, SMS
 * - Color-coded usage indicators (green/yellow/red)
 * - "Growing fast?" upgrade prompt when usage > 70%
 * - Next tier plan suggestion
 *
 * Props:
 * - plan: { id, name, price } - current plan info
 * - usage: { whatsapp_messages, emails, sms } - current usage
 * - limits: { whatsapp_messages, emails, sms } - plan limits
 * - nextTierPlan: { id, name, price, features } - next tier recommendation
 * - onUpgrade: callback when user clicks upgrade (function)
 *
 * Example:
 * <PlanContextCard
 *   plan={billingData.plan}
 *   usage={billingData.usage}
 *   limits={billingData.limits}
 *   nextTierPlan={nextPlan}
 *   onUpgrade={() => navigate('/settings?tab=billing')}
 * />
 */
export function PlanContextCard({ plan, usage, limits, nextTierPlan, onUpgrade }) {
  // Calculate usage percentages
  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  // Channel configuration
  const channels = [
    {
      id: 'whatsapp',
      icon: Zap,
      label: 'WhatsApp',
      used: usage?.whatsapp_messages || 0,
      limit: limits?.whatsapp_messages || 0
    },
    {
      id: 'email',
      icon: Mail,
      label: 'Email',
      used: usage?.emails || 0,
      limit: limits?.emails || 0
    },
    {
      id: 'sms',
      icon: MessageSquare,
      label: 'SMS',
      used: usage?.sms || 0,
      limit: limits?.sms || 0
    }
  ];

  // Check if any channel has high usage (>70%)
  const hasHighUsage = channels.some(
    ch => getUsagePercentage(ch.used, ch.limit) >= 70 && ch.limit > 0
  );

  // Get color for usage percentage
  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card variant="glass" className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Plan info + usage indicators */}
          <div className="flex items-center gap-4 flex-1">
            {/* Plan badge */}
            <Badge variant="primary" className="text-xs flex-shrink-0">
              {plan?.name || 'Free Plan'}
            </Badge>

            {/* Quick usage summary */}
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
              {channels.map(({ id, icon: Icon, label, used, limit }) => {
                const percentage = getUsagePercentage(used, limit);
                const color = getUsageColor(percentage);
                const isActive = limit > 0;

                return (
                  <div key={id} className="flex items-center gap-1">
                    <Icon
                      className={`h-4 w-4 ${isActive ? color : 'text-gray-400'}`}
                    />
                    <span className={isActive ? '' : 'text-gray-400'}>
                      {isActive ? `${used}/${limit}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Upgrade CTA (conditional) */}
          {hasHighUsage && nextTierPlan && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right text-sm">
                <p className="text-[var(--text-muted)] text-xs">Growing fast?</p>
                <p className="font-semibold text-[var(--text)]">
                  {nextTierPlan.name} plan
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  ${nextTierPlan.price}/mo
                </p>
              </div>
              <PrimaryAction onClick={onUpgrade} size="sm" className="flex-shrink-0">
                <TrendingUp className="h-4 w-4" />
                Upgrade
              </PrimaryAction>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PlanContextCard;
