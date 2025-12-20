/**
 * Authentication Routes
 * Handles user signup, login, logout, and session management
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// ===== VALIDATION HELPERS =====

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // MVP: >8 chars requirement
  return password && password.length > 8;
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
router.post('/signup', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email and password are required',
        status: 'error'
      });
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

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        error: 'Email already exists',
        message: 'This email is already registered',
        status: 'error'
      });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, now, now);

    // Get free plan ID
    const freePlan = db.prepare('SELECT id FROM plans WHERE name = ? LIMIT 1').get('Free Plan');
    if (!freePlan) {
      throw new Error('Free plan not found in database');
    }

    // Create tenant on free plan
    const tenantId = uuidv4();
    const tenantName = `${email.split('@')[0]}'s Tenant`;

    db.prepare(`
      INSERT INTO tenants (id, name, plan_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenantId, tenantName, freePlan.id, now, now);

    // Link user to tenant
    db.prepare(`
      INSERT INTO user_tenants (user_id, tenant_id, role, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, tenantId, 'admin', now);

    // Set session cookie
    req.session.userId = userId;
    req.session.email = email.toLowerCase();
    req.session.activeTenantId = tenantId;

    res.status(201).json({
      user_id: userId,
      tenant_id: tenantId,
      email: email.toLowerCase(),
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
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email.toLowerCase());

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
      SELECT ut.tenant_id, t.name, t.plan_id, p.name as plan
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

    // Auto-select first tenant (or single if only one)
    const activeTenantId = userTenants[0].tenant_id;

    // Set session
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.activeTenantId = activeTenantId;

    res.status(200).json({
      user_id: user.id,
      email: user.email,
      tenants: userTenants.map(t => ({
        tenant_id: t.tenant_id,
        name: t.name,
        plan: t.plan
      })),
      active_tenant_id: activeTenantId,
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
 * Get current user info
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.session.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
        status: 'error'
      });
    }

    const userTenants = db.prepare(`
      SELECT ut.tenant_id, t.name, t.plan_id, p.name as plan
      FROM user_tenants ut
      JOIN tenants t ON ut.tenant_id = t.id
      JOIN plans p ON t.plan_id = p.id
      WHERE ut.user_id = ?
      ORDER BY ut.created_at
    `).all(user.id);

    res.status(200).json({
      user_id: user.id,
      email: user.email,
      tenants: userTenants.map(t => ({
        tenant_id: t.tenant_id,
        name: t.name,
        plan: t.plan
      })),
      active_tenant_id: req.session.activeTenantId,
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

module.exports = router;
