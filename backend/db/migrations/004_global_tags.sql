-- Global Tags table for platform defaults
-- Separate from tenant tags (do not reuse tenant scope)

CREATE TABLE IF NOT EXISTS global_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_global_tags_status ON global_tags(status);
