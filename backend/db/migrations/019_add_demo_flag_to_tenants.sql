-- Migration 019: Add demo mode flag to tenants table
-- is_demo=1 means this is a demo/sandbox tenant for sales/platform testing
-- Demo tenants use same infrastructure but skip provider API calls

ALTER TABLE tenants ADD COLUMN is_demo BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN demo_created_by TEXT;    -- User ID who created demo
ALTER TABLE tenants ADD COLUMN demo_created_at TIMESTAMP;  -- When demo was created

CREATE INDEX idx_tenants_is_demo ON tenants(is_demo);
