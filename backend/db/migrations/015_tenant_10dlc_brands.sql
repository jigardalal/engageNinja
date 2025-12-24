-- Migration 015: Create tenant_10dlc_brands table
-- Stores 10DLC/SMS brand registrations (immutable approved snapshots)
-- Once provider approves a registration, the business info becomes READ-ONLY
-- Tenant can have multiple registrations if business info changes post-approval
-- PROVIDER-AGNOSTIC: Works with any SMS provider (Twilio, Bandwidth, Vonage, etc.)

CREATE TABLE tenant_10dlc_brands (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,           -- NOT UNIQUE - tenant can have multiple if resubmitted

  -- Brand Info (snapshot at submission time - locked after approval)
  legal_business_name TEXT NOT NULL,
  dba_name TEXT,
  business_website TEXT,
  business_type TEXT,
  industry_vertical TEXT,
  business_registration_number TEXT,  -- EIN or equivalent
  country TEXT NOT NULL,
  business_address TEXT NOT NULL,     -- LOCKED after approval
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,

  -- Owner/Contact Info (LOCKED after approval)
  owner_name TEXT NOT NULL,
  owner_title TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,

  -- Provider Information (provider-agnostic)
  provider TEXT NOT NULL,             -- 'twilio', 'bandwidth', 'vonage', etc.
  provider_brand_id TEXT UNIQUE,      -- Provider's brand identifier (was twilio_brand_sid)
  provider_status TEXT,               -- 'draft', 'pending', 'approved', 'rejected'
  provider_status_reason TEXT,        -- Why rejected (if applicable)

  -- Phone Number Provisioning
  phone_number TEXT UNIQUE,           -- E.g., '+1234567890'
  provider_phone_id TEXT UNIQUE,      -- Provider's phone number identifier
  phone_status TEXT,                  -- 'active', 'provisioning', 'failed'

  -- Campaign Type (for compliance/provider requirements)
  campaign_type TEXT,                 -- 'marketing', 'transactional', 'support', 'two_way'

  -- Provider-Specific Configuration
  provider_config_json TEXT,          -- JSON for provider-specific data (rate limits, features, etc.)

  -- Versioning & Status
  is_active BOOLEAN DEFAULT true,        -- Is this the currently active registration?
  deprecation_reason TEXT,            -- e.g., 'business_info_updated_new_registration'

  -- Dates
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  provider_verified_at TIMESTAMP,     -- When provider verified the brand
  provider_approved_at TIMESTAMP,     -- Once set, record becomes READ-ONLY

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_10dlc_brands_tenant_id ON tenant_10dlc_brands(tenant_id);
CREATE INDEX idx_tenant_10dlc_brands_active ON tenant_10dlc_brands(tenant_id, is_active);
CREATE INDEX idx_tenant_10dlc_brands_provider_brand_id ON tenant_10dlc_brands(provider_brand_id);
CREATE INDEX idx_tenant_10dlc_brands_provider_status ON tenant_10dlc_brands(provider_status);
