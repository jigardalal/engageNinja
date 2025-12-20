-- Migration 009: Add additional quota columns to plans
BEGIN TRANSACTION;

ALTER TABLE plans ADD COLUMN contacts_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN sms_messages_per_month INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN api_tokens_per_month INTEGER NOT NULL DEFAULT 0;

COMMIT;
