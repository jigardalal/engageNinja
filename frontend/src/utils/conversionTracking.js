/**
 * Conversion Tracking Utility
 *
 * Tracks conversion events for analytics and optimization.
 * Events are sent to backend analytics endpoint for aggregation.
 *
 * Events tracked:
 * - USAGE_ALERT_SHOWN / CLICKED / DISMISSED
 * - FEATURE_LOCK_SHOWN / CLICKED
 * - UPGRADE_CTA_CLICKED
 * - MILESTONE_ACHIEVED
 * - PLAN_UPGRADED
 *
 * Usage:
 * import { trackEvent } from '../utils/conversionTracking';
 * trackEvent('USAGE_ALERT_CLICKED', { channel: 'whatsapp', threshold: 80 });
 */

let sessionId = null;

/**
 * Initialize conversion tracking with a session ID
 * Should be called once on app startup
 */
export function initializeTracking() {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
}

/**
 * Track a conversion event
 * @param {string} eventType - Type of event (see EVENT_TYPES)
 * @param {object} properties - Event-specific properties
 */
export async function trackEvent(eventType, properties = {}) {
  if (!sessionId) {
    initializeTracking();
  }

  const payload = {
    event_type: eventType,
    properties: {
      ...properties,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent
    },
    session_id: sessionId
  };

  // Send to backend (non-blocking, fire and forget)
  try {
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    }).catch(err => {
      // Silently fail - don't disrupt user experience
      console.debug('Failed to track event:', err);
    });
  } catch (err) {
    console.debug('Event tracking error:', err);
  }
}

/**
 * Predefined event types
 */
export const EVENT_TYPES = {
  // Usage alerts
  USAGE_ALERT_SHOWN: 'USAGE_ALERT_SHOWN',
  USAGE_ALERT_CLICKED: 'USAGE_ALERT_CLICKED',
  USAGE_ALERT_DISMISSED: 'USAGE_ALERT_DISMISSED',

  // Feature locks
  FEATURE_LOCK_SHOWN: 'FEATURE_LOCK_SHOWN',
  FEATURE_LOCK_CLICKED: 'FEATURE_LOCK_CLICKED',

  // Upgrade CTAs
  UPGRADE_CTA_CLICKED: 'UPGRADE_CTA_CLICKED',
  UPGRADE_CTA_SOURCE: 'UPGRADE_CTA_SOURCE', // Track where upgrade click came from

  // Milestones
  MILESTONE_ACHIEVED: 'MILESTONE_ACHIEVED',

  // Plans
  PLAN_UPGRADED: 'PLAN_UPGRADED',

  // Onboarding
  WELCOME_CAROUSEL_SHOWN: 'WELCOME_CAROUSEL_SHOWN',
  WELCOME_CAROUSEL_COMPLETED: 'WELCOME_CAROUSEL_COMPLETED',
  WELCOME_CAROUSEL_SKIPPED: 'WELCOME_CAROUSEL_SKIPPED',

  // Campaigns
  CAMPAIGN_CREATED: 'CAMPAIGN_CREATED',
  CAMPAIGN_SENT: 'CAMPAIGN_SENT',
  CAMPAIGN_RESEND: 'CAMPAIGN_RESEND'
};

/**
 * Helper: Track usage alert interaction
 */
export function trackUsageAlert(action, channel, threshold) {
  const eventType = {
    shown: EVENT_TYPES.USAGE_ALERT_SHOWN,
    clicked: EVENT_TYPES.USAGE_ALERT_CLICKED,
    dismissed: EVENT_TYPES.USAGE_ALERT_DISMISSED
  }[action];

  if (eventType) {
    trackEvent(eventType, { channel, threshold });
  }
}

/**
 * Helper: Track feature lock interaction
 */
export function trackFeatureLock(action, feature, requiredPlan) {
  const eventType = {
    shown: EVENT_TYPES.FEATURE_LOCK_SHOWN,
    clicked: EVENT_TYPES.FEATURE_LOCK_CLICKED
  }[action];

  if (eventType) {
    trackEvent(eventType, { feature, required_plan: requiredPlan });
  }
}

/**
 * Helper: Track upgrade CTA click
 */
export function trackUpgradeCTA(source, plan = null) {
  trackEvent(EVENT_TYPES.UPGRADE_CTA_CLICKED, {
    source,
    target_plan: plan
  });
}

/**
 * Helper: Track milestone achievement
 */
export function trackMilestone(type, value) {
  trackEvent(EVENT_TYPES.MILESTONE_ACHIEVED, {
    milestone_type: type,
    milestone_value: value
  });
}

/**
 * Get current session ID for debugging
 */
export function getSessionId() {
  if (!sessionId) {
    initializeTracking();
  }
  return sessionId;
}
