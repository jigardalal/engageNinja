const BillingSummaryError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};

/**
 * Promisify database query to allow async/await and parallelization
 * Wraps synchronous db.prepare().get()/all() calls
 */
function promisifyQuery(queryFn) {
  return new Promise((resolve, reject) => {
    try {
      const result = queryFn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

async function getBillingSummary(db, tenantId) {
  // PHASE 1: Get tenant (required for other queries)
  const tenant = await promisifyQuery(() =>
    db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId)
  );

  if (!tenant) {
    throw new BillingSummaryError('Tenant not found', 404);
  }

  const planId = tenant.plan_id || 'free';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // PHASE 2: Run independent queries in parallel
  const [plan, usage, subscription, overrides, invoices] = await Promise.all([
    promisifyQuery(() =>
      db.prepare('SELECT * FROM plans WHERE id = ?').get(planId)
    ),
    promisifyQuery(() =>
      db.prepare(
        `SELECT whatsapp_messages_sent, email_messages_sent, sms_sent FROM usage_counters
         WHERE tenant_id = ? AND year_month = ?`
      ).get(tenantId, yearMonth)
    ),
    promisifyQuery(() =>
      db.prepare('SELECT * FROM subscriptions WHERE tenant_id = ?').get(tenantId)
    ),
    promisifyQuery(() =>
      db.prepare('SELECT * FROM plan_overrides WHERE tenant_id = ?').get(tenantId)
    ),
    promisifyQuery(() =>
      db.prepare(
        `SELECT id, provider_invoice_id, amount_total, currency, status, hosted_invoice_url, created_at
         FROM invoices
         WHERE tenant_id = ?
         ORDER BY created_at DESC`
      ).all(tenantId)
    )
  ]);

  if (!plan) {
    throw new BillingSummaryError('Plan not found', 404);
  }

  // Extract usage data with fallback defaults
  const usageData = usage || {
    whatsapp_messages_sent: 0,
    email_messages_sent: 0,
    sms_sent: 0
  };
  const usedWhatsapp = usageData.whatsapp_messages_sent ?? 0;
  const usedEmail = usageData.email_messages_sent ?? 0;
  const usedSms = usageData.sms_sent ?? 0;

  const waLimit = overrides?.wa_messages_override ?? plan.whatsapp_messages_per_month ?? 0;
  const emailLimit = overrides?.emails_override ?? plan.email_messages_per_month ?? 0;
  const smsLimit = overrides?.sms_override ?? plan.sms_messages_per_month ?? 0;

  // Transform invoices
  const formattedInvoices = invoices.map((invoice) => ({
    id: invoice.id,
    provider_id: invoice.provider_invoice_id,
    amount: invoice.amount_total,
    currency: invoice.currency,
    status: invoice.status,
    download_url: invoice.hosted_invoice_url,
    created_at: invoice.created_at
  }));

  const computed = {
    plan: {
      id: plan.id,
      name: plan.name,
      key: tenant.plan_key || plan.id || 'free',
      default_price: plan.default_price
    },
    plan_limits: {
      max_users: plan.max_users,
      contacts_limit: plan.contacts_limit,
      ai_features_enabled: plan.ai_features_enabled === 1,
      api_enabled: plan.api_enabled === 1
    },
    billing: {
      price: tenant.price,
      currency: 'usd',
      billing_period: 'month',
      description: tenant.price ? `$${tenant.price.toFixed(2)}/month` : 'Free'
    },
    subscription: subscription
      ? {
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end === 1
        }
      : null,
    billing_status: {
      subscription_status: tenant.subscription_status,
      last_payment_failed_at: tenant.last_payment_failed_at,
      grace_period_until: tenant.subscription_grace_period_until,
      failure_reason: tenant.subscription_failure_reason,
      subscription_cancelled_at: tenant.subscription_cancelled_at,
      subscription_cancellation_reason: tenant.subscription_cancellation_reason,
      is_in_grace_period: tenant.subscription_grace_period_until
        ? new Date() < new Date(tenant.subscription_grace_period_until)
        : false
    },
    usage: {
      whatsapp_messages: usedWhatsapp,
      emails: usedEmail,
      sms: usedSms
    },
    limits: {
      whatsapp_messages: waLimit,
      emails: emailLimit,
      sms: smsLimit
    },
    remaining: {
      whatsapp_messages: Math.max(0, waLimit - usedWhatsapp),
      emails: Math.max(0, emailLimit - usedEmail),
      sms: Math.max(0, smsLimit - usedSms)
    },
    usage_percent: {
      whatsapp_messages: waLimit > 0 ? (usedWhatsapp / waLimit) * 100 : 0,
      emails: emailLimit > 0 ? (usedEmail / emailLimit) * 100 : 0,
      sms: smsLimit > 0 ? (usedSms / smsLimit) * 100 : 0
    },
    invoices: formattedInvoices
  };

  return computed;
}

module.exports = {
  getBillingSummary,
  BillingSummaryError
};
