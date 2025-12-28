/**
 * MessagingProvider - Abstract base class for all messaging providers
 *
 * All providers (Twilio, AWS SES, Sendgrid, etc.) must extend this class
 * and implement the required methods. This provides a unified interface
 * for the rest of the application, making providers interchangeable.
 *
 * Architecture:
 * - Single interface for all providers (SMS, WhatsApp, Email)
 * - Provider-agnostic error handling
 * - Consistent webhook parsing
 * - Built-in credential management
 */

class MessagingProvider {
  /**
   * Initialize provider with tenant credentials and config
   *
   * @param {string} tenantId - Tenant UUID
   * @param {string} channel - 'sms', 'whatsapp', or 'email'
   * @param {object} credentials - Decrypted credentials JSON from DB
   * @param {object} config - Provider-specific config from DB
   */
  constructor(tenantId, channel, credentials, config = {}) {
    this.tenantId = tenantId;
    this.channel = channel;
    this.credentials = credentials;
    this.config = config;
    this.provider = this.constructor.name;
  }

  /**
   * Send a single message via the provider
   *
   * @param {object} message - Message object with channel-specific fields
   * @returns {Promise<object>} { success: bool, provider_message_id: string, status: string, error?: string }
   *
   * @example
   * // SMS
   * await provider.send({
   *   phone_number: '+1234567890',
   *   content: 'Hello, world!',
   *   id: 'msg-123'
   * })
   *
   * @example
   * // Email
   * await provider.send({
   *   to_email: 'user@example.com',
   *   subject: 'Welcome',
   *   html_body: '<p>Hello</p>',
   *   id: 'msg-456'
   * })
   */
  async send(message) {
    throw new Error(`${this.provider}.send() not implemented`);
  }

  /**
   * Verify provider credentials are valid
   *
   * Called during channel setup to ensure credentials work
   *
   * @returns {Promise<object>} { success: bool, error?: string }
   */
  async verify() {
    throw new Error(`${this.provider}.verify() not implemented`);
  }

  /**
   * Parse incoming webhook from provider
   *
   * Providers send status updates via webhooks. This extracts the
   * relevant data and returns a normalized event object.
   *
   * @param {object} body - Raw webhook body (from request)
   * @param {string} signature - Signature header for verification
   * @returns {object} { provider_message_id: string, status: string, timestamp: Date, error?: string, raw?: object }
   *
   * @example
   * // Twilio webhook
   * const event = provider.parseWebhook(req.body, req.headers['x-twilio-signature']);
   * // Returns: { provider_message_id: 'msg-123', status: 'delivered', timestamp: Date }
   */
  parseWebhook(body, signature) {
    throw new Error(`${this.provider}.parseWebhook() not implemented`);
  }

  /**
   * Get provider account status and limits
   *
   * Useful for rate limiting, quota checks, and health monitoring
   *
   * @returns {Promise<object>} { status: string, balance?: number, rate_limit?: number, error?: string }
   */
  async getStatus() {
    throw new Error(`${this.provider}.getStatus() not implemented`);
  }

  /**
   * Get supported channels for this provider
   *
   * @returns {array} List of supported channels ('sms', 'whatsapp', 'email')
   */
  static getSupportedChannels() {
    throw new Error(`${this.name}.getSupportedChannels() not implemented`);
  }

  /**
   * Helper: Normalize message status from provider format
   *
   * Different providers use different status names. This normalizes them
   * to a standard format: queued, sent, delivered, read, failed
   *
   * @param {string} providerStatus - Status from provider
   * @returns {string} Normalized status
   */
  normalizeStatus(providerStatus) {
    // Default implementation - override in subclasses
    const statusMap = {
      // Twilio SMS/WhatsApp (both lowercase and capitalized)
      'queued': 'queued',
      'Queued': 'queued',
      'sent': 'sent',
      'Sent': 'sent',
      'delivered': 'delivered',
      'Delivered': 'delivered',
      'read': 'read',
      'Read': 'read',
      'failed': 'failed',
      'Failed': 'failed',
      'undelivered': 'failed',
      'Undelivered': 'failed',

      // AWS SES (uses SNS notifications)
      'Send': 'sent',
      'Delivery': 'delivered',
      'Bounce': 'failed',
      'Complaint': 'failed',

      // Generic
      'pending': 'queued',
      'success': 'sent',
      'error': 'failed'
    };

    return statusMap[providerStatus] || providerStatus.toLowerCase();
  }

  /**
   * Helper: Extract provider message ID from webhook
   *
   * Different providers use different field names. This helps find it.
   * Override in subclasses if needed.
   *
   * @param {object} data - Webhook data
   * @returns {string} Provider message ID
   */
  extractMessageId(data) {
    // Common field names
    return (
      data.MessageSid || // Twilio
      data.MessageId || // AWS
      data.message_id ||
      data.id ||
      null
    );
  }

  /**
   * Helper: Extract message timestamp from webhook
   *
   * @param {object} data - Webhook data
   * @returns {Date} Timestamp
   */
  extractTimestamp(data) {
    // Common field names
    const timestamp = (
      data.Timestamp ||
      data.timestamp ||
      data.date ||
      new Date().toISOString()
    );
    return new Date(timestamp);
  }

  /**
   * Helper: Log provider-specific error for debugging
   *
   * @param {string} action - What we were trying to do
   * @param {Error} error - The error that occurred
   * @param {object} context - Additional context (message ID, phone number, etc.)
   */
  logError(action, error, context = {}) {
    console.error(`[${this.provider}] ${action} failed:`, {
      tenantId: this.tenantId,
      channel: this.channel,
      error: error.message,
      code: error.code,
      ...context
    });
  }

  /**
   * Helper: Validate that required credentials are present
   *
   * @param {array} requiredFields - Field names that must be in credentials
   * @returns {boolean} True if all required fields present
   */
  hasRequiredCredentials(requiredFields) {
    return requiredFields.every(field => this.credentials && this.credentials[field]);
  }
}

module.exports = MessagingProvider;
