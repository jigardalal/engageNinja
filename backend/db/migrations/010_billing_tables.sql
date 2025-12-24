-- Migration 010: Add Billing Tables
-- Tables: billing_customers, subscriptions, invoices, plan_overrides
-- Purpose: Foundation for Stripe integration and subscription management

-- Track which billing provider is used for each tenant
CREATE TABLE IF NOT EXISTS billing_customers (
  tenant_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,                    -- 'stripe', 'razorpay', etc.
  provider_customer_id TEXT NOT NULL UNIQUE, -- Stripe customer ID, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Subscription lifecycle tracking
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,                      -- 'stripe', etc.
  provider_subscription_id TEXT NOT NULL UNIQUE, -- Stripe subscription ID, etc.
  plan_key TEXT NOT NULL,                      -- 'free', 'starter', 'growth', 'pro', 'enterprise'
  status TEXT NOT NULL,                        -- 'trialing', 'active', 'past_due', 'unpaid', 'canceled'
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end INTEGER DEFAULT 0,     -- Boolean: 0 or 1
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CHECK (status IN ('trialing', 'active', 'past_due', 'unpaid', 'canceled'))
);

-- Invoice history for billing records and downloads
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_invoice_id TEXT NOT NULL UNIQUE, -- Stripe invoice ID, etc.
  amount_total INTEGER NOT NULL,             -- In minor units (cents)
  currency TEXT NOT NULL DEFAULT 'usd',      -- ISO 4217 currency code
  status TEXT NOT NULL,                      -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  hosted_invoice_url TEXT,                   -- Link to download invoice
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible'))
);

-- Per-tenant quota overrides for custom billing arrangements
CREATE TABLE IF NOT EXISTS plan_overrides (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_key TEXT,                           -- For tracking purposes
  wa_messages_override INTEGER,            -- Null = use plan default
  emails_override INTEGER,                 -- Null = use plan default
  sms_override INTEGER,                    -- Null = use plan default
  created_by TEXT NOT NULL,                -- Admin user ID who created this
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (wa_messages_override IS NULL OR wa_messages_override > 0),
  CHECK (emails_override IS NULL OR emails_override > 0),
  CHECK (sms_override IS NULL OR sms_override > 0)
);

-- Extend usage_counters if it doesn't exist (for SMS tracking)
-- Assuming it already exists from earlier migrations, just add sms_sent column
-- PostgreSQL: safely add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usage_counters'
        AND column_name = 'sms_sent'
    ) THEN
        ALTER TABLE usage_counters ADD COLUMN sms_sent INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create index for fast lookups by tenant
CREATE INDEX IF NOT EXISTS idx_billing_customers_tenant ON billing_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_overrides_tenant ON plan_overrides(tenant_id);
