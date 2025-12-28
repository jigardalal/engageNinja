/**
 * Billing Routes
 *
 * Tenant-scoped billing endpoints:
 * - GET  /billing/summary - Current plan, usage, limits
 * - POST /billing/checkout-session - Create Stripe checkout for plan upgrade
 * - POST /billing/portal-session - Link to Stripe billing portal
 * - GET  /billing/invoices - List all invoices
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateTenantAccess } = require('../middleware/rbac');
const { getBillingSummary, BillingSummaryError } = require('../services/billingSummary');
const InvoiceGenerator = require('../services/invoiceGenerator');

function createBillingRoutes(db, billingService) {
  const router = express.Router();

  /**
   * GET /billing/plans
   * Returns all available plans for the tenant to choose from
   */
  router.get('/plans', requireAuth, validateTenantAccess, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const currentTenant = await db.prepare('SELECT plan_id FROM tenants WHERE id = ?').get(tenantId);

      const plans = await db
        .prepare(`
          SELECT
            id, name,
            whatsapp_messages_per_month,
            email_messages_per_month,
            sms_messages_per_month,
            max_users,
            contacts_limit,
            ai_features_enabled,
            api_enabled,
            default_price
          FROM plans
          ORDER BY
            CASE id
              WHEN 'free' THEN 0
              WHEN 'starter' THEN 1
              WHEN 'growth' THEN 2
              WHEN 'pro' THEN 3
              WHEN 'enterprise' THEN 4
              ELSE 5
            END
        `)
        .all();

      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.default_price,
        features: {
          whatsapp: plan.whatsapp_messages_per_month,
          email: plan.email_messages_per_month,
          sms: plan.sms_messages_per_month,
          users: plan.max_users,
          contacts: plan.contacts_limit,
          ai: plan.ai_features_enabled === 1,
          api: plan.api_enabled === 1
        },
        isCurrent: plan.id === (currentTenant?.plan_id || 'free')
      }));

      res.json({
        plans: formattedPlans,
        currentPlanId: currentTenant?.plan_id || 'free'
      });
    } catch (error) {
      console.error('GET /billing/plans error:', error);
      res.status(500).json({ error: 'Failed to fetch available plans' });
    }
  });

  /**
   * GET /billing/summary
   * Returns current plan, usage, and remaining quota for this tenant
   */
  router.get('/summary', requireAuth, validateTenantAccess, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const summary = await getBillingSummary(tenantId);
      res.json(summary);
    } catch (error) {
      if (error instanceof BillingSummaryError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('GET /billing/summary error:', error);
      res.status(500).json({ error: 'Failed to fetch billing summary' });
    }
  });

  /**
   * POST /billing/checkout-session
   * Create a Stripe checkout session for upgrading/subscribing
   */
  router.post('/checkout-session', requireAuth, validateTenantAccess, async (req, res) => {
    if (!billingService) {
      return res.status(503).json({ error: 'Billing service not configured' });
    }
    try {
      const { plan_key } = req.body;
      const tenantId = req.tenantId;

      // Validate plan_key
      const plan = await db
        .prepare('SELECT * FROM plans WHERE id = ?')
        .get(plan_key);

      if (!plan) {
        return res.status(400).json({ error: 'Invalid plan key' });
      }

      // Get tenant
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

      // Call billing service to create checkout session
      const returnUrls = {
        success: `${process.env.APP_URL || 'http://localhost:3173'}/settings?tab=billing`,
        cancel: `${process.env.APP_URL || 'http://localhost:3173'}/settings?tab=billing`,
      };

      console.log('📍 Checkout session URLs:', {
        APP_URL: process.env.APP_URL,
        success: returnUrls.success,
        cancel: returnUrls.cancel
      });

      const session = await billingService.createCheckoutSession(tenant, plan_key, returnUrls);

      res.json(session);
    } catch (error) {
      console.error('POST /billing/checkout-session error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  /**
   * POST /billing/portal-session
   * Create a Stripe billing portal session for managing subscriptions
   */
  router.post('/portal-session', requireAuth, validateTenantAccess, async (req, res) => {
    if (!billingService) {
      return res.status(503).json({ error: 'Billing service not configured' });
    }
    try {
      const tenantId = req.tenantId;
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

      const session = await billingService.createBillingPortalSession(tenant);

      res.json(session);
    } catch (error) {
      console.error('POST /billing/portal-session error:', error);
      res.status(500).json({ error: 'Failed to create billing portal session' });
    }
  });

  /**
   * POST /billing/sync-subscription
   * Sync subscription data from Stripe to local database
   * Fetches latest subscription info from Stripe and updates local records
   */
  router.post('/sync-subscription', requireAuth, validateTenantAccess, async (req, res) => {
    if (!billingService) {
      return res.status(503).json({ error: 'Billing service not configured' });
    }
    try {
      const tenantId = req.tenantId;
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

      // Get active subscription
      const subscription = await db
        .prepare('SELECT * FROM subscriptions WHERE tenant_id = ? AND status = ?')
        .get(tenantId, 'active');

      if (!subscription) {
        return res.status(400).json({ error: 'No active subscription found' });
      }

      // Fetch latest subscription from Stripe
      let stripeSubscription;
      try {
        stripeSubscription = await billingService.stripe.subscriptions.retrieve(
          subscription.provider_subscription_id
        );
      } catch (stripeError) {
        if (stripeError.code === 'resource_missing') {
          console.warn(`⚠️  Subscription ${subscription.provider_subscription_id} not found in Stripe`);
          return res.status(400).json({
            error: 'Subscription not found in Stripe',
            details: 'The subscription ID stored in our database no longer exists in Stripe. This can happen if the subscription was deleted or if you\'re using a different Stripe account. Please create a new subscription or contact support.',
            subscriptionId: subscription.provider_subscription_id
          });
        }
        throw stripeError;
      }

      // Update local subscription record with latest Stripe data
      await db.prepare(
        `UPDATE subscriptions SET
           status = ?,
           cancel_at_period_end = ?,
           current_period_start = ?,
           current_period_end = ?,
           canceled_at = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(
        stripeSubscription.status,
        stripeSubscription.cancel_at_period_end ? 1 : 0,
        new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
        subscription.id
      );

      console.log(`🔄 Synced subscription ${subscription.provider_subscription_id} for tenant ${tenantId}`);
      console.log(`   Status: ${stripeSubscription.status}, Cancel at period end: ${stripeSubscription.cancel_at_period_end}`);

      // Return updated billing summary
      const summary = await getBillingSummary(tenantId);
      res.json(summary);
    } catch (error) {
      console.error('POST /billing/sync-subscription error:', error);
      res.status(500).json({ error: 'Failed to sync subscription with Stripe', message: error.message });
    }
  });

  /**
   * GET /billing/invoices
   * List all invoices for this tenant
   */
  router.get('/invoices', requireAuth, validateTenantAccess, async (req, res) => {
    try {
      const tenantId = req.tenantId;

      const invoices = await db
        .prepare(
          `SELECT id, provider_invoice_id, amount_total, currency, status, hosted_invoice_url, created_at
           FROM invoices
           WHERE tenant_id = ?
           ORDER BY created_at DESC`
        )
        .all(tenantId);

      res.json({
        invoices: invoices.map((inv) => ({
          id: inv.id,
          provider_id: inv.provider_invoice_id,
          amount: inv.amount_total,
          currency: inv.currency,
          status: inv.status,
          download_url: inv.hosted_invoice_url,
          created_at: inv.created_at,
        })),
      });
    } catch (error) {
      console.error('GET /billing/invoices error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  /**
   * GET /billing/invoices/:invoiceId/download
   * Download invoice PDF
   * Supports configurable modes via INVOICE_GENERATION_MODE env var:
   * - 'stream-only': Generate on-demand, stream to user, no storage
   * - 'cloud-storage': Generate, upload to cloud, serve from cloud URL
   */
  router.get('/invoices/:invoiceId/download', requireAuth, validateTenantAccess, async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { invoiceId } = req.params;
      const generationMode = process.env.INVOICE_GENERATION_MODE || 'stream-only';

      // Get invoice from database
      const invoice = await db
        .prepare(`
          SELECT id, tenant_id, provider_invoice_id, amount_total, currency, status, created_at
          FROM invoices
          WHERE id = ? AND tenant_id = ?
        `)
        .get(invoiceId, tenantId);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get tenant details for invoice generation
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
      const plan = await db.prepare('SELECT * FROM plans WHERE id = ?').get(tenant.plan_id);

      // Generate invoice number
      const invoiceNumber = InvoiceGenerator.generateInvoiceNumber(invoice.id);

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber,
        invoiceDate: invoice.created_at,
        dueDate: new Date(new Date(invoice.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tenantId,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        tenantAddress: tenant.address || '',
        planName: plan?.name || 'Plan',
        planPrice: plan?.default_price * 100 || invoice.amount_total,
        negotiatedPrice: invoice.amount_total,
        status: invoice.status,
        paymentMethod: 'Credit Card (Stripe)',
        paidDate: invoice.created_at,
        stripeInvoiceId: invoice.provider_invoice_id
      };

      const invoiceGen = new InvoiceGenerator();
      let pdfBuffer;

      if (generationMode === 'stream-only') {
        // Stream-only mode: Generate on-demand, no storage
        pdfBuffer = invoiceGen.generateInvoiceBuffer(invoiceData);
        console.log(`📥 Invoice streamed (no storage): ${invoiceNumber} by tenant ${tenantId}`);
      } else if (generationMode === 'cloud-storage') {
        // Cloud-storage mode: Generate, upload to cloud, serve from URL
        // TODO: Implement cloud storage integration
        // For now, generate and cache locally as fallback
        if (!invoiceGen.invoiceExists(tenantId, invoiceNumber)) {
          invoiceGen.generateInvoice(invoiceData);
        }
        pdfBuffer = invoiceGen.getInvoicePDF(tenantId, invoiceNumber);
        console.log(`☁️  Invoice (cloud mode): ${invoiceNumber} by tenant ${tenantId}`);
      } else {
        // Default to stream-only
        pdfBuffer = invoiceGen.generateInvoiceBuffer(invoiceData);
        console.log(`📥 Invoice streamed (default): ${invoiceNumber} by tenant ${tenantId}`);
      }

      // Stream PDF to user
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${invoiceNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error('GET /billing/invoices/:invoiceId/download error:', error);
      res.status(500).json({ error: error.message || 'Failed to download invoice' });
    }
  });

  return router;
}

module.exports = createBillingRoutes;
