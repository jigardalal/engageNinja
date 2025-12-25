/**
 * RBAC Middleware for EngageNinja
 * Enforces role-based access control for tenant and platform routes
 *
 * Role Hierarchy (for tenant roles):
 *   viewer (0) < member (1) < admin (2) < owner (3)
 *
 * Owner role automatically includes all admin permissions
 */

// Get database connection - use the shared db from src/db.js
let db;
try {
  db = require('../db');
} catch (error) {
  console.error('Failed to initialize database in RBAC middleware:', error);
}

/**
 * Check if user has specific tenant role (at minimum)
 * Uses role hierarchy: viewer < member < admin < owner
 */
function requireTenantRole(minRole) {
  const roleHierarchy = {
    viewer: 0,
    member: 1,
    admin: 2,
    owner: 3
  };

  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized - no session' });
    }

    // Get active tenant from session
    const tenantId = req.tenantId || req.session.activeTenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'No active tenant context' });
    }

    try {
      // Get user's role in this tenant
      const membership = db.prepare(`
        SELECT role, active FROM user_tenants
        WHERE user_id = ? AND tenant_id = ?
      `).get(req.session.userId, tenantId);

      // Check if user has membership in this tenant
      if (!membership) {
        return res.status(403).json({
          error: 'Forbidden - user does not have access to this tenant'
        });
      }

      // Check if membership is active
      if (!membership.active) {
        return res.status(403).json({
          error: 'Forbidden - membership is inactive'
        });
      }

      // Check role hierarchy
      if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
        return res.status(403).json({
          error: `Forbidden - requires ${minRole} role or higher. Your role: ${membership.role}`,
          requiredRole: minRole,
          userRole: membership.role
        });
      }

      // Store role in request for use in handlers
      req.userRole = membership.role;
      req.tenantId = tenantId;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Check if user has platform-level role
 */
function requirePlatformRole(allowedRoles) {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized - no session' });
    }

    try {
      // Get user's global role
      const user = db.prepare(`
        SELECT role_global, active FROM users WHERE id = ?
      `).get(req.session.userId);

      if (!user) {
        return res.status(403).json({ error: 'Forbidden - user not found' });
      }

      // Check if user account is active
      if (!user.active) {
        return res.status(403).json({ error: 'Forbidden - account is inactive' });
      }

      // Check if user has one of the allowed platform roles
      if (!allowedRoles.includes(user.role_global)) {
        return res.status(403).json({
          error: `Forbidden - requires platform admin access. Allowed roles: ${allowedRoles.join(', ')}`,
          userRole: user.role_global
        });
      }

      // Store platform role in request
      req.platformRole = user.role_global;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Convenience middleware helpers - can be used directly in route definitions
 */

// Tenant role checks
const requireViewer = requireTenantRole('viewer');
const requireMember = requireTenantRole('member');
const requireAdmin = requireTenantRole('admin');
const requireOwner = requireTenantRole('owner');

// Platform role checks
const requirePlatformAdmin = requirePlatformRole(['system_admin', 'platform_admin']);
const requireSystemAdmin = requirePlatformRole(['system_admin']);

/**
 * Special check: verify user is NOT a viewer
 * Used for actions that viewers cannot perform (create, edit, delete, send, etc.)
 */
function requireNonViewer() {
  return (req, res, next) => {
    if (req.userRole === 'viewer') {
      return res.status(403).json({
        error: 'Viewers cannot perform this action'
      });
    }
    next();
  };
}

/**
 * Special check: verify user is last owner of tenant (blocks removal/demotion)
 */
function checkLastOwner(tenantId, userId) {
  const ownerCount = db.prepare(`
    SELECT COUNT(*) as count FROM user_tenants
    WHERE tenant_id = ? AND role = 'owner' AND active = 1
  `).get(tenantId);

  const isLastOwner = ownerCount.count === 1 &&
    db.prepare(`SELECT role FROM user_tenants WHERE user_id = ? AND tenant_id = ?`)
      .get(userId, tenantId)?.role === 'owner';

  return isLastOwner;
}

/**
 * Log RBAC access decision for debugging
 */
function logRBACDecision(decision, details) {
  if (process.env.DEBUG_RBAC === 'true') {
    console.log(`[RBAC] ${decision}:`, details);
  }
}

module.exports = {
  requireTenantRole,
  requirePlatformRole,
  requireViewer,
  requireMember,
  requireAdmin,
  requireOwner,
  requirePlatformAdmin,
  requireSystemAdmin,
  requireNonViewer,
  checkLastOwner,
  logRBACDecision
};
