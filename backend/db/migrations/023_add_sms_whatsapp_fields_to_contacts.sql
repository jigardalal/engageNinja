-- Migration 023: Add SMS and WhatsApp contact fields
-- Adds phone_number and whatsapp_number to support SMS and WhatsApp channels separately
-- Also adds SMS consent fields to match consent_whatsapp

-- Add SMS phone number column
ALTER TABLE contacts ADD COLUMN phone_number TEXT;

-- Add WhatsApp phone number column (may differ from SMS)
ALTER TABLE contacts ADD COLUMN whatsapp_number TEXT;

-- Add SMS consent tracking
ALTER TABLE contacts ADD COLUMN consent_sms BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN consent_sms_updated_at TIMESTAMP;

-- Add WhatsApp consent timestamp tracking (separates from general consent_updated_at)
ALTER TABLE contacts ADD COLUMN consent_whatsapp_updated_at TIMESTAMP;

-- Create indexes for SMS and WhatsApp lookups
CREATE INDEX idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX idx_contacts_whatsapp_number ON contacts(whatsapp_number);
CREATE INDEX idx_contacts_consent_sms ON contacts(tenant_id, consent_sms);
CREATE INDEX idx_contacts_consent_whatsapp ON contacts(tenant_id, consent_whatsapp);
