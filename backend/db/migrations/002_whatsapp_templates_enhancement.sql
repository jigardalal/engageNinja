-- WhatsApp Templates Enhancement Migration
-- Adds support for:
-- - Unified JSON components schema
-- - WABA ID tracking per tenant
-- - Language and category filtering
-- - Template versioning
-- - Meta template ID mapping
-- - Updated timestamp tracking

-- Add new columns to whatsapp_templates table
ALTER TABLE whatsapp_templates ADD COLUMN waba_id TEXT;
ALTER TABLE whatsapp_templates ADD COLUMN language TEXT DEFAULT 'en';
ALTER TABLE whatsapp_templates ADD COLUMN category TEXT DEFAULT 'MARKETING';
ALTER TABLE whatsapp_templates ADD COLUMN components_schema TEXT; -- JSON format
ALTER TABLE whatsapp_templates ADD COLUMN is_versioned_from TEXT; -- FK to parent template
ALTER TABLE whatsapp_templates ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE whatsapp_templates ADD COLUMN meta_template_id TEXT; -- Meta's template ID

-- Create indexes for improved query performance on filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_id ON whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_waba_id ON whatsapp_templates(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_language ON whatsapp_templates(language);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_is_versioned_from ON whatsapp_templates(is_versioned_from);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_meta_template_id ON whatsapp_templates(meta_template_id);
