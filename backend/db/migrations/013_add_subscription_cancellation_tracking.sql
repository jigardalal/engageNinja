-- Migration 013: Add Subscription Cancellation Tracking
-- Purpose: Track when and why subscriptions are cancelled

-- Track when subscription was cancelled
ALTER TABLE tenants ADD COLUMN subscription_cancelled_at TIMESTAMP;

-- Track reason for cancellation
ALTER TABLE tenants ADD COLUMN subscription_cancellation_reason TEXT;
-- Examples: 'customer_requested', 'billing_failure', 'free_plan_downgrade', etc.
