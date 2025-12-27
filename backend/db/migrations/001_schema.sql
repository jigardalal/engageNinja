-- EngageNinja Database Schema - Complete Consolidated Migration
-- Combines core schema, WhatsApp templates, and RBAC system
-- For PostgreSQL only

-- ===== BASE SCHEMA =====

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  timezone TEXT,
  locale TEXT,
  role_global TEXT DEFAULT 'none',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plans table (pricing tiers)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp_messages_per_month INTEGER NOT NULL,
  email_messages_per_month INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  contacts_limit INTEGER NOT NULL DEFAULT 0,
  sms_messages_per_month INTEGER NOT NULL DEFAULT 0,
  api_tokens_per_month INTEGER NOT NULL DEFAULT 0,
  ai_features_enabled BOOLEAN DEFAULT false,
  api_enabled BOOLEAN DEFAULT false,
  default_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table (multi-tenant support)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  limits TEXT DEFAULT '{}',
  metadata TEXT DEFAULT '{}',
  legal_name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  timezone TEXT,
  billing_email TEXT,
  support_email TEXT,
  price DECIMAL(10, 2),
  subscription_status TEXT DEFAULT 'none',
  last_payment_failed_at TIMESTAMP,
  subscription_grace_period_until TIMESTAMP,
  subscription_failure_reason TEXT,
  subscription_cancelled_at TIMESTAMP,
  subscription_cancellation_reason TEXT,
  is_demo BOOLEAN DEFAULT false,
  demo_created_by TEXT,
  demo_created_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- User-Tenant associations (multi-tenant user access)
CREATE TABLE IF NOT EXISTS user_tenants (
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tenant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tenant channel settings (WhatsApp, Email providers, SMS, etc.)
CREATE TABLE IF NOT EXISTS tenant_channel_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  credentials_encrypted TEXT,
  is_enabled BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verification_error TEXT,
  verified_at TIMESTAMP,
  webhook_secret_encrypted TEXT,
  webhook_url TEXT,
  provider_config_json TEXT,
  phone_number TEXT,
  messaging_service_sid TEXT,
  verified_sender_email TEXT,
  is_connected BOOLEAN DEFAULT false,
  connected_at TIMESTAMP,
  business_account_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, channel)
);

-- Tags (contact categorization)
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scope TEXT DEFAULT 'tenant',
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, name)
);

-- Global Tags table for platform defaults
CREATE TABLE IF NOT EXISTS global_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contacts (recipients for campaigns)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  name TEXT,
  phone_number TEXT,
  whatsapp_number TEXT,
  consent_whatsapp BOOLEAN DEFAULT false,
  consent_whatsapp_updated_at TIMESTAMP,
  consent_email BOOLEAN DEFAULT false,
  consent_sms BOOLEAN DEFAULT false,
  consent_sms_updated_at TIMESTAMP,
  consent_source TEXT DEFAULT 'manual',
  consent_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, phone)
);

-- Contact-Tag associations (many-to-many)
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (contact_id, tag_id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- Campaigns (messaging campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL,
  provider TEXT,
  template_id TEXT,
  audience_filters TEXT,
  message_content TEXT,
  from_number TEXT,
  from_email TEXT,
  status TEXT DEFAULT 'draft',
  sent_by TEXT,
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  resend_of_campaign_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (sent_by) REFERENCES users(id),
  FOREIGN KEY (resend_of_campaign_id) REFERENCES campaigns(id)
);

-- Messages (individual messages sent to contacts)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT DEFAULT 'queued',
  status_reason TEXT,
  attempts INTEGER DEFAULT 1,
  content_snapshot TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  UNIQUE(provider_message_id)
);

-- Message status events (webhook events for message status changes)
CREATE TABLE IF NOT EXISTS message_status_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  provider_message_id TEXT,
  old_status TEXT,
  new_status TEXT,
  event_timestamp TIMESTAMP,
  webhook_received_at TIMESTAMP,
  status_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- WhatsApp templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  variable_count INTEGER DEFAULT 0,
  body_template TEXT,
  header_type TEXT,
  header_text TEXT,
  footer_text TEXT,
  buttons_json TEXT,
  body_variables TEXT,
  header_variables TEXT,
  waba_id TEXT,
  language TEXT DEFAULT 'en',
  category TEXT DEFAULT 'MARKETING',
  components_schema TEXT,
  is_versioned_from TEXT,
  meta_template_id TEXT,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Usage counters (track message usage per month)
CREATE TABLE IF NOT EXISTS usage_counters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  whatsapp_messages_sent INTEGER DEFAULT 0,
  email_messages_sent INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, year_month)
);

-- AI generation logs (track AI-generated content)
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  input_prompt TEXT,
  model TEXT,
  generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ===== AUDIT & RBAC =====

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_type TEXT NOT NULL,
  tenant_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Platform configuration table
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== BILLING TABLES =====

-- Track which billing provider is used for each tenant
CREATE TABLE IF NOT EXISTS billing_customers (
  tenant_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Subscription lifecycle tracking
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_subscription_id TEXT NOT NULL UNIQUE,
  plan_key TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end INTEGER DEFAULT 0,
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
  provider_invoice_id TEXT NOT NULL UNIQUE,
  amount_total INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  hosted_invoice_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible'))
);

