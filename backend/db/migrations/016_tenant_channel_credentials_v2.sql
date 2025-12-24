-- Migration 016: Create tenant_channel_credentials_v2 table
-- Stores provider credentials for SMS, WhatsApp, Email channels
-- Credentials are encrypted at rest using ENCRYPTION_KEY env var
-- PROVIDER-AGNOSTIC: Works with any provider (Twilio, AWS SES, Vonage, Bandwidth, etc.)
-- One row per tenant per channel

CREATE TABLE tenant_channel_credentials_v2 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,              -- 'sms', 'whatsapp', 'email'
  provider TEXT NOT NULL,             -- 'twilio', 'aws_ses', 'bandwidth', 'vonage', 'sendgrid', etc.

  -- Provider Credentials (all providers' credentials stored in JSON, encrypted)
  -- Examples:
  --   Twilio: {"accountSid": "...", "authToken": "..."}
  --   AWS SES: {"accessKeyId": "...", "secretAccessKey": "...", "region": "..."}
  --   Sendgrid: {"apiKey": "..."}
  --   Bandwidth: {"username": "...", "password": "..."}
  credentials_json_encrypted TEXT,    -- AES-192-CBC encrypted JSON with all provider credentials

  -- Channel Status
  is_enabled BOOLEAN DEFAULT false,       -- Can send messages on this channel?
  is_verified BOOLEAN DEFAULT false,      -- Credentials tested and working?
  verification_error TEXT,            -- Last error during verification
  verified_at TIMESTAMP,

  -- Webhook Configuration
  webhook_secret_encrypted TEXT,      -- For verifying incoming webhooks from provider
  webhook_url TEXT,                   -- Full URL for provider callbacks

  -- Provider-Specific Data
  provider_config_json TEXT,          -- JSON for provider-specific settings (rate limits, features, etc.)

  -- Dates
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  UNIQUE(tenant_id, channel),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_channel_credentials_v2_tenant_id ON tenant_channel_credentials_v2(tenant_id);
CREATE INDEX idx_tenant_channel_credentials_v2_channel ON tenant_channel_credentials_v2(channel);
CREATE INDEX idx_tenant_channel_credentials_v2_is_enabled ON tenant_channel_credentials_v2(is_enabled);
