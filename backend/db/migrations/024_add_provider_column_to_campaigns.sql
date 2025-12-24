-- Migration 024: Add provider column to campaigns table
-- Tracks which provider (twilio, aws_ses, etc.) is used for sending this campaign
-- Works with channel column to determine the full sending configuration

ALTER TABLE campaigns ADD COLUMN provider TEXT;

-- Create index for provider lookups
CREATE INDEX idx_campaigns_provider ON campaigns(provider);
