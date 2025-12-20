/**
 * BillingProvider - Abstract base class for billing integrations
 *
 * Implements the provider pattern (like channels: WhatsApp, Email)
 * Allows plugging in different billing providers (Stripe, Razorpay, etc.)
 */

class BillingProvider {
  /**
   * Create or retrieve a customer in the billing provider
   * @param {Object} tenant - Tenant object with id, name, email
   * @returns {Promise<Object>} - Provider customer object with id
   */
  async createCustomer(tenant) {
    throw new Error('createCustomer() not implemented');
  }

  /**
   * Create a checkout session for subscribing to a plan
   * @param {Object} tenant - Tenant object
   * @param {string} planKey - Plan identifier (free/starter/growth/pro/enterprise)
   * @param {Object} returnUrls - { success: string, cancel: string }
   * @returns {Promise<Object>} - Checkout session with url property
   */
  async createCheckoutSession(tenant, planKey, returnUrls) {
    throw new Error('createCheckoutSession() not implemented');
  }

  /**
   * Create a billing portal session for managing subscription
   * @param {Object} tenant - Tenant object
   * @returns {Promise<Object>} - Portal session with url property
   */
  async createBillingPortalSession(tenant) {
    throw new Error('createBillingPortalSession() not implemented');
  }

  /**
   * Get current subscription status
   * @param {Object} tenant - Tenant object
   * @returns {Promise<Object>} - Subscription details { status, plan_key, current_period_end, ... }
   */
  async getSubscriptionStatus(tenant) {
    throw new Error('getSubscriptionStatus() not implemented');
  }

  /**
   * Handle incoming webhook event from billing provider
   * @param {Object} event - Raw webhook event from provider
   * @returns {Promise<Object>} - Processed event result
   */
  async handleWebhook(event) {
    throw new Error('handleWebhook() not implemented');
  }

  /**
   * Verify webhook signature (security)
   * @param {string} payload - Raw request body
   * @param {string} signature - Signature header from provider
   * @returns {boolean} - True if signature is valid
   */
  async verifyWebhookSignature(payload, signature) {
    throw new Error('verifyWebhookSignature() not implemented');
  }

  /**
   * Apply credits to a tenant (optional)
   * @param {Object} tenant - Tenant object
   * @param {number} amount - Amount in minor units (cents)
   * @param {string} reason - Reason for credit
   * @returns {Promise<Object>} - Credit application result
   */
  async applyCredit(tenant, amount, reason) {
    throw new Error('applyCredit() not implemented');
  }
}

module.exports = BillingProvider;
