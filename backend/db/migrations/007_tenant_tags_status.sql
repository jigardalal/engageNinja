-- Tenant tag status and timestamps
-- Adds archival support for tenant-scoped tags

ALTER TABLE tags ADD COLUMN status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'archived'));

ALTER TABLE tags ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE tags SET status = 'active' WHERE status IS NULL;
UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tags_status ON tags(status);
