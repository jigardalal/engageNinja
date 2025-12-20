-- Migration 012: Add Subscription Tracking and Failure Handling
-- Purpose: Track subscription status, payment failures, and grace periods

-- Add subscription status tracking to tenants
ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT 'none';
-- Values: 'none' (not subscribed), 'active' (subscription active), 'failed' (payment failed)

-- Track when last payment failed
ALTER TABLE tenants ADD COLUMN last_payment_failed_at TIMESTAMP;

-- Grace period deadline for customers to fix payment
ALTER TABLE tenants ADD COLUMN subscription_grace_period_until TIMESTAMP;
-- If payment fails, customer has until this date to fix it (default: 48 hours from failure)

-- Track subscription failure reason for support
ALTER TABLE tenants ADD COLUMN subscription_failure_reason TEXT;
-- Examples: 'card_declined', 'insufficient_funds', 'expired_card', 'authentication_failed'

-- Ensure we have an invoice record for tracking
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'stripe'
  provider_invoice_id TEXT,
  provider_subscription_id TEXT,
  amount_total INTEGER, -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  hosted_invoice_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, provider_invoice_id)
);

-- Create subscription log for auditing
CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'checkout_started', 'payment_succeeded', 'payment_failed', 'subscription_created', 'subscription_cancelled'
  stripe_event_id TEXT,
  stripe_event_type TEXT, -- maps to actual Stripe event type
  status TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON subscription_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
