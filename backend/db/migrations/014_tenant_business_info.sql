-- Migration 014: Create tenant_business_info table
-- Stores editable, current business information for each tenant
-- This is the source of truth for tenant's actual business state
-- Separate from tenant_10dlc_brands which stores immutable approved snapshots

CREATE TABLE tenant_business_info (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  -- Business Details (tenant-editable)
  legal_business_name TEXT NOT NULL,
  dba_name TEXT,                      -- "Doing Business As"
  business_website TEXT,
  business_type TEXT,                 -- 'sole_proprietor', 'llc', 'corporation', 'non_profit', etc.
  industry_vertical TEXT,             -- From Twilio enum

  -- Registration (tenant-editable)
  business_registration_number TEXT,  -- EIN (US) or equivalent
  country TEXT NOT NULL,
  business_address TEXT NOT NULL,
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,

  -- Owner/Principal Contact (tenant-editable)
  owner_name TEXT NOT NULL,
  owner_title TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,

  -- Business Contact (can differ from owner)
  business_contact_name TEXT,
  business_contact_email TEXT,
  business_contact_phone TEXT,

  -- SMS/Messaging Specifics
  monthly_sms_volume_estimate INTEGER, -- Expected monthly volume
  use_case_description TEXT,           -- What they'll send

  -- Compliance
  sms_opt_in_language TEXT,           -- Language for SMS consent
  gdpr_compliant BOOLEAN DEFAULT false,   -- For EU tenants
  tcpa_compliant BOOLEAN DEFAULT false,   -- For US tenants

  -- Verification Status (for onboarding workflow)
  verification_status TEXT DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
  verification_failed_reason TEXT,
  verified_by_admin TEXT,             -- User who verified
  verified_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_business_info_tenant_id ON tenant_business_info(tenant_id);
CREATE INDEX idx_tenant_business_info_verification_status ON tenant_business_info(verification_status);
