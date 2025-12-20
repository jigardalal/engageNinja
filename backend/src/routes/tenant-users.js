/**
 * Tenant User Management Routes
 * Handles user invitations, role management, and team member operations
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { requireAdmin } = require('../middleware/rbac');
const { logAudit, AUDIT_ACTIONS } = require('../utils/audit');

// ===== MIDDLEWARE =====

// Require authentication and tenant context
const requireAuthAndTenant = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in',
      status: 'error'
    });
  }

  if (!req.session.activeTenantId) {
    return res.status(400).json({
      error: 'Missing tenant context',
      message: 'activeTenantId is required',
      status: 'error'
    });
  }

  next();
};

// ===== ROUTES =====

/**
 * GET /api/tenant/users
 * List all users in the current tenant
 */
router.get('/', requireAuthAndTenant, (req, res) => {
  try {
    const tenantId = req.session.activeTenantId;

    // Get all users in tenant with their roles
    const users = db.prepare(`
      SELECT
        u.id,
        u.email,
        u.name,
        ut.role,
        ut.active,
        ut.created_at,
        CASE
          WHEN ut.role = 'owner' THEN 3
          WHEN ut.role = 'admin' THEN 2
          WHEN ut.role = 'member' THEN 1
          WHEN ut.role = 'viewer' THEN 0
          ELSE -1
        END as role_level
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE ut.tenant_id = ?
        AND (u.role_global IS NULL OR u.role_global NOT IN ('platform_admin', 'system_admin', 'platform_support'))
      ORDER BY role_level DESC, u.email ASC
    `).all(tenantId);

    // Count by role for summary
    const roleCount = {
      owner: users.filter(u => u.role === 'owner').length,
      admin: users.filter(u => u.role === 'admin').length,
      member: users.filter(u => u.role === 'member').length,
      viewer: users.filter(u => u.role === 'viewer').length
    };

    res.status(200).json({
      users: users.map(u => ({
        id: u.id,
        user_id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        active: u.active === 1,
        joined_at: u.created_at
      })),
      summary: {
        total: users.length,
        by_role: roleCount
      },
      status: 'success'
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Failed to list users',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /api/tenant/users/invite
 * Invite a new user to the tenant by email
 * Requires: admin+ role
 */
router.post('/invite', requireAuthAndTenant, requireAdmin, (req, res) => {
  try {
    const tenantId = req.session.activeTenantId;
    const { email, role } = req.body;

    // Validate input
    if (!email || !role) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'email and role are required',
        status: 'error'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
        status: 'error'
      });
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`,
        status: 'error'
      });
    }

    // Only owners can invite an additional owner
    if (role === 'owner' && req.userRole !== 'owner') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only owners can invite a user as owner',
        status: 'error'
      });
    }

    // Check if user already exists in tenant
    const existingUser = db.prepare(`
      SELECT u.id, u.email, ut.role
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE u.email = ? AND ut.tenant_id = ?
    `).get(email.toLowerCase(), tenantId);

    if (existingUser) {
      return res.status(400).json({
        error: 'User already in tenant',
        message: `${email} is already a member of this tenant`,
        status: 'error'
      });
    }

    // Check if user exists globally (not in this tenant)
    const existingGlobalUser = db.prepare(`
      SELECT id, email
      FROM users
      WHERE email = ?
    `).get(email.toLowerCase());

    const now = new Date().toISOString();

    // If user doesn't exist, add to pending invitations
    if (!existingGlobalUser) {
      const invitationId = uuidv4();
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

      db.prepare(`
        INSERT INTO user_invitations (id, email, tenant_id, role, token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        invitationId,
        email.toLowerCase(),
        tenantId,
        role,
        invitationToken,
        expiresAt.toISOString(),
        now
      );

      // Log audit event
      logAudit({
        actorUserId: req.session.userId,
        actorType: 'tenant_user',
        tenantId,
        action: AUDIT_ACTIONS.USER_INVITE,
        targetType: 'user',
        targetId: email.toLowerCase(),
        metadata: {
          email: email.toLowerCase(),
          role: role,
          type: 'pending_invitation'
        },
        ipAddress: req.ip
      });

      res.status(201).json({
        invitation_id: invitationId,
        email: email.toLowerCase(),
        role: role,
        status_type: 'pending_invitation',
        expires_at: expiresAt.toISOString(),
        message: 'Invitation sent to new user',
        status: 'success'
      });
    } else {
      // User exists but not in this tenant - add directly
      db.prepare(`
        INSERT INTO user_tenants (user_id, tenant_id, role, active, created_at)
        VALUES (?, ?, ?, 1, ?)
      `).run(existingGlobalUser.id, tenantId, role, now);

      // Log audit event
      logAudit({
        actorUserId: req.session.userId,
        actorType: 'tenant_user',
        tenantId,
        action: AUDIT_ACTIONS.USER_INVITE,
        targetType: 'user',
        targetId: existingGlobalUser.id,
        metadata: {
          email: email.toLowerCase(),
          role: role,
          type: 'direct_addition'
        },
        ipAddress: req.ip
      });

      res.status(201).json({
        user_id: existingGlobalUser.id,
        email: email.toLowerCase(),
        role: role,
        status_type: 'direct_addition',
        message: 'User added to tenant',
        status: 'success'
      });
    }
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      error: 'Failed to invite user',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * PATCH /api/tenant/users/:userId/role
 * Change user role in current tenant
 * Requires: admin+ role
 */
router.patch('/:userId/role', requireAuthAndTenant, requireAdmin, (req, res) => {
  try {
    const tenantId = req.session.activeTenantId;
    const userId = req.params.userId;
    const { role } = req.body;

    // Validate role
    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`,
        status: 'error'
      });
    }

    // Verify target user exists in tenant
    const targetUser = db.prepare(`
      SELECT u.id, u.email, ut.role, ut.active
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE u.id = ? AND ut.tenant_id = ?
    `).get(userId, tenantId);

    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User is not a member of this tenant',
        status: 'error'
      });
    }

    // Tenant admins can manage roles, but only owners can:
    // - change a user's role to owner
    // - change the role of an existing owner
    if (req.userRole !== 'owner') {
      if (role === 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only owners can promote a user to owner',
          status: 'error'
        });
      }
      if (targetUser.role === 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only owners can change an owner role',
          status: 'error'
        });
      }
    }

    // If changing FROM owner, ensure there's another owner
    if (targetUser.role === 'owner' && role !== 'owner') {
      const ownerCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM user_tenants
        WHERE tenant_id = ? AND role = 'owner' AND active = 1
      `).get(tenantId);

      if (ownerCount.count <= 1) {
        return res.status(400).json({
          error: 'Cannot remove last owner',
          message: 'Tenant must have at least one owner',
          status: 'error'
        });
      }
    }

    const now = new Date().toISOString();

    // Update role
    db.prepare(`
      UPDATE user_tenants
      SET role = ?, updated_at = ?
      WHERE user_id = ? AND tenant_id = ?
    `).run(role, now, userId, tenantId);

    // Log audit event
    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGE,
      targetType: 'user',
      targetId: userId,
      metadata: {
        email: targetUser.email,
        old_role: targetUser.role,
        new_role: role
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      user_id: userId,
      email: targetUser.email,
      role: role,
      message: 'User role updated',
      status: 'success'
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({
      error: 'Failed to change user role',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * DELETE /api/tenant/users/:userId
 * Remove user from current tenant
 * Requires: admin+ role
 */
router.delete('/:userId', requireAuthAndTenant, requireAdmin, (req, res) => {
  try {
    const tenantId = req.session.activeTenantId;
    const userId = req.params.userId;

    // Prevent removing self
    if (userId === req.session.userId) {
      return res.status(400).json({
        error: 'Cannot remove self',
        message: 'You cannot remove yourself from the tenant',
        status: 'error'
      });
    }

    // Verify target user exists in tenant
    const targetUser = db.prepare(`
      SELECT u.id, u.email, ut.role
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE u.id = ? AND ut.tenant_id = ?
    `).get(userId, tenantId);

    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User is not a member of this tenant',
        status: 'error'
      });
    }

    if (targetUser.role === 'owner') {
      return res.status(400).json({
        error: 'Cannot remove owner',
        message: 'Tenant owners cannot be removed from the tenant',
        status: 'error'
      });
    }

    // Remove user from tenant
    db.prepare(`
      DELETE FROM user_tenants
      WHERE user_id = ? AND tenant_id = ?
    `).run(userId, tenantId);

    // Log audit event
    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId,
      action: AUDIT_ACTIONS.USER_REMOVE,
      targetType: 'user',
      targetId: userId,
      metadata: {
        email: targetUser.email,
        role: targetUser.role
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      user_id: userId,
      email: targetUser.email,
      message: 'User removed from tenant',
      status: 'success'
    });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({
      error: 'Failed to remove user',
      message: error.message,
      status: 'error'
    });
  }
});

module.exports = router;
