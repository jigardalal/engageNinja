/**
 * Authentication Routes
 * Handles user signup, login, logout, and session management
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { copyActiveGlobalTagsToTenant } = require('../utils/globalTags');

const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

const verifyRecaptchaToken = async (token) => {
  if (!recaptchaSecret) return true;
  if (!token) return false;

  try {
    const params = new URLSearchParams();
    params.append('secret', recaptchaSecret);
    params.append('response', token);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const result = await response.json();
    if (!result.success) return false;
    if (result.score !== undefined && result.score < 0.5) return false;
    return true;
  } catch (err) {
    console.error('reCAPTCHA verification error:', err);
    return false;
  }
};

// ===== VALIDATION HELPERS =====

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // MVP: >8 chars requirement
  return password && password.length > 8;
};

const ensureUserTableHasNameColumn = () => {
  // Database schema is managed by migrations
  // This function is kept for backward compatibility but does nothing
  // Try-catch blocks silently handle migration attempts on already-existing columns
  const columns = [
    'name', 'first_name', 'last_name', 'phone', 'timezone', 'locale'
  ];
  columns.forEach(col => {
    try {
      db.prepare(`ALTER TABLE users ADD COLUMN ${col} TEXT`).run();
    } catch (e) {
      // Column already exists - ignore
    }
  });
};

// ===== MIDDLEWARE =====

// Check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in',
      status: 'error'
    });
  }
  next();
};

// ===== ROUTES =====

/**
 * POST /auth/signup
 * Create new user account
 */
