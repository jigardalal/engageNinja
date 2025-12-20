-- Migration 011: Add Billing Price to Plans and Tenants
-- Purpose: Store actual price amount per-tenant for flexible billing and negotiated rates

-- Add default_price to plans (base price for each plan tier)
ALTER TABLE plans ADD COLUMN default_price DECIMAL(10, 2);
-- Example: 29.99 for Starter, 99.99 for Growth, etc.

-- Add price to tenants (actual price to bill this tenant, may differ from plan default)
ALTER TABLE tenants ADD COLUMN price DECIMAL(10, 2);
-- NULL for free plan, otherwise the amount to bill (e.g., 29.99, or 19.99 if negotiated)
-- Copied from plan.default_price when tenant upgrades, but can be manually overridden for negotiated rates
