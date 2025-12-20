/**
 * Email Service
 * Sends transactional emails via Brevo (SendinBlue)
 */

class EmailService {
  constructor(logger = console) {
    this.logger = logger;
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.SENDER_EMAIL || 'noreply@engageninja.com';
    this.senderName = 'EngageNinja';

    if (!this.apiKey) {
      this.logger.warn('⚠ BREVO_API_KEY not configured - email notifications disabled');
    }
  }

  /**
   * Send billing failure notification email
   */
  async sendBillingFailureEmail(tenant, failureReason, gracePeriodUntil) {
    if (!this.apiKey) {
      this.logger.warn(`Email service not configured - skipping notification for tenant ${tenant.id}`);
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const billingEmail = tenant.billing_email || tenant.email;
      if (!billingEmail) {
        this.logger.warn(`No email address for tenant ${tenant.id}`);
        return { success: false, reason: 'No email address' };
      }

      const graceDateObj = new Date(gracePeriodUntil);
      const graceDate = graceDateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const failureDescriptions = {
        card_declined: 'Your card was declined by your bank.',
        insufficient_funds: 'Your account does not have sufficient funds.',
        expired_card: 'Your card has expired.',
        authentication_failed: 'Authentication failed.',
        card_error: 'There was an issue processing your card.',
        payment_failed: 'Payment processing failed.'
      };

      const failureDesc = failureDescriptions[failureReason] || 'Payment processing failed.';
      const subject = `⚠️ Payment Failed - Action Required for ${tenant.name}`;

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [{ email: billingEmail, name: tenant.name }],
          sender: { email: this.senderEmail, name: this.senderName },
          subject: subject,
          htmlContent: `<html><body style="font-family: Arial, sans-serif;"><div style="max-width: 600px; margin: 0 auto;"><h2>Payment Failed</h2><p>Hi ${tenant.name},</p><p>Your recent payment failed: <strong>${failureDesc}</strong></p><p><strong>⏰ Grace Period Deadline: ${graceDate}</strong></p><p>You have 48 hours to update your payment method. Visit your billing settings to fix this.</p><p>Need help? Contact support@engageninja.com</p></div></body></html>`,
          tags: ['billing', 'payment-failed', tenant.id]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      this.logger.info(`Billing failure email sent to ${billingEmail} for tenant ${tenant.id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send billing failure email for tenant ${tenant.id}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment success confirmation email
   */
  async sendPaymentSuccessEmail(tenant) {
    if (!this.apiKey) {
      this.logger.warn(`Email service not configured - skipping notification for tenant ${tenant.id}`);
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const billingEmail = tenant.billing_email || tenant.email;
      if (!billingEmail) {
        this.logger.warn(`No email address for tenant ${tenant.id}`);
        return { success: false, reason: 'No email address' };
      }

      const subject = `✅ Payment Successful - ${tenant.name}`;

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [{ email: billingEmail, name: tenant.name }],
          sender: { email: this.senderEmail, name: this.senderName },
          subject: subject,
          htmlContent: `<html><body style="font-family: Arial, sans-serif;"><div style="max-width: 600px; margin: 0 auto;"><h2>✓ Payment Successful</h2><p>Hi ${tenant.name},</p><p>Your payment has been processed successfully and your subscription is now active.</p><p>You can now use all features in your plan. Visit your dashboard to get started.</p><p>Need help? Contact support@engageninja.com</p></div></body></html>`,
          tags: ['billing', 'payment-success', tenant.id]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      this.logger.info(`Payment success email sent to ${billingEmail} for tenant ${tenant.id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send payment success email for tenant ${tenant.id}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send subscription cancellation notification email
   */
  async sendSubscriptionCancelledEmail(tenant, canceledAt, reason) {
    if (!this.apiKey) {
      this.logger.warn(`Email service not configured - skipping notification for tenant ${tenant.id}`);
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const billingEmail = tenant.billing_email || tenant.email;
      if (!billingEmail) {
        this.logger.warn(`No email address for tenant ${tenant.id}`);
        return { success: false, reason: 'No email address' };
      }

      const cancelDate = new Date(canceledAt).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const subject = `📋 Subscription Cancelled - ${tenant.name}`;

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [{ email: billingEmail, name: tenant.name }],
          sender: { email: this.senderEmail, name: this.senderName },
          subject: subject,
          htmlContent: `<html><body style="font-family: Arial, sans-serif;"><div style="max-width: 600px; margin: 0 auto;"><h2>Subscription Cancelled</h2><p>Hi ${tenant.name},</p><p>Your subscription has been cancelled effective <strong>${cancelDate}</strong>.</p><p><strong>Cancellation Reason:</strong> ${reason}</p><p>Your account has been downgraded to the free plan. If this was a mistake or you'd like to reactivate your subscription, you can do so anytime from your billing settings.</p><p>We'd love to have you back! If there's anything we can improve, please let us know at support@engageninja.com</p></div></body></html>`,
          tags: ['billing', 'subscription-cancelled', tenant.id]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      this.logger.info(`Subscription cancellation email sent to ${billingEmail} for tenant ${tenant.id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send subscription cancellation email for tenant ${tenant.id}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
