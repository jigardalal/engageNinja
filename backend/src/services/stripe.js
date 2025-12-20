/**
 * Stripe Billing Provider Implementation
 *
 * Handles all Stripe integration:
 * - Customer creation
 * - Checkout sessions for subscriptions
 * - Billing portal
 * - Webhook events
 */

const BillingProvider = require('./billingProvider');
const crypto = require('crypto');
const InvoiceGenerator = require('./invoiceGenerator');

class StripeProvider extends BillingProvider {
  constructor(db, stripeClient, logger = console) {
    super();
    this.db = db;
    this.stripe = stripeClient;
    this.logger = logger;

    if (!this.stripe) {
      throw new Error('Stripe client is required');
    }

    // Plan key to Stripe price ID mapping (set via environment or config)
    this.priceMap = {
      free: null, // No price for free tier
      starter: process.env.STRIPE_PRICE_STARTER,
      growth: process.env.STRIPE_PRICE_GROWTH,
      pro: process.env.STRIPE_PRICE_PRO,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(tenant) {
    try {
      // Check if customer already exists in database
      const existing = this.db
        .prepare(
          `SELECT provider_customer_id FROM billing_customers
           WHERE tenant_id = ? AND provider = 'stripe'`
        )
        .get(tenant.id);

      if (existing?.provider_customer_id) {
        return { id: existing.provider_customer_id };
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: tenant.billing_email || tenant.email || `tenant-${tenant.id}@engageninja.local`,
        name: tenant.name,
        metadata: {
          tenant_id: tenant.id,
          tenant_name: tenant.name,
        },
      });

      // Store in database
      this.db
        .prepare(
          `INSERT OR REPLACE INTO billing_customers (tenant_id, provider, provider_customer_id, created_at)
           VALUES (?, 'stripe', ?, CURRENT_TIMESTAMP)`
        )
        .run(tenant.id, customer.id);

      this.logger.info(`Created Stripe customer for tenant ${tenant.id}: ${customer.id}`);

      return { id: customer.id };
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer for tenant ${tenant.id}:`, error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(tenant, planKey, returnUrls) {
    try {
      // Validate plan
      if (!this.priceMap.hasOwnProperty(planKey)) {
        throw new Error(`Invalid plan key: ${planKey}`);
      }

      // Free tier doesn't need checkout
      if (planKey === 'free') {
        return { url: null, session_id: 'free' };
      }

      // Get the new plan's default price
      const newPlan = this.db
        .prepare('SELECT * FROM plans WHERE id = ?')
        .get(planKey);

      if (!newPlan) {
        throw new Error(`Plan not found: ${planKey}`);
      }

      // Use the new plan's default price (not the old tenant's negotiated price)
      const priceAmount = newPlan.default_price;
      if (!priceAmount || priceAmount <= 0) {
        throw new Error(`Plan ${planKey} has no valid price configured`);
      }

      // Create a one-time price for this checkout (Stripe requires price object)
      // In production, you might want to reuse price IDs, but this approach is simpler
      // and allows any arbitrary price amount without managing Stripe prices

      // Ensure customer exists
      await this.createCustomer(tenant);

      const customer = this.db
        .prepare(
          `SELECT provider_customer_id FROM billing_customers
           WHERE tenant_id = ? AND provider = 'stripe'`
        )
        .get(tenant.id);

      // Create checkout session with custom price amount
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.provider_customer_id,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan`,
              description: `EngageNinja ${planKey} Plan`,
            },
            unit_amount: Math.round(priceAmount * 100), // Stripe uses cents
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        }],
        success_url: returnUrls.success,
        cancel_url: returnUrls.cancel,
        metadata: {
          tenant_id: tenant.id,
          plan_key: planKey,
          price_amount: priceAmount.toString(),
        },
      });

      this.logger.info(`Created Stripe checkout session for tenant ${tenant.id}: ${session.id}`);

      return {
        url: session.url,
        session_id: session.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session for tenant ${tenant.id}:`, error);
      throw error;
    }
  }

  /**
   * Create a billing portal session for managing subscriptions
   */
  async createBillingPortalSession(tenant) {
    try {
      const customer = this.db
        .prepare(
          `SELECT provider_customer_id FROM billing_customers
           WHERE tenant_id = ? AND provider = 'stripe'`
        )
        .get(tenant.id);

      if (!customer?.provider_customer_id) {
        throw new Error(`No Stripe customer found for tenant ${tenant.id}`);
      }

      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: customer.provider_customer_id,
        return_url: `${process.env.APP_URL || 'http://localhost:5173'}/dashboard/billing`,
      });

      this.logger.info(`Created Stripe portal session for tenant ${tenant.id}`);

      return { url: portalSession.url };
    } catch (error) {
      this.logger.error(`Failed to create portal session for tenant ${tenant.id}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription status from Stripe
   */
  async getSubscriptionStatus(tenant) {
    try {
      // Get subscription from database
      const subscription = this.db
        .prepare(
          `SELECT * FROM subscriptions
           WHERE tenant_id = ? AND provider = 'stripe'`
        )
        .get(tenant.id);

      if (!subscription) {
        // No subscription (free tier or never subscribed)
        return {
          status: 'free',
          plan_key: 'free',
          current_period_start: null,
          current_period_end: null,
        };
      }

      // Get fresh status from Stripe to ensure it's current
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.provider_subscription_id
      );

      return {
        id: subscription.id,
        status: stripeSubscription.status,
        plan_key: subscription.plan_key,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription status for tenant ${tenant.id}:`, error);
      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  async verifyWebhookSignature(payload, signature) {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET environment variable not set');
        return false;
      }

      if (!signature) {
        console.error('❌ No stripe-signature header provided');
        return false;
      }

      // Extract timestamp and signature from header
      // Header format: t=timestamp,v1=signature
      const parts = signature.split(',');
      let timestamp = null;
      let signedHash = null;

      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') signedHash = value;
      }

      if (!timestamp || !signedHash) {
        console.error('❌ Invalid Stripe signature header format');
        return false;
      }

      // Check timestamp (allow 5 minutes tolerance)
      const now = Math.floor(Date.now() / 1000);
      const age = now - parseInt(timestamp);
      if (age > 300) {
        console.error(`❌ Stripe webhook signature timestamp too old (${age}s ago)`);
        return false;
      }

      // Stripe signs: timestamp.payload
      const signedContent = `${timestamp}.${payload}`;
      const hash = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent)
        .digest('hex');

      // Compare hashes
      const isValid = hash === signedHash;
      if (!isValid) {
        console.error('❌ Stripe signature mismatch', {
          expected: signedHash,
          got: hash
        });
      }
      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify Stripe webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    try {
      const { type, data } = event;

      switch (type) {
        case 'customer.subscription.created':
          return await this._handleSubscriptionCreated(data.object);

        case 'customer.subscription.updated':
          return await this._handleSubscriptionUpdated(data.object);

        case 'customer.subscription.deleted':
          return this._handleSubscriptionDeleted(data.object);

        case 'invoice.paid':
          return this._handleInvoicePaid(data.object);

        case 'invoice.payment_failed':
          return this._handleInvoicePaymentFailed(data.object);

        default:
          this.logger.info(`Unhandled Stripe event: ${type}`);
          return { handled: false };
      }
    } catch (error) {
      this.logger.error('Failed to handle Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Handle subscription.created event
   */
  async _handleSubscriptionCreated(stripeSubscription) {
    try {
      const tenant = this._getTenantFromMetadata(stripeSubscription);
      if (!tenant) return { handled: false };

      // Fetch full subscription details with product expanded to get product name
      let fullSub = stripeSubscription;
      try {
        fullSub = await this.stripe.subscriptions.retrieve(stripeSubscription.id, {
          expand: ['items.data.price.product']
        });
        console.log(`🔄 Fetched full subscription with product details`);
      } catch (e) {
        console.warn(`⚠️  Could not fetch full subscription: ${e.message}`);
      }

      console.log(`🔍 Subscription metadata: `, fullSub.metadata);
      console.log(`🔍 Subscription items:`, JSON.stringify(fullSub.items?.data?.map(item => ({
        price_id: item.price?.id,
        product_name: item.price?.product?.name
      })), null, 2));

      // Extract plan from subscription items (what was actually subscribed to)
      let planKey = fullSub.metadata?.plan_key || 'starter';

      // Try to match from subscription items and Stripe price IDs
      if (fullSub.items?.data?.length > 0) {
        const priceId = fullSub.items.data[0].price?.id;
        if (priceId) {
          // Match price ID against our configured price map
          for (const [plan, price] of Object.entries(this.priceMap)) {
            if (price === priceId) {
              planKey = plan;
              console.log(`✅ Matched price ID ${priceId} to plan: ${plan}`);
              break;
            }
          }
        }

        // If still not matched, try to extract from product name
        if (planKey === (fullSub.metadata?.plan_key || 'starter')) {
          const productName = fullSub.items.data[0].price?.product?.name || '';
          if (productName) {
            if (productName.toLowerCase().includes('growth')) planKey = 'growth';
            else if (productName.toLowerCase().includes('pro')) planKey = 'pro';
            else if (productName.toLowerCase().includes('enterprise')) planKey = 'enterprise';
            else if (productName.toLowerCase().includes('starter')) planKey = 'starter';
            console.log(`✅ Matched product name "${productName}" to plan: ${planKey}`);
          }
        }
      }

      console.log(`📦 Plan detection result: ${planKey} (product: ${fullSub.items?.data?.[0]?.price?.product?.name})`);

      // Get the plan to extract its default price
      const plan = this.db
        .prepare('SELECT * FROM plans WHERE id = ?')
        .get(planKey);

      // Insert subscription record - safely convert timestamps
      let periodStart, periodEnd;
      try {
        if (stripeSubscription.current_period_start) {
          periodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
        } else {
          periodStart = new Date().toISOString();
        }
        if (stripeSubscription.current_period_end) {
          periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
        } else {
          periodEnd = new Date().toISOString();
        }
      } catch (e) {
        console.error('Error converting subscription timestamps:', e, {
          current_period_start: stripeSubscription.current_period_start,
          current_period_end: stripeSubscription.current_period_end
        });
        periodStart = new Date().toISOString();
        periodEnd = new Date().toISOString();
      }

      // Map Stripe status to allowed values
      const allowedStatuses = ['trialing', 'active', 'past_due', 'unpaid', 'canceled'];
      let dbStatus = stripeSubscription.status;

      // Handle Stripe statuses that don't match our allowed list
      if (!allowedStatuses.includes(dbStatus)) {
        console.log(`⚠️  Mapping Stripe status '${dbStatus}' to 'active'`);
        // Map incomplete and other statuses to active (subscription will be active once payment processes)
        dbStatus = 'active';
      }

      this.db
        .prepare(
          `INSERT OR REPLACE INTO subscriptions (
             id, tenant_id, provider, provider_subscription_id, plan_key, status,
             current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
           ) VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .run(
          crypto.randomUUID(),
          tenant.id,
          stripeSubscription.id,
          planKey,
          dbStatus,
          periodStart,
          periodEnd,
          stripeSubscription.cancel_at_period_end ? 1 : 0
        );

      // Update tenant: plan_id, price (to new plan's default), and subscription status
      this.db
        .prepare(
          `UPDATE tenants
           SET plan_id = ?, price = ?, subscription_status = 'active',
               last_payment_failed_at = NULL, subscription_grace_period_until = NULL,
               subscription_failure_reason = NULL
           WHERE id = ?`
        )
        .run(planKey, plan?.default_price || 0, tenant.id);

      // Log subscription event
      this.db
        .prepare(
          `INSERT INTO subscription_events
           (id, tenant_id, event_type, stripe_event_id, stripe_event_type, status, created_at)
           VALUES (?, ?, 'subscription_created', ?, 'customer.subscription.created', 'success', CURRENT_TIMESTAMP)`
        )
        .run(crypto.randomUUID(), tenant.id, stripeSubscription.id);

      this.logger.info(`Subscription created for tenant ${tenant.id}: ${stripeSubscription.id}`, {
        plan: planKey,
        price: plan?.default_price || 0,
        status: stripeSubscription.status
      });

      return { handled: true, tenantId: tenant.id };
    } catch (error) {
      this.logger.error('Failed to handle subscription.created event:', error);
      throw error;
    }
  }

  /**
   * Handle subscription.updated event
   */
  async _handleSubscriptionUpdated(stripeSubscription) {
    try {
      const tenant = this._getTenantFromMetadata(stripeSubscription);
      if (!tenant) return { handled: false };

      // Fetch full subscription details with product expanded to get product name
      let fullSub = stripeSubscription;
      try {
        fullSub = await this.stripe.subscriptions.retrieve(stripeSubscription.id, {
          expand: ['items.data.price.product']
        });
        console.log(`🔄 Fetched full subscription with product details`);
      } catch (e) {
        console.warn(`⚠️  Could not fetch full subscription: ${e.message}`);
      }

      // Extract plan from subscription items (what was actually subscribed to)
      let planKey = fullSub.metadata?.plan_key || tenant.plan_id || 'starter';

      // Try to match from subscription items and Stripe price IDs
      if (fullSub.items?.data?.length > 0) {
        const priceId = fullSub.items.data[0].price?.id;
        if (priceId) {
          // Match price ID against our configured price map
          for (const [plan, price] of Object.entries(this.priceMap)) {
            if (price === priceId) {
              planKey = plan;
              console.log(`✅ Matched price ID ${priceId} to plan: ${plan}`);
              break;
            }
          }
        }

        // If still not matched, try to extract from product name
        if (planKey === (fullSub.metadata?.plan_key || tenant.plan_id || 'starter')) {
          const productName = fullSub.items.data[0].price?.product?.name || '';
          if (productName) {
            if (productName.toLowerCase().includes('growth')) planKey = 'growth';
            else if (productName.toLowerCase().includes('pro')) planKey = 'pro';
            else if (productName.toLowerCase().includes('enterprise')) planKey = 'enterprise';
            else if (productName.toLowerCase().includes('starter')) planKey = 'starter';
            console.log(`✅ Matched product name "${productName}" to plan: ${planKey}`);
          }
        }
      }

      console.log(`📦 Plan detection result: ${planKey} (product: ${fullSub.items?.data?.[0]?.price?.product?.name}`);

      // Get the plan to extract its default price
      const plan = this.db
        .prepare('SELECT * FROM plans WHERE id = ?')
        .get(planKey);

      // Safely convert timestamps
      let periodStart, periodEnd;
      try {
        if (stripeSubscription.current_period_start) {
          periodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
        } else {
          periodStart = new Date().toISOString();
        }
        if (stripeSubscription.current_period_end) {
          periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
        } else {
          periodEnd = new Date().toISOString();
        }
      } catch (e) {
        console.error('Error converting subscription timestamps:', e, {
          current_period_start: stripeSubscription.current_period_start,
          current_period_end: stripeSubscription.current_period_end
        });
        periodStart = new Date().toISOString();
        periodEnd = new Date().toISOString();
      }

      // Map Stripe status to allowed values
      const allowedStatuses = ['trialing', 'active', 'past_due', 'unpaid', 'canceled'];
      let dbStatus = stripeSubscription.status;

      // Handle Stripe statuses that don't match our allowed list
      if (!allowedStatuses.includes(dbStatus)) {
        console.log(`⚠️  Mapping Stripe status '${dbStatus}' to 'active'`);
        // Map incomplete and other statuses to active (subscription will be active once payment processes)
        dbStatus = 'active';
      }

      this.db
        .prepare(
          `UPDATE subscriptions SET
             plan_key = ?, status = ?, current_period_start = ?, current_period_end = ?,
             cancel_at_period_end = ?, updated_at = CURRENT_TIMESTAMP
           WHERE provider_subscription_id = ?`
        )
        .run(
          planKey,
          dbStatus,
          periodStart,
          periodEnd,
          stripeSubscription.cancel_at_period_end ? 1 : 0,
          stripeSubscription.id
        );

      // Update tenant's plan and price
      this.db
        .prepare(
          `UPDATE tenants SET
             plan_id = ?, price = ?, subscription_status = 'active'
           WHERE id = ?`
        )
        .run(planKey, plan?.default_price || 0, tenant.id);

      this.logger.info(
        `Subscription updated for tenant ${tenant.id}: plan=${planKey}, status=${stripeSubscription.status}`,
        { plan: planKey, price: plan?.default_price || 0 }
      );

      return { handled: true, tenantId: tenant.id };
    } catch (error) {
      this.logger.error('Failed to handle subscription.updated event:', error);
      throw error;
    }
  }

  /**
   * Handle subscription.deleted event
   */
  _handleSubscriptionDeleted(stripeSubscription) {
    try {
      const tenant = this._getTenantFromMetadata(stripeSubscription);
      if (!tenant) return { handled: false };

      const canceledAt = new Date(stripeSubscription.canceled_at * 1000).toISOString();
      const cancelReason = stripeSubscription.metadata?.cancellation_reason || 'No reason provided';

      this.db
        .prepare(
          `UPDATE subscriptions SET status = ?, canceled_at = ?, updated_at = CURRENT_TIMESTAMP
           WHERE provider_subscription_id = ?`
        )
        .run('canceled', canceledAt, stripeSubscription.id);

      // Reset tenant to free plan and mark as cancelled
      this.db
        .prepare(
          `UPDATE tenants
           SET plan_id = 'free',
               subscription_status = 'cancelled',
               subscription_cancelled_at = ?,
               subscription_cancellation_reason = ?
           WHERE id = ?`
        )
        .run(canceledAt, cancelReason, tenant.id);

      // Log cancellation event
      this.db
        .prepare(
          `INSERT INTO subscription_events
           (id, tenant_id, event_type, stripe_event_id, stripe_event_type, status, created_at)
           VALUES (?, ?, 'subscription_cancelled', ?, 'customer.subscription.deleted', 'success', CURRENT_TIMESTAMP)`
        )
        .run(crypto.randomUUID(), tenant.id, stripeSubscription.id);

      this.logger.info(`Subscription canceled for tenant ${tenant.id}: ${stripeSubscription.id}`, {
        canceledAt,
        reason: cancelReason
      });

      return {
        handled: true,
        tenantId: tenant.id,
        notification: {
          type: 'subscription_cancelled',
          canceledAt,
          reason: cancelReason
        }
      };
    } catch (error) {
      this.logger.error('Failed to handle subscription.deleted event:', error);
      throw error;
    }
  }

  /**
   * Handle invoice.paid event
   */
  async _handleInvoicePaid(stripeInvoice) {
    try {
      this.logger.info('💳 Processing invoice.paid event:', {
        invoiceId: stripeInvoice.id,
        customerId: stripeInvoice.customer,
        amountPaid: stripeInvoice.amount_paid,
        currency: stripeInvoice.currency
      });

      const tenant = this._getTenantFromMetadata(stripeInvoice);
      if (!tenant) {
        this.logger.warn('❌ Could not extract tenant from invoice metadata:', {
          invoiceId: stripeInvoice.id,
          metadata: stripeInvoice.metadata,
          customerMetadata: stripeInvoice.customer?.metadata
        });
        return { handled: false, error: 'tenant_not_found' };
      }

      this.logger.info('✅ Found tenant:', { tenantId: tenant.id });

      // Insert or update invoice record
      const invoiceId = crypto.randomUUID();
      const invoiceDate = new Date(stripeInvoice.created * 1000).toISOString();
      this.db
        .prepare(
          `INSERT OR REPLACE INTO invoices (
             id, tenant_id, provider, provider_invoice_id, amount_total, currency,
             status, hosted_invoice_url, created_at
           ) VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?)`
        )
        .run(
          invoiceId,
          tenant.id,
          stripeInvoice.id,
          stripeInvoice.amount_paid,
          stripeInvoice.currency,
          'paid',
          stripeInvoice.hosted_invoice_url,
          invoiceDate
        );

      this.logger.info('📝 Invoice saved to database:', {
        id: invoiceId,
        tenantId: tenant.id,
        stripeInvoiceId: stripeInvoice.id
      });

      // Update tenant subscription status to active and clear any failures
      this.db
        .prepare(
          `UPDATE tenants
           SET subscription_status = 'active', last_payment_failed_at = NULL,
               subscription_grace_period_until = NULL, subscription_failure_reason = NULL
           WHERE id = ?`
        )
        .run(tenant.id);

      this.logger.info('🟢 Tenant status updated to active');

      // Update subscription status
      this.db
        .prepare(`UPDATE subscriptions SET status = 'active' WHERE tenant_id = ?`)
        .run(tenant.id);

      // Generate PDF invoice
      try {
        const invoiceGen = new InvoiceGenerator();
        const invoiceNumber = InvoiceGenerator.generateInvoiceNumber(invoiceId);

        // Get full tenant details
        const fullTenant = this.db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant.id);
        const plan = this.db.prepare('SELECT * FROM plans WHERE id = ?').get(fullTenant?.plan_id || 'free');

        const invoiceData = {
          invoiceNumber,
          invoiceDate: new Date(stripeInvoice.created * 1000).toISOString(),
          dueDate: new Date((stripeInvoice.created + 30 * 24 * 60 * 60) * 1000).toISOString(),
          tenantId: fullTenant.id,
          tenantName: fullTenant.name || 'Customer',
          tenantEmail: fullTenant.email || '',
          tenantAddress: fullTenant.address || '',
          planName: plan?.name || 'Plan',
          planPrice: (plan?.default_price || 0) * 100, // Convert to cents
          negotiatedPrice: stripeInvoice.amount_paid,
          status: 'paid',
          paymentMethod: 'Credit Card (Stripe)',
          paidDate: new Date(stripeInvoice.created * 1000).toISOString(),
          stripeInvoiceId: stripeInvoice.id
        };

        await invoiceGen.generateInvoice(invoiceData);
        this.logger.info('📄 PDF invoice generated for tenant:', tenant.id);
      } catch (pdfError) {
        this.logger.warn('⚠️  Failed to generate PDF invoice:', pdfError.message);
        // Continue anyway - invoice record was saved
      }

      this.logger.info('✅ Invoice paid event successfully processed for tenant:', {
        tenantId: tenant.id,
        invoiceId: stripeInvoice.id,
        amount: stripeInvoice.amount_paid,
        currency: stripeInvoice.currency
      });

      return {
        handled: true,
        tenantId: tenant.id,
        notification: {
          type: 'payment_succeeded'
        }
      };
    } catch (error) {
      this.logger.error('❌ Failed to handle invoice.paid event:', {
        error: error.message,
        stack: error.stack,
        invoice: {
          id: stripeInvoice?.id,
          customer: stripeInvoice?.customer
        }
      });
      throw error;
    }
  }

  /**
   * Handle invoice.payment_failed event
   */
  _handleInvoicePaymentFailed(stripeInvoice) {
    try {
      const tenant = this._getTenantFromMetadata(stripeInvoice);
      if (!tenant) return { handled: false };

      // Calculate grace period (48 hours from now)
      const now = new Date();
      const gracePeriodUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Get failure reason from attempt
      let failureReason = 'unknown';
      if (stripeInvoice.last_finalization_error) {
        const errCode = stripeInvoice.last_finalization_error.code;
        if (errCode === 'card_declined') failureReason = 'card_declined';
        else if (errCode === 'insufficient_funds') failureReason = 'insufficient_funds';
        else if (errCode === 'card_error') failureReason = 'card_error';
        else if (errCode === 'authentication_error') failureReason = 'authentication_error';
        else failureReason = errCode || 'payment_failed';
      }

      // Update tenant with failure info
      this.db
        .prepare(
          `UPDATE tenants
           SET subscription_status = 'failed',
               last_payment_failed_at = CURRENT_TIMESTAMP,
               subscription_grace_period_until = ?,
               subscription_failure_reason = ?
           WHERE id = ?`
        )
        .run(gracePeriodUntil.toISOString(), failureReason, tenant.id);

      // Update subscription status to past_due
      this.db
        .prepare(`UPDATE subscriptions SET status = ? WHERE tenant_id = ?`)
        .run('past_due', tenant.id);

      // Log subscription event
      this.db
        .prepare(
          `INSERT INTO subscription_events
           (id, tenant_id, event_type, stripe_event_id, stripe_event_type, status, error_code, error_message, created_at)
           VALUES (?, ?, 'payment_failed', ?, 'invoice.payment_failed', 'failed', ?, ?, CURRENT_TIMESTAMP)`
        )
        .run(
          crypto.randomUUID(),
          tenant.id,
          stripeInvoice.id,
          failureReason,
          stripeInvoice.last_finalization_error?.message || 'Payment failed'
        );

      this.logger.warn(`Payment failed for tenant ${tenant.id}: ${stripeInvoice.id} (Reason: ${failureReason}, Grace until: ${gracePeriodUntil.toISOString()})`);

      // Emit event for email notification (handled by webhook route)
      return {
        handled: true,
        tenantId: tenant.id,
        notification: {
          type: 'payment_failed',
          failureReason,
          gracePeriodUntil: gracePeriodUntil.toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to handle invoice.payment_failed event:', error);
      throw error;
    }
  }

  /**
   * Extract tenant from Stripe object metadata
   */
  _getTenantFromMetadata(stripeObject) {
    let tenantId = null;
    let source = null;

    // Try to get from direct metadata
    if (stripeObject.metadata?.tenant_id) {
      tenantId = stripeObject.metadata.tenant_id;
      source = 'direct_metadata';
    }
    // Try to get from customer metadata (for invoice events)
    else if (stripeObject.customer?.metadata?.tenant_id) {
      tenantId = stripeObject.customer.metadata.tenant_id;
      source = 'customer_metadata';
    }
    // Try to look up customer in database
    else if (stripeObject.customer) {
      const customerId = typeof stripeObject.customer === 'string'
        ? stripeObject.customer
        : stripeObject.customer.id;

      const record = this.db
        .prepare(`SELECT tenant_id FROM billing_customers WHERE provider_customer_id = ?`)
        .get(customerId);

      if (record) {
        tenantId = record.tenant_id;
        source = 'database_lookup';
        this.logger.debug('Found tenant via database lookup:', {
          customerId,
          tenantId
        });
      } else {
        this.logger.warn('Customer not found in billing_customers:', { customerId });
      }
    }

    if (!tenantId) {
      this.logger.warn('❌ Could not extract tenant from Stripe object. Debug info:', {
        objectType: stripeObject.object || 'unknown',
        hasMetadata: !!stripeObject.metadata,
        metadata: stripeObject.metadata,
        customerId: stripeObject.customer,
        customerType: typeof stripeObject.customer
      });
      return null;
    }

    this.logger.debug('✅ Tenant extracted from Stripe object:', { tenantId, source });
    return { id: tenantId };
  }
}

module.exports = StripeProvider;
