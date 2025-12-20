-- Legacy migration kept for compatibility.
-- The `status` + `updated_at` columns are added in 007_tenant_tags_status.sql.

UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
UPDATE tags SET status = 'active' WHERE status IS NULL;
CREATE INDEX IF NOT EXISTS idx_tags_status ON tags(status);
