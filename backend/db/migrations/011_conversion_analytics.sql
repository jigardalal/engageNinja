-- Conversion Analytics Tables
-- Tracks user interactions with conversion features for optimization

-- Main conversion events table
CREATE TABLE IF NOT EXISTS conversion_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  properties JSONB,
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversion_events_tenant_date
  ON conversion_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_events_type
  ON conversion_events(tenant_id, event_type);

CREATE INDEX IF NOT EXISTS idx_conversion_events_session
  ON conversion_events(session_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user
  ON conversion_events(user_id);

-- Conversion email log (track which emails we've sent to avoid duplicates)
CREATE TABLE IF NOT EXISTS conversion_email_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversion_email_log_tenant
  ON conversion_email_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_email_log_type
  ON conversion_email_log(event_type);

-- A/B Test tracking
CREATE TABLE IF NOT EXISTS ab_tests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_id VARCHAR(100) NOT NULL,
  variant VARCHAR(100) NOT NULL,
  session_id VARCHAR(100),
  converted BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_tenant
  ON ab_tests(tenant_id, test_id);

CREATE INDEX IF NOT EXISTS idx_ab_tests_session
  ON ab_tests(session_id);

CREATE INDEX IF NOT EXISTS idx_ab_tests_converted
  ON ab_tests(converted);

-- Upgrade funnel tracking (shows-clicks-conversions)
CREATE TABLE IF NOT EXISTS upgrade_funnel (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  feature_or_source VARCHAR(100) NOT NULL,
  shown_at TIMESTAMP,
  clicked_at TIMESTAMP,
  converted_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_upgrade_funnel_tenant
  ON upgrade_funnel(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upgrade_funnel_user
  ON upgrade_funnel(user_id);
