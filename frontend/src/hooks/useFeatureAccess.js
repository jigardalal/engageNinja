import { useAuth } from '../context/AuthContext'

/**
 * Hook to check if current user has access to a feature based on plan tier
 *
 * Usage:
 * const { hasAccess, currentPlan, currentTier, requiredTier } = useFeatureAccess('starter')
 *
 * @param {string} requiredPlan - The minimum plan required ('free', 'starter', 'growth', 'pro', 'enterprise')
 * @returns {object} - { hasAccess, currentPlan, currentTier, requiredTier }
 */
export function useFeatureAccess(requiredPlan = 'free') {
  const { tenants, activeTenant } = useAuth()

  const PLAN_TIERS = {
    free: 0,
    starter: 1,
    growth: 2,
    pro: 3,
    enterprise: 4
  }

  const activeTenantInfo = tenants.find(t => t.tenant_id === activeTenant)
  const currentPlanId = activeTenantInfo?.plan?.toLowerCase() || 'free'
  const currentTier = PLAN_TIERS[currentPlanId] ?? 0
  const requiredTier = PLAN_TIERS[requiredPlan.toLowerCase()] ?? 0

  return {
    hasAccess: currentTier >= requiredTier,
    currentPlan: currentPlanId,
    currentTier,
    requiredTier
  }
}