router.post('/signup', async (req, res) => {
  try {
    ensureUserTableHasNameColumn();
    const { email, password, firstName, lastName, phone, companyName, recaptchaToken } = req.body;

    // Basic required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email and password are required',
        status: 'error'
      });
    }

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'First name is required',
        status: 'error'
      });
    }

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Company or workspace name is required',
        status: 'error'
      });
    }

    if (recaptchaSecret) {
      if (!recaptchaToken) {
        return res.status(400).json({
          error: 'Missing captcha',
          message: 'Please complete the captcha challenge',
          status: 'error'
        });
      }

      const captchaValid = await verifyRecaptchaToken(recaptchaToken);
      if (!captchaValid) {
        return res.status(400).json({
          error: 'Invalid captcha',
          message: 'Captcha validation failed',
          status: 'error'
        });
      }
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
        status: 'error'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 9 characters',
        status: 'error'
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        error: 'Email already exists',
        message: 'This email is already registered',
        status: 'error'
      });
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName && lastName.trim();
    const trimmedPhone = phone && phone.trim();
    const trimmedCompanyName = companyName.trim();

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    const userFullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ') || null;

    db.prepare(`
      INSERT INTO users (id, email, name, first_name, last_name, phone, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      normalizedEmail,
      userFullName,
      trimmedFirstName,
      trimmedLastName || null,
      trimmedPhone || null,
      passwordHash,
      now,
      now
    );

    // Get free plan ID
    const freePlan = db.prepare('SELECT id FROM plans WHERE name = ? LIMIT 1').get('Free Plan');
    if (!freePlan) {
      throw new Error('Free plan not found in database');
    }

    // Create tenant on free plan
    const tenantId = uuidv4();
    const tenantName = trimmedCompanyName;

    db.prepare(`
      INSERT INTO tenants (id, name, plan_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenantId, tenantName, freePlan.id, now, now);

    // Copy active global tags into new tenant
    copyActiveGlobalTagsToTenant(db, tenantId);

    // Link user to tenant
    db.prepare(`
      INSERT INTO user_tenants (user_id, tenant_id, role, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, tenantId, 'admin', now);

    // Set session cookie
    req.session.userId = userId;
    req.session.email = normalizedEmail;
    req.session.activeTenantId = tenantId;

    res.status(201).json({
      user_id: userId,
      tenant_id: tenantId,
      tenant_name: tenantName,
      email: normalizedEmail,
      name: userFullName,
      first_name: trimmedFirstName,
      last_name: trimmedLastName || null,
      phone: trimmedPhone || null,
      role_global: 'none',
      message: 'Signup successful',
      status: 'success'
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Signup failed',
      message: error.message || 'An error occurred during signup',
      status: 'error'
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user with email and password
 */
router.post('/login', (req, res) => {
  try {
    ensureUserTableHasNameColumn();
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email and password are required',
        status: 'error'
      });
    }

    // Find user
    const user = db.prepare('SELECT id, email, name, first_name, last_name, phone, timezone, password_hash, role_global FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
        status: 'error'
      });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
        status: 'error'
      });
    }

    // Get user's tenants
    const userTenants = db.prepare(`
      SELECT ut.tenant_id, ut.role, t.name, t.plan_id, p.name as plan
      FROM user_tenants ut
      JOIN tenants t ON ut.tenant_id = t.id
      JOIN plans p ON t.plan_id = p.id
      WHERE ut.user_id = ?
      ORDER BY ut.created_at
    `).all(user.id);

    if (!userTenants || userTenants.length === 0) {
      return res.status(500).json({
        error: 'No tenant found',
        message: 'User has no associated tenants',
        status: 'error'
      });
    }

    // Determine active tenant: only auto-set when there is a single tenant
    const hasMultipleTenants = userTenants.length > 1;
    const activeTenantId = hasMultipleTenants ? null : userTenants[0].tenant_id;

    // Set session
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.activeTenantId = activeTenantId;

    res.status(200).json({
      user_id: user.id,
      email: user.email,
      name: user.name || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      phone: user.phone || null,
      timezone: user.timezone || null,
      role_global: user.role_global,
      tenants: userTenants.map(t => ({
        tenant_id: t.tenant_id,
        name: t.name,
        plan: t.plan,
        role: t.role
      })),
      active_tenant_id: activeTenantId,
      must_select_tenant: hasMultipleTenants && !activeTenantId,
      status: 'success'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message || 'An error occurred during login',
      status: 'error'
    });
  }
});

/**
 * POST /auth/switch-tenant
 * Persist tenant switch in session (only if user has access)
 */
router.post('/switch-tenant', requireAuth, (req, res) => {
  try {
    const { tenantId } = req.body || {};
    if (!tenantId) {
      return res.status(400).json({
        error: 'Invalid tenant',
        message: 'tenantId is required',
        status: 'error'
      });
    }

    let tenant = db.prepare(`
      SELECT ut.tenant_id, ut.role, t.name, p.name as plan
      FROM user_tenants ut
      JOIN tenants t ON ut.tenant_id = t.id
      JOIN plans p ON t.plan_id = p.id
      WHERE ut.user_id = ? AND ut.tenant_id = ?
    `).get(req.session.userId, tenantId);

    if (!tenant) {
      // Platform admins can enter any tenant; create membership on the fly
      const user = db.prepare('SELECT role_global FROM users WHERE id = ?').get(req.session.userId);
      if (user && ['platform_admin', 'system_admin'].includes(user.role_global)) {
        const targetTenant = db.prepare(`
          SELECT t.id, t.name, p.name as plan
          FROM tenants t
          JOIN plans p ON t.plan_id = p.id
          WHERE t.id = ?
        `).get(tenantId);

        if (!targetTenant) {
          return res.status(404).json({
            error: 'Tenant not found',
            message: 'The requested tenant does not exist',
            status: 'error'
          });
        }

        db.prepare(`
          INSERT OR IGNORE INTO user_tenants (user_id, tenant_id, role, active, created_at)
          VALUES (?, ?, 'admin', 1, CURRENT_TIMESTAMP)
        `).run(req.session.userId, tenantId);

        tenant = {
          tenant_id: targetTenant.id,
          role: 'admin',
          name: targetTenant.name,
          plan: targetTenant.plan
        };
      } else {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this tenant',
          status: 'error'
        });
      }
    }

    req.session.activeTenantId = tenantId;

    const allTenants = db.prepare(`
      SELECT ut.tenant_id, ut.role, t.name, p.name as plan
      FROM user_tenants ut
      JOIN tenants t ON ut.tenant_id = t.id
      JOIN plans p ON t.plan_id = p.id
      WHERE ut.user_id = ?
      ORDER BY ut.created_at
    `).all(req.session.userId);

    res.status(200).json({
      status: 'success',
      active_tenant_id: tenantId,
      tenants: allTenants.map(t => ({
        tenant_id: t.tenant_id,
        name: t.name,
        plan: t.plan,
        role: t.role
      }))
    });
  } catch (error) {
    console.error('Switch tenant error:', error);
    res.status(500).json({
      error: 'Switch tenant failed',
      message: error.message || 'Unable to switch tenant',
      status: 'error'
    });
  }
});

/**
 * POST /auth/logout
 * Clear user session
 */
router.post('/logout', (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            error: 'Logout failed',
            message: 'Failed to destroy session',
            status: 'error'
          });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({
          message: 'Logout successful',
          status: 'success'
        });
      });
    } else {
      res.status(200).json({
        message: 'Already logged out',
        status: 'success'
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /auth/me
 * Get current user info including roles
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    ensureUserTableHasNameColumn();
    const user = db.prepare('SELECT id, email, name, first_name, last_name, phone, timezone, role_global, active FROM users WHERE id = ?').get(req.session.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
        status: 'error'
      });
    }

    const userTenants = db.prepare(`
      SELECT ut.tenant_id, ut.role, ut.active, t.name, t.plan_id, p.name as plan
      FROM user_tenants ut
      JOIN tenants t ON ut.tenant_id = t.id
      JOIN plans p ON t.plan_id = p.id
      WHERE ut.user_id = ?
      ORDER BY ut.created_at
    `).all(user.id);

    const hasMultipleTenants = userTenants.length > 1;
    const mustSelectTenant = hasMultipleTenants && !req.session.activeTenantId;

    // Get current tenant role if active
    let currentTenantRole = null;
    if (req.session.activeTenantId) {
      const activeTenant = userTenants.find(t => t.tenant_id === req.session.activeTenantId);
      if (activeTenant) {
        currentTenantRole = activeTenant.role;
      }
    }

    res.status(200).json({
      user_id: user.id,
      email: user.email,
      name: user.name || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      phone: user.phone || null,
      timezone: user.timezone || null,
      role_global: user.role_global,
      active: user.active === 1,
      tenants: userTenants.map(t => ({
        tenant_id: t.tenant_id,
        name: t.name,
        plan: t.plan,
        role: t.role,
        active: t.active === 1
      })),
      active_tenant_id: req.session.activeTenantId,
      active_tenant_role: currentTenantRole,
      must_select_tenant: mustSelectTenant,
      status: 'success'
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * PUT /auth/profile
 * Update basic user profile (name)
 */
router.put('/profile', requireAuth, (req, res) => {
  try {
    ensureUserTableHasNameColumn();
    const { name, first_name, last_name, phone, timezone } = req.body;
    const trimmed = (name || '').trim();
    if (trimmed.length === 0 && !first_name && !last_name) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Name or first/last name is required',
        status: 'error'
      });
    }

    const now = new Date().toISOString();
    const updates = [];
    const params = [];

    if (trimmed) {
      updates.push('name = ?'); params.push(trimmed);
    }
    updates.push('first_name = ?'); params.push(first_name || null);
    updates.push('last_name = ?'); params.push(last_name || null);
    updates.push('phone = ?'); params.push(phone || null);
    updates.push('timezone = ?'); params.push(timezone || null);
    updates.push('updated_at = ?'); params.push(now);
    params.push(req.session.userId);

    const result = db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
        status: 'error'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated',
      name: trimmed || null,
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
      timezone: timezone || null
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: error.message || 'Could not update profile',
      status: 'error'
    });
  }
});

/**
 * POST /auth/change-password
 * Change current user's password
 */
router.post('/change-password', requireAuth, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Current and new password are required',
        status: 'error'
      });
    }
    if (!validatePassword(new_password)) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 9 characters',
        status: 'error'
      });
    }

    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found',
        status: 'error'
      });
    }

    const isCurrentValid = bcrypt.compareSync(current_password, user.password_hash);
    if (!isCurrentValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Current password is incorrect',
        status: 'error'
      });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, user.id);

    res.status(200).json({
      status: 'success',
      message: 'Password updated'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Change password failed',
      message: error.message || 'Could not change password',
      status: 'error'
    });
  }
});

/**
 * POST /auth/accept-invite
 * Accept a pending invitation and join a tenant
 * User must be authenticated and matching invitation email
 */
router.post('/accept-invite', requireAuth, (req, res) => {
  try {
    const { invitation_token } = req.body;
    const userId = req.session.userId;

    if (!invitation_token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'invitation_token is required',
        status: 'error'
      });
    }

    // Get user email
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
        status: 'error'
      });
    }

    // Get invitation
    const invitation = db.prepare(`
      SELECT id, email, tenant_id, role, expires_at, created_at
      FROM user_invitations
      WHERE token = ?
    `).get(invitation_token);

    if (!invitation) {
      return res.status(404).json({
        error: 'Invitation not found',
        message: 'Invalid or expired invitation token',
        status: 'error'
      });
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({
        error: 'Invitation mismatch',
        message: 'This invitation is for a different email address',
        status: 'error'
      });
    }

    // Check expiration
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return res.status(400).json({
        error: 'Invitation expired',
        message: 'This invitation has expired',
        status: 'error'
      });
    }

    // Check if user already in tenant
    const existing = db.prepare(`
      SELECT id FROM user_tenants
      WHERE user_id = ? AND tenant_id = ?
    `).get(userId, invitation.tenant_id);

    if (existing) {
      return res.status(400).json({
        error: 'Already a member',
        message: 'You are already a member of this tenant',
        status: 'error'
      });
    }

    const now = new Date().toISOString();

    // Add user to tenant with role from invitation
    db.prepare(`
      INSERT INTO user_tenants (user_id, tenant_id, role, active, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run(userId, invitation.tenant_id, invitation.role, now);

    // Mark invitation as accepted (soft delete or mark used)
    db.prepare(`
      DELETE FROM user_invitations
      WHERE id = ?
    `).run(invitation.id);

    // Get tenant info
    const tenant = db.prepare(`
      SELECT t.id, t.name, p.name as plan
      FROM tenants t
      JOIN plans p ON t.plan_id = p.id
      WHERE t.id = ?
    `).get(invitation.tenant_id);

    res.status(200).json({
      tenant_id: invitation.tenant_id,
      tenant_name: tenant.name,
      role: invitation.role,
      message: `Successfully joined ${tenant.name}`,
      status: 'success'
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      error: 'Failed to accept invitation',
      message: error.message,
      status: 'error'
    });
  }
});

module.exports = router;
