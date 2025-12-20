/**
 * Subscription and Billing Checks
 * Utilities for checking tenant billing status and grace periods
 */

/**
 * Check if tenant can send campaigns
 * Returns { allowed: boolean, reason?: string }
 */
function canTenantSendCampaigns(db, tenantId) {
  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!tenant) {
      return { allowed: false, reason: 'Tenant not found' };
    }

    // Free plan can always send campaigns
    if (tenant.plan_id === 'free' || !tenant.plan_id) {
      return { allowed: true };
    }

    // Check subscription status
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE tenant_id = ?').get(tenantId);

    // If no subscription, check if in grace period
    if (!subscription || subscription.status === 'past_due') {
      // Check if still in grace period
      if (tenant.subscription_grace_period_until) {
        const gracePeriodUntil = new Date(tenant.subscription_grace_period_until);
        const now = new Date();

        if (now < gracePeriodUntil) {
          // Still in grace period
          return {
            allowed: false,
            reason: `Payment failed. Grace period ends ${gracePeriodUntil.toLocaleDateString()}.`,
            graceUntil: tenant.subscription_grace_period_until,
            failureReason: tenant.subscription_failure_reason
          };
        } else {
          // Grace period expired
          return {
            allowed: false,
            reason: 'Subscription payment failed and grace period has expired. Please update your payment method.',
            expired: true
          };
        }
      }

      // No grace period info, deny
      return {
        allowed: false,
        reason: 'Subscription not active. Please complete payment to send campaigns.'
      };
    }

    // Check if subscription is active
    if (subscription.status === 'active') {
      return { allowed: true };
    }

    // For any other status, deny
    return {
      allowed: false,
      reason: `Subscription status is ${subscription.status}. Please contact support.`
    };
  } catch (error) {
    console.error(`Error checking campaign permissions for tenant ${tenantId}:`, error);
    return { allowed: false, reason: 'Error checking subscription status' };
  }
}

/**
 * Get subscription status summary for a tenant
 */
function getSubscriptionStatus(db, tenantId) {
  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!tenant) return null;

    const subscription = db.prepare('SELECT * FROM subscriptions WHERE tenant_id = ?').get(tenantId);

    return {
      tenantId,
      planId: tenant.plan_id,
      subscriptionStatus: tenant.subscription_status,
      subscriptionStatus_: subscription?.status,
      lastPaymentFailedAt: tenant.last_payment_failed_at,
      gracePeriodUntil: tenant.subscription_grace_period_until,
      failureReason: tenant.subscription_failure_reason,
      isInGracePeriod: tenant.subscription_grace_period_until
        ? new Date() < new Date(tenant.subscription_grace_period_until)
        : false
    };
  } catch (error) {
    console.error(`Error getting subscription status for tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Check if tenant is in billing trouble
 */
function isInBillingTrouble(db, tenantId) {
  const status = getSubscriptionStatus(db, tenantId);
  if (!status) return false;

  return status.subscriptionStatus === 'failed' || status.subscriptionStatus === 'past_due';
}

/**
 * Get grace period remaining time
 */
function getGraceTimeRemaining(db, tenantId) {
  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!tenant || !tenant.subscription_grace_period_until) {
      return null;
    }

    const gracePeriodUntil = new Date(tenant.subscription_grace_period_until);
    const now = new Date();
    const remaining = gracePeriodUntil - now;

    if (remaining <= 0) {
      return { expired: true, remaining: 0 };
    }

    return {
      expired: false,
      remaining,
      hours: Math.floor(remaining / (1000 * 60 * 60)),
      days: Math.floor(remaining / (1000 * 60 * 60 * 24)),
      until: gracePeriodUntil.toISOString()
    };
  } catch (error) {
    console.error(`Error getting grace time for tenant ${tenantId}:`, error);
    return null;
  }
}

module.exports = {
  canTenantSendCampaigns,
  getSubscriptionStatus,
  isInBillingTrouble,
  getGraceTimeRemaining
};