-- Per-tenant quota overrides for custom billing arrangements
CREATE TABLE IF NOT EXISTS plan_overrides (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_key TEXT,
  wa_messages_override INTEGER,
  emails_override INTEGER,
  sms_override INTEGER,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (wa_messages_override IS NULL OR wa_messages_override > 0),
  CHECK (emails_override IS NULL OR emails_override > 0),
  CHECK (sms_override IS NULL OR sms_override > 0)
);

-- Subscription event log for auditing
CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  stripe_event_type TEXT,
  status TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ===== SMS & PHONE MANAGEMENT =====

-- 10DLC Brand registrations (immutable approved snapshots)
CREATE TABLE IF NOT EXISTS tenant_10dlc_brands (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  legal_business_name TEXT NOT NULL,
  dba_name TEXT,
  business_website TEXT,
  business_type TEXT,
  industry_vertical TEXT,
  business_registration_number TEXT,
  country TEXT NOT NULL,
  business_address TEXT NOT NULL,
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_title TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_brand_id TEXT UNIQUE,
  provider_status TEXT,
  provider_status_reason TEXT,
  phone_number TEXT UNIQUE,
  provider_phone_id TEXT UNIQUE,
  phone_status TEXT,
  campaign_type TEXT,
  provider_config_json TEXT,
  is_active BOOLEAN DEFAULT true,
  deprecation_reason TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  provider_verified_at TIMESTAMP,
  provider_approved_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Business info for SMS/messaging compliance
CREATE TABLE IF NOT EXISTS tenant_business_info (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  legal_business_name TEXT NOT NULL,
  dba_name TEXT,
  business_website TEXT,
  business_type TEXT,
  industry_vertical TEXT,
  business_registration_number TEXT,
  country TEXT NOT NULL,
  business_address TEXT NOT NULL,
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_title TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  business_contact_name TEXT,
  business_contact_email TEXT,
  business_contact_phone TEXT,
  monthly_sms_volume_estimate INTEGER,
  use_case_description TEXT,
  sms_opt_in_language TEXT,
  gdpr_compliant BOOLEAN DEFAULT false,
  tcpa_compliant BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending',
  verification_failed_reason TEXT,
  verified_by_admin TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- SMS phone pool for allocation tracking
CREATE TABLE IF NOT EXISTS sms_phone_pool (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  twilio_phone_number_sid TEXT UNIQUE,
  tenant_id TEXT,
  allocated_at TIMESTAMP,
  status TEXT DEFAULT 'active',
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- Message provider mappings for webhook matching
CREATE TABLE IF NOT EXISTS message_provider_mappings (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT UNIQUE,
  provider_status TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(message_id, provider),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_role_global ON users(role_global);

CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_active ON user_tenants(active);

CREATE INDEX IF NOT EXISTS idx_tenants_plan_id ON tenants(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_is_demo ON tenants(is_demo);

CREATE INDEX IF NOT EXISTS idx_tenant_channel_settings_tenant_id ON tenant_channel_settings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_status ON tags(status);

CREATE INDEX IF NOT EXISTS idx_global_tags_status ON global_tags(status);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_number ON contacts(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_contacts_consent_sms ON contacts(tenant_id, consent_sms);
CREATE INDEX IF NOT EXISTS idx_contacts_consent_whatsapp ON contacts(tenant_id, consent_whatsapp);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_provider ON campaigns(provider);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

CREATE INDEX IF NOT EXISTS idx_message_status_events_message_id ON message_status_events(message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_id ON whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_waba_id ON whatsapp_templates(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_language ON whatsapp_templates(language);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_is_versioned_from ON whatsapp_templates(is_versioned_from);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_meta_template_id ON whatsapp_templates(meta_template_id);

CREATE INDEX IF NOT EXISTS idx_usage_counters_tenant_id ON usage_counters(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_tenant_id ON ai_generation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON ai_generation_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON user_invitations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON user_invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_billing_customers_tenant ON billing_customers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON subscriptions(provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);

CREATE INDEX IF NOT EXISTS idx_plan_overrides_tenant ON plan_overrides(tenant_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON subscription_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

CREATE INDEX IF NOT EXISTS idx_tenant_10dlc_brands_tenant_id ON tenant_10dlc_brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_10dlc_brands_active ON tenant_10dlc_brands(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_10dlc_brands_provider_brand_id ON tenant_10dlc_brands(provider_brand_id);
CREATE INDEX IF NOT EXISTS idx_tenant_10dlc_brands_provider_status ON tenant_10dlc_brands(provider_status);

CREATE INDEX IF NOT EXISTS idx_tenant_business_info_tenant_id ON tenant_business_info(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_business_info_verification_status ON tenant_business_info(verification_status);

CREATE INDEX IF NOT EXISTS idx_sms_phone_pool_tenant_id ON sms_phone_pool(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_phone_pool_status ON sms_phone_pool(status);
CREATE INDEX IF NOT EXISTS idx_sms_phone_pool_phone_number ON sms_phone_pool(phone_number);

CREATE INDEX IF NOT EXISTS idx_message_provider_mappings_provider_message_id ON message_provider_mappings(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_message_provider_mappings_message_id ON message_provider_mappings(message_id);
CREATE INDEX IF NOT EXISTS idx_message_provider_mappings_provider ON message_provider_mappings(provider);

-- ===== DEFAULT DATA =====

INSERT INTO platform_config (key, value) VALUES ('audit_retention_days', 'null')
ON CONFLICT (key) DO NOTHING;
