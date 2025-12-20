-- EngageNinja RBAC System Migration
-- Adds comprehensive role-based access control (RBAC) including:
-- - Platform-level roles (system_admin, platform_admin, platform_support)
-- - Tenant-level roles (owner, admin, member, viewer)
-- - Audit logging for compliance
-- - User invitation system
-- - Tenant status management

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ===== USERS TABLE MODIFICATIONS =====
-- Add platform role and account status to users table
ALTER TABLE users ADD COLUMN role_global TEXT DEFAULT 'none'
  CHECK (role_global IN ('system_admin', 'platform_admin', 'platform_support', 'none'));

ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT 1;

-- ===== USER_TENANTS TABLE MIGRATION =====
-- Migrate role enum from (admin, member) to (owner, admin, member, viewer)
-- Strategy: Create new table with correct schema, copy data, rename

-- Step 1: Create new user_tenants table with updated schema
CREATE TABLE user_tenants_new (
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tenant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Step 2: Migrate data - upgrade all existing users to 'owner' role (maintains current access)
INSERT INTO user_tenants_new (user_id, tenant_id, role, active, created_at)
SELECT user_id, tenant_id, 'owner', 1, created_at FROM user_tenants;

-- Step 3: Drop old table and rename new one
DROP TABLE user_tenants;
ALTER TABLE user_tenants_new RENAME TO user_tenants;

-- ===== TENANTS TABLE MODIFICATIONS =====
-- Add tenant status management and configuration
ALTER TABLE tenants ADD COLUMN status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'suspended', 'archived', 'deleted'));

ALTER TABLE tenants ADD COLUMN limits TEXT DEFAULT '{}'; -- JSON: { whatsapp_messages_used: 0, email_messages_used: 0 }

ALTER TABLE tenants ADD COLUMN metadata TEXT DEFAULT '{}'; -- JSON: for future extensibility

-- ===== TAGS TABLE MODIFICATIONS =====
-- Add scope and default flag for system vs tenant tags
ALTER TABLE tags ADD COLUMN scope TEXT DEFAULT 'tenant'
  CHECK (scope IN ('tenant', 'system'));

ALTER TABLE tags ADD COLUMN is_default BOOLEAN DEFAULT 0;

-- ===== AUDIT LOGS TABLE =====
-- Complete audit trail for compliance (SOC 2, GDPR, etc.)
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('platform_user', 'tenant_user', 'system')),
  tenant_id TEXT, -- Nullable for platform-only actions
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata TEXT, -- JSON: action-specific data (no secrets)
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ===== USER INVITATIONS TABLE =====
-- Track pending and accepted invitations for users joining tenants
CREATE TABLE user_invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for invitation queries
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_tenant ON user_invitations(tenant_id, status);
CREATE INDEX idx_invitations_expires ON user_invitations(expires_at);

-- ===== CONFIGURATION TABLE (For platform-level settings) =====
-- Store platform-wide configuration like audit retention
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default audit retention setting (no limit by default)
INSERT OR IGNORE INTO platform_config (key, value) VALUES ('audit_retention_days', 'null');

-- ===== INDEXES FOR PERFORMANCE =====
-- Index for common user_tenants queries
CREATE INDEX idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON user_tenants(tenant_id);
CREATE INDEX idx_user_tenants_active ON user_tenants(active);

-- Index for users lookups
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_role_global ON users(role_global);

-- Index for campaigns by creator (campaign ownership)
-- This assumes campaigns table has a created_by column
-- CREATE INDEX idx_campaigns_created_by ON campaigns(created_by) IF NOT EXISTS;

-- ===== COMMENTS FOR DOCUMENTATION =====
-- RBAC SYSTEM NOTES:
-- 1. All existing users are migrated to 'owner' role - maintains backward compatibility
-- 2. Owner role includes all admin permissions automatically
-- 3. Last owner in a tenant cannot be removed or demoted
-- 4. Platform admins can see all tenants in tenant switcher
-- 5. Audit logs capture all critical actions for compliance
-- 6. User invitations support both existing and new users
-- 7. Invitation tokens expire after configured period (default: 7 days for tenant, 30 days for platform)
-- 8. Billing integration placeholder: onPlanChanged() hook ready for implementation
