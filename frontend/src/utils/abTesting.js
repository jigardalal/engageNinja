/**
 * A/B Testing Framework
 *
 * Simple utility for running A/B tests on conversion messaging.
 * Deterministically assigns users to variants based on session ID.
 *
 * Usage:
 * const test = new ABTest('usage_alert_copy_v1', ['variant_a', 'variant_b']);
 * const buttonText = test.isVariant('variant_a') ? 'Upgrade Now' : 'See Plans';
 * test.track(); // Track which variant user was in
 */

import { trackEvent } from './conversionTracking';

/**
 * Simple hash function for consistent variant assignment
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * A/B Test class
 *
 * Deterministically assigns users to variants based on:
 * 1. Test ID
 * 2. User session (from sessionStorage or generated)
 *
 * This ensures consistent variant assignment across sessions.
 */
export class ABTest {
  constructor(testId, variants = []) {
    this.testId = testId;
    this.variants = variants;

    // Get or create session ID
    let sessionId = sessionStorage.getItem('ab_test_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ab_test_session_id', sessionId);
    }

    // Deterministically assign variant
    const hash = hashString(`${testId}:${sessionId}`);
    const variantIndex = hash % this.variants.length;
    this.assignedVariant = this.variants[variantIndex];
  }

  /**
   * Check if user is in a specific variant
   * @param {string} variant - Variant name to check
   * @returns {boolean} - True if user is in this variant
   */
  isVariant(variant) {
    return this.assignedVariant === variant;
  }

  /**
   * Get the assigned variant
   * @returns {string} - Variant name
   */
  getVariant() {
    return this.assignedVariant;
  }

  /**
   * Track that user was exposed to this test
   * @param {object} metadata - Additional metadata to track
   */
  track(metadata = {}) {
    trackEvent('AB_TEST_EXPOSURE', {
      test_id: this.testId,
      variant: this.assignedVariant,
      variants: this.variants,
      ...metadata
    });
  }

  /**
   * Track a conversion in this test
   * @param {string} action - The action taken (e.g., 'clicked', 'submitted')
   * @param {object} metadata - Additional metadata
   */
  trackConversion(action = 'converted', metadata = {}) {
    trackEvent('AB_TEST_CONVERSION', {
      test_id: this.testId,
      variant: this.assignedVariant,
      action,
      ...metadata
    });
  }
}

/**
 * Predefined A/B tests for common scenarios
 */
export const PREDEFINED_TESTS = {
  // Usage alert CTA messaging
  usageAlertCTA: new ABTest('usage_alert_cta_v1', [
    'see_plans',      // Conservative: "See Plans"
    'upgrade_now',    // Aggressive: "Upgrade Now"
    'get_more'        // Benefit: "Get More Messages"
  ]),

  // Feature lock messaging
  featureLockMessage: new ABTest('feature_lock_msg_v1', [
    'benefit_focused',  // Focus on benefits: "Pro users automate at scale..."
    'limit_focused'     // Focus on limitations: "This feature requires..."
  ]),

  // Milestone celebration tone
  milestoneTone: new ABTest('milestone_tone_v1', [
    'casual',           // Casual tone: "You're on fire! 🔥"
    'professional',     // Professional tone: "Milestone achieved"
    'motivational'      // Motivational tone: "Keep pushing, you're crushing it!"
  ]),

  // Welcome carousel length
  welcomeCarouselSteps: new ABTest('welcome_carousel_v1', [
    'three_steps',      // Full 3-step carousel
    'two_steps'         // Quick 2-step version
  ]),

  // Upgrade banner placement
  upgradeBannerVariant: new ABTest('upgrade_banner_v1', [
    'compact',          // Single-line banner
    'full'              // Full card with benefits list
  ]),

  // Plan comparison CTA
  planComparisonCTA: new ABTest('plan_comparison_cta_v1', [
    'upgrade_to_plan',  // "Upgrade to [Plan Name]"
    'see_what_you_get' // "See What You Get"
  ])
};

/**
 * Get a predefined test
 * @param {string} testName - Name from PREDEFINED_TESTS
 * @returns {ABTest} - The test instance
 */
export function getTest(testName) {
  return PREDEFINED_TESTS[testName] || null;
}

/**
 * Create a custom test
 * @param {string} testId - Unique test identifier
 * @param {array} variants - Array of variant names
 * @returns {ABTest} - New test instance
 */
export function createTest(testId, variants) {
  return new ABTest(testId, variants);
}

/**
 * Example usage:
 *
 * // Get a predefined test
 * const ctaTest = getTest('usageAlertCTA');
 * const buttonText = ctaTest.isVariant('see_plans') ? 'See Plans' : 'Upgrade Now';
 * ctaTest.track(); // Track exposure
 * buttonElement.addEventListener('click', () => ctaTest.trackConversion('clicked'));
 *
 * // Or create a custom test
 * const customTest = createTest('custom_message_v1', ['version_a', 'version_b']);
 * if (customTest.isVariant('version_a')) {
 *   // Show version A
 * }
 */
