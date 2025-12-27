/**
 * Platform Admin Routes
 * Manages tenants, users, and audit logs at the platform level
 * All routes require platform admin role (system_admin or platform_admin)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { requirePlatformAdmin } = require('../middleware/rbac');
const { logAudit, AUDIT_ACTIONS } = require('../utils/audit');
const { copyActiveGlobalTagsToTenant } = require('../utils/globalTags');
const { getBillingSummary, BillingSummaryError } = require('../services/billingSummary');

const PLAN_COLUMNS = [
  'id',
  'name',
  'whatsapp_messages_per_month',
  'email_messages_per_month',
  'max_users',
  'contacts_limit',
  'sms_messages_per_month',
  'api_tokens_per_month',
  'ai_features_enabled',
  'api_enabled',
  'default_price',
  'created_at',
  'updated_at'
];

const normalizePlanRecord = (plan) => ({
  ...plan,
  ai_features_enabled: Boolean(plan.ai_features_enabled),
  api_enabled: Boolean(plan.api_enabled),
  default_price: plan.default_price !== null && plan.default_price !== undefined ? Number(plan.default_price) : null
});

const parseIntegerValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative whole number`);
  }
  return parsed;
};

const parseDecimalValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return parsed;
};

const parseBooleanValue = (value) => (value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0);

// ===== MIDDLEWARE =====

/**
 * Require authentication
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in'
    });
  }
  next();
};

/**
 * Apply platform admin requirement to all routes
 */
router.use(requireAuth);
router.use(requirePlatformAdmin);

// ===== TENANT MANAGEMENT =====

/**
 * GET /api/admin/tenants
 * List all tenants with optional filtering and search
 * Query params:
 *   - status: Filter by tenant status (active, suspended, archived, deleted)
 *   - plan: Filter by plan_id
 *   - search: Search by tenant name or id
 *   - limit: Number of results (default 50, max 100)
 *   - offset: Pagination offset (default 0)
 */
router.get('/tenants', async (req, res) => {
  try {
    const { status, plan, search, limit = 50, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const offsetNum = parseInt(offset) || 0;

    let query = `
      SELECT
        t.*,
        p.name as plan_name,
        COUNT(DISTINCT ut.user_id) as user_count
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      LEFT JOIN user_tenants ut ON t.id = ut.tenant_id AND ut.active
      WHERE 1=1
    `;
    const params = [];

    // Status filter
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    // Plan filter
    if (plan) {
      query += ' AND t.plan_id = ?';
      params.push(plan);
    }

    // Search by name or ID
    if (search) {
      query += ' AND (t.name LIKE ? OR t.id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY t.id, p.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limitNum, offsetNum);

    const tenants = await db.prepare(query).all(...params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM tenants WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (plan) {
      countQuery += ' AND plan_id = ?';
      countParams.push(plan);
    }
    if (search) {
      countQuery += ' AND (name LIKE ? OR id LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const { total } = await db.prepare(countQuery).get(...countParams);

    res.json({
      tenants,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listing tenants:', error);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

/**
 * GET /api/admin/tenants/:tenantId
 * Get detailed information about a specific tenant
 * Includes usage metrics and member details
 */
router.get('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await db.prepare(`
      SELECT
        t.*,
        p.name as plan_name
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      WHERE t.id = ?
    `).get(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get user count and details
    const users = await db.prepare(`
      SELECT
        u.id,
        u.email,
        u.name,
        ut.role,
        ut.active,
        ut.created_at as joined_at
      FROM users u
      INNER JOIN user_tenants ut ON u.id = ut.user_id
      WHERE ut.tenant_id = ?
      ORDER BY ut.created_at DESC
    `).all(tenantId);

    // Get campaign count
    const { campaign_count } = await db.prepare(`
      SELECT COUNT(*) as campaign_count FROM campaigns WHERE tenant_id = ?
    `).get(tenantId) || { campaign_count: 0 };

    // Get contact count
    const { contact_count } = await db.prepare(`
      SELECT COUNT(*) as contact_count FROM contacts WHERE tenant_id = ?
    `).get(tenantId) || { contact_count: 0 };

    // Get plan overrides if they exist
    const planOverrides = await db.prepare(`
      SELECT wa_messages_override, emails_override, sms_override
      FROM plan_overrides WHERE tenant_id = ?
    `).get(tenantId);

    // Parse JSON fields
    const parsedTenant = {
      ...tenant,
      limits: tenant.limits ? JSON.parse(tenant.limits) : {},
      metadata: tenant.metadata ? JSON.parse(tenant.metadata) : {}
    };

    res.json({
      tenant: parsedTenant,
      metrics: {
        user_count: users.length,
        campaign_count,
        contact_count
      },
      users,
      planOverrides: planOverrides || {
        wa_messages_override: null,
        emails_override: null,
        sms_override: null
      }
    });
  } catch (error) {
    console.error('Error getting tenant details:', error);
    res.status(500).json({ error: 'Failed to get tenant details' });
  }
});

/**
 * GET /api/admin/tenants/:tenantId/billing
 * Returns billing summary (plan, usage, limits, invoices) for a tenant
 */
router.get('/tenants/:tenantId/billing', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const summary = await getBillingSummary(tenantId);
    res.json(summary);
  } catch (error) {
    if (error instanceof BillingSummaryError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching tenant billing summary:', error);
    res.status(500).json({ error: 'Failed to fetch tenant billing summary' });
  }
});

/**
 * POST /api/admin/tenants/:tenantId/billing/checkout-session
 * Creates a Stripe checkout session for a tenant to subscribe to their current plan
 * Used when admin wants to initiate subscription for a tenant
 */
router.post('/tenants/:tenantId/billing/checkout-session', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const billingService = req.app.locals.billingService;
    if (!billingService) {
      return res.status(503).json({ error: 'Billing service not configured' });
    }

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const planId = tenant.plan_id || 'free';
    if (planId === 'free') {
      return res.status(400).json({ error: 'Cannot create subscription for free plan' });
    }

    const returnUrls = {
      success: `${process.env.APP_URL || 'http://localhost:5173'}/billing/success`,
      cancel: `${process.env.APP_URL || 'http://localhost:5173'}/billing/failure`,
    };

    const session = await billingService.createCheckoutSession(tenant, planId, returnUrls);
    res.json(session);
  } catch (error) {
    console.error('Error creating tenant checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/admin/tenants/:tenantId/billing/portal-session
 * Creates a Stripe billing portal session for a tenant
 */
  router.post('/tenants/:tenantId/billing/portal-session', async (req, res) => {
    try {
      const { tenantId } = req.params;
      const billingService = req.app.locals.billingService;
      if (!billingService) {
        return res.status(503).json({ error: 'Billing service not configured' });
      }

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const session = await billingService.createBillingPortalSession(tenant);
      res.json(session);
    } catch (error) {
      console.error('Error creating tenant portal session:', error);
      res.status(500).json({ error: 'Failed to create billing portal session' });
    }
  });

/**
 * GET /api/admin/plans
 * List platform plans with editable fields
 */
router.get('/plans', async (req, res) => {
  try {
    const rawPlans = await db
      .prepare(`SELECT ${PLAN_COLUMNS.join(', ')} FROM plans ORDER BY created_at`)
      .all();
    res.json({
      plans: rawPlans.map(normalizePlanRecord)
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * PATCH /api/admin/plans/:planId
 * Update plan metadata (name, limits, feature toggles, pricing)
 */
router.patch('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const {
      name,
      whatsapp_messages_per_month,
      email_messages_per_month,
      max_users,
      contacts_limit,
      sms_messages_per_month,
      api_tokens_per_month,
      ai_features_enabled,
      api_enabled,
      default_price
    } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      const trimmed = `${name}`.trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Plan name cannot be empty' });
      }
      updates.push('name = ?');
      params.push(trimmed);
    }

    if (whatsapp_messages_per_month !== undefined) {
      updates.push('whatsapp_messages_per_month = ?');
      params.push(parseIntegerValue(whatsapp_messages_per_month, 'WhatsApp messages per month'));
    }

    if (email_messages_per_month !== undefined) {
      updates.push('email_messages_per_month = ?');
      params.push(parseIntegerValue(email_messages_per_month, 'Email messages per month'));
    }

    if (max_users !== undefined) {
      updates.push('max_users = ?');
      params.push(parseIntegerValue(max_users, 'Max users'));
    }

    if (contacts_limit !== undefined) {
      updates.push('contacts_limit = ?');
      params.push(parseIntegerValue(contacts_limit, 'Contacts limit'));
    }

    if (sms_messages_per_month !== undefined) {
      updates.push('sms_messages_per_month = ?');
      params.push(parseIntegerValue(sms_messages_per_month, 'SMS messages per month'));
    }

    if (api_tokens_per_month !== undefined) {
      updates.push('api_tokens_per_month = ?');
      params.push(parseIntegerValue(api_tokens_per_month, 'API tokens per month'));
    }

    if (ai_features_enabled !== undefined) {
      updates.push('ai_features_enabled = ?');
      params.push(parseBooleanValue(ai_features_enabled));
    }

    if (api_enabled !== undefined) {
      updates.push('api_enabled = ?');
      params.push(parseBooleanValue(api_enabled));
    }

    if (default_price !== undefined) {
      updates.push('default_price = ?');
      params.push(parseDecimalValue(default_price, 'Default price'));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(planId);

    const updateQuery = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
    await db.prepare(updateQuery).run(...params);

    const updated = await db
      .prepare(`SELECT ${PLAN_COLUMNS.join(', ')} FROM plans WHERE id = ?`)
      .get(planId);

    res.json({ plan: normalizePlanRecord(updated) });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(400).json({ error: error.message || 'Failed to update plan' });
  }
});

/**
 * POST /api/admin/tenants
 * Create a new tenant
 * Body:
 *   - name: Tenant name (required)
 *   - planId: Plan ID (default: Free plan)
 *   - ownerEmail: Email of user to assign as owner (optional)
 */
router.post('/tenants', async (req, res) => {
  try {
    const { name, planId, ownerEmail } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }

    // Get default plan if not specified (prefer free plan, otherwise first available)
    let finalPlanId = planId;
    if (!finalPlanId) {
      const defaultPlan = await db.prepare(`
        SELECT id FROM plans WHERE id = 'free' OR name IN ('Free', 'Free Plan') LIMIT 1
      `).get();
      const fallbackPlan = defaultPlan || await db.prepare(`
        SELECT id FROM plans ORDER BY created_at LIMIT 1
      `).get();
      finalPlanId = fallbackPlan?.id;
    }
    if (!finalPlanId) {
      return res.status(400).json({ error: 'No valid plan found' });
    }

    // Create tenant
    const tenantId = uuidv4();
    await db.prepare(`
      INSERT INTO tenants (id, name, plan_id, status)
      VALUES (?, ?, ?, 'active')
    `).run(tenantId, name.trim(), finalPlanId);

    // Copy active global tags into new tenant
    await copyActiveGlobalTagsToTenant(tenantId);

    // Ensure creator has access when no owner is provided
    const addCreatorAccess = await db.prepare(`
      INSERT INTO user_tenants (user_id, tenant_id, role, active)
      VALUES (?, ?, 'admin', true)
      ON CONFLICT (user_id, tenant_id) DO NOTHING
    `);
    await addCreatorAccess.run(req.session.userId, tenantId);

    // Assign owner if email provided
    if (ownerEmail && ownerEmail.trim()) {
      const email = ownerEmail.trim().toLowerCase();

      // Check if user exists
      let user = await db.prepare(`
        SELECT id FROM users WHERE email = ?
      `).get(email);

      if (user) {
        // Add existing user as owner
        await db.prepare(`
          INSERT INTO user_tenants (user_id, tenant_id, role, active)
          VALUES (?, ?, 'owner', 1)
        `).run(user.id, tenantId);

        await logAudit({
          actorUserId: req.session.userId,
          actorType: 'platform_user',
          tenantId: null,
          action: AUDIT_ACTIONS.TENANT_CREATE,
          targetType: 'tenant',
          targetId: tenantId,
          metadata: {
            name: name.trim(),
            planId: finalPlanId,
            ownerEmail: email,
            ownerUserId: user.id
          },
          ipAddress: req.ip
        });

        return res.status(201).json({
          tenantId,
          message: 'Tenant created and owner assigned',
          owner: {
            userId: user.id,
            email: email,
            role: 'owner'
          }
        });
      } else {
        // Create invitation for new user
        const inviteId = uuidv4();
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await db.prepare(`
          INSERT INTO user_invitations (
            id, tenant_id, email, role, invited_by, token, expires_at
          ) VALUES (?, ?, ?, 'owner', ?, ?, ?)
        `).run(inviteId, tenantId, email, req.session.userId, token, expiresAt.toISOString());

        await logAudit({
          actorUserId: req.session.userId,
          actorType: 'platform_user',
          tenantId: null,
          action: AUDIT_ACTIONS.TENANT_CREATE,
          targetType: 'tenant',
          targetId: tenantId,
          metadata: {
            name: name.trim(),
            planId: finalPlanId,
            ownerEmail: email,
            invitationId: inviteId
          },
          ipAddress: req.ip
        });

        return res.status(201).json({
          tenantId,
          message: 'Tenant created with pending owner invitation',
          invitation: {
            inviteId,
            email: email,
            role: 'owner',
            expiresAt: expiresAt.toISOString(),
            token: token
          }
        });
      }
    }

    // No owner assigned
    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: AUDIT_ACTIONS.TENANT_CREATE,
      targetType: 'tenant',
      targetId: tenantId,
      metadata: {
        name: name.trim(),
        planId: finalPlanId
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      tenantId,
      message: 'Tenant created (no owner assigned yet)'
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

/**
 * POST /api/admin/tenants/:tenantId/sync-global-tags
 * Add missing active global tags into the tenant (non-destructive)
 */
router.post('/tenants/:tenantId/sync-global-tags', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await db.prepare(`SELECT id, name FROM tenants WHERE id = ?`).get(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const globalTags = await db.prepare(`SELECT name FROM global_tags WHERE status = 'active'`).all();
    const existingTags = (await db.prepare(`
      SELECT LOWER(name) as name FROM tags WHERE tenant_id = ?
    `).all(tenantId)).map(t => t.name);
    const existingSet = new Set(existingTags);
    const missing = globalTags.filter(g => !existingSet.has(g.name.toLowerCase()));

    if (missing.length > 0) {
      await copyActiveGlobalTagsToTenant(tenantId);
    }

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: tenantId,
      action: AUDIT_ACTIONS.TAG_CREATE,
      targetType: 'tenant',
      targetId: tenantId,
      metadata: {
        synced_global_tags: true,
        added: missing.length,
        total_active_global: globalTags.length
      },
      ipAddress: req.ip
    });

    res.json({
      message: 'Global tags synced',
      added: missing.length,
      total_active_global: globalTags.length
    });
  } catch (error) {
    console.error('Error syncing global tags:', error);
    res.status(500).json({ error: 'Failed to sync global tags' });
  }
});

/**
 * PATCH /api/admin/tenants/:tenantId
 * Update tenant configuration
 * Body (all optional):
 *   - status: 'active' | 'suspended' | 'archived' | 'deleted'
 *   - planId: New plan ID
 *   - price: Custom billing price (e.g., 29.99 for negotiated rate)
 *   - limits: JSON limits object
 *   - metadata: JSON metadata object
 */
router.patch('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      status,
      planId,
      price,
      name,
      limits,
      metadata,
      legal_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      timezone,
      billing_email,
      support_email,
      wa_messages_override,
      emails_override,
      sms_override,
      isDemo
    } = req.body;

    // Verify tenant exists
    const tenant = await db.prepare(`
      SELECT id FROM tenants WHERE id = ?
    `).get(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const updates = [];
    const params = [];
    const changes = {};

    if (status) {
      if (!['active', 'suspended', 'archived', 'deleted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      updates.push('status = ?');
      params.push(status);
      changes.status = status;
    }

    if (planId) {
      updates.push('plan_id = ?');
      params.push(planId);
      changes.planId = planId;

      // When plan changes, also copy the price from plan
      if (planId === 'free') {
        updates.push('price = NULL');
      } else {
        // Look up default price from plan
        const plan = await db.prepare('SELECT default_price FROM plans WHERE id = ?').get(planId);
        if (plan && plan.default_price) {
          updates.push('price = ?');
          params.push(plan.default_price);
          changes.price = plan.default_price;
        }
      }
    }
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.push('name = ?');
      params.push(name.trim());
      changes.name = name.trim();
    }

    if (isDemo !== undefined) {
      const demoValue = parseBooleanValue(isDemo);
      updates.push('is_demo = ?');
      params.push(demoValue);
      changes.isDemo = Boolean(demoValue);
    }

    if (limits !== undefined) {
      updates.push('limits = ?');
      params.push(JSON.stringify(limits));
      changes.limits = limits;
    }

    if (metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(metadata));
      changes.metadata = metadata;
    }

    // Handle custom billing price (for negotiated rates)
    if (price !== undefined) {
      if (price === null || price === '') {
        // Clear custom price (will use plan default on next upgrade)
        updates.push('price = NULL');
        changes.price = null;
      } else {
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0) {
          return res.status(400).json({ error: 'Price must be a valid positive number' });
        }
        updates.push('price = ?');
        params.push(priceNum);
        changes.price = priceNum;
      }
    }

    // Optional address/contact fields
    const fields = {
      legal_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      timezone,
      billing_email,
      support_email
    };

    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${key} = ?`);
        params.push(val || null);
        changes[key] = val || null;
      }
    }

    // Handle plan overrides (stored in separate table)
    const hasOverrideUpdates = wa_messages_override !== undefined || emails_override !== undefined || sms_override !== undefined;

    if (hasOverrideUpdates) {
      // Check if override record exists
      const existingOverride = await db.prepare(`SELECT id FROM plan_overrides WHERE tenant_id = ?`).get(tenantId);

      if (existingOverride) {
        // Update existing override
        const overrideUpdates = [];
        const overrideParams = [];

        if (wa_messages_override !== undefined) {
          overrideUpdates.push('wa_messages_override = ?');
          overrideParams.push(wa_messages_override);
        }
        if (emails_override !== undefined) {
          overrideUpdates.push('emails_override = ?');
          overrideParams.push(emails_override);
        }
        if (sms_override !== undefined) {
          overrideUpdates.push('sms_override = ?');
          overrideParams.push(sms_override);
        }

        overrideUpdates.push('updated_at = CURRENT_TIMESTAMP');
        overrideParams.push(tenantId);

        await db.prepare(`
          UPDATE plan_overrides SET ${overrideUpdates.join(', ')} WHERE tenant_id = ?
        `).run(...overrideParams);
      } else {
        // Create new override record
        await db.prepare(`
          INSERT INTO plan_overrides (
            id, tenant_id, wa_messages_override, emails_override, sms_override,
            created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          uuidv4(),
          tenantId,
          wa_messages_override || null,
          emails_override || null,
          sms_override || null,
          req.session.userId
        );
      }

      changes.plan_overrides = {
        wa_messages_override,
        emails_override,
        sms_override
      };
    }

    if (updates.length === 0 && !hasOverrideUpdates) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(tenantId);

      await db.prepare(`
        UPDATE tenants SET ${updates.join(', ')} WHERE id = ?
      `).run(...params);
    }

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: AUDIT_ACTIONS.TENANT_UPDATE,
      targetType: 'tenant',
      targetId: tenantId,
      metadata: changes,
      ipAddress: req.ip
    });

    res.json({
      message: 'Tenant updated successfully',
      changes
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// ===== GLOBAL TAGS =====

/**
 * GET /api/admin/global-tags
 * List all global tags
 */
router.get('/global-tags', async (req, res) => {
  try {
    const { status } = req.query;
    const normalizedStatus = status ? String(status).toLowerCase() : 'all';
    const where = ['active', 'archived'].includes(normalizedStatus) ? 'WHERE status = ?' : '';
    const params = ['active', 'archived'].includes(normalizedStatus) ? [normalizedStatus] : [];

    const tags = await db.prepare(`
      SELECT id, name, status, created_at, updated_at
      FROM global_tags
      ${where}
      ORDER BY status = 'active' DESC, created_at DESC
    `).all(...params);
    res.json({ tags });
  } catch (error) {
    console.error('Error listing global tags:', error);
    res.status(500).json({ error: 'Failed to list global tags' });
  }
});

/**
 * POST /api/admin/global-tags
 * Create a new global tag
 */
router.post('/global-tags', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Enforce unique name
    const existing = await db.prepare(`SELECT id FROM global_tags WHERE LOWER(name) = LOWER(?)`).get(name.trim());
    if (existing) {
      return res.status(400).json({ error: 'A global tag with this name already exists' });
    }

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO global_tags (id, name, status, created_at, updated_at)
      VALUES (?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, name.trim());

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: AUDIT_ACTIONS.GLOBAL_TAG_CREATE,
      targetType: 'global_tag',
      targetId: id,
      metadata: { name: name.trim() },
      ipAddress: req.ip
    });

    res.status(201).json({ id, name: name.trim(), status: 'active' });
  } catch (error) {
    console.error('Error creating global tag:', error);
    res.status(500).json({ error: 'Failed to create global tag' });
  }
});

/**
 * PATCH /api/admin/global-tags/:tagId
 * Update global tag name or status
 */
router.patch('/global-tags/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const { name, status } = req.body;

    const tag = await db.prepare(`SELECT id, name, status FROM global_tags WHERE id = ?`).get(tagId);
    if (!tag) {
      return res.status(404).json({ error: 'Global tag not found' });
    }

    const updates = [];
    const params = [];
    const changes = {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Tag name cannot be empty' });
      }
      const existing = await db.prepare(`SELECT id FROM global_tags WHERE LOWER(name) = LOWER(?) AND id <> ?`)
        .get(name.trim(), tagId);
      if (existing) {
        return res.status(400).json({ error: 'A global tag with this name already exists' });
      }
      updates.push('name = ?');
      params.push(name.trim());
      changes.name = name.trim();
    }

    if (status !== undefined) {
      if (!['active', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      updates.push('status = ?');
      params.push(status);
      changes.status = status;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(tagId);

    await db.prepare(`
      UPDATE global_tags SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: AUDIT_ACTIONS.GLOBAL_TAG_UPDATE,
      targetType: 'global_tag',
      targetId: tagId,
      metadata: changes,
      ipAddress: req.ip
    });

    res.json({ message: 'Global tag updated', tagId, changes });
  } catch (error) {
    console.error('Error updating global tag:', error);
    res.status(500).json({ error: 'Failed to update global tag' });
  }
});

// ===== USER MANAGEMENT =====

/**
 * GET /api/admin/users
 * List all users across the platform
 * Query params:
 *   - search: Search by email or name
 *   - active: Filter by active status (true/false)
 *   - role: Filter by platform role (platform_admin, platform_support, none)
 *   - limit: Number of results (default 50, max 100)
 *   - offset: Pagination offset (default 0)
 */
router.get('/users', async (req, res) => {
  try {
    const { search, active, role, limit = 50, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const offsetNum = parseInt(offset) || 0;

    let query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.first_name,
        u.last_name,
        u.phone,
        u.timezone,
        u.role_global,
        u.active,
        u.created_at,
        COUNT(DISTINCT ut.tenant_id) as tenant_count
      FROM users u
      LEFT JOIN user_tenants ut ON u.id = ut.user_id AND ut.active
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (u.email LIKE ? OR u.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (active !== undefined) {
      query += ' AND u.active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    if (role) {
      query += ' AND u.role_global = ?';
      params.push(role);
    }

    query += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limitNum, offsetNum);

    const users = await db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT u.id) as total FROM users u WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (u.email LIKE ? OR u.name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (active !== undefined) {
      countQuery += ' AND u.active = ?';
      countParams.push(active === 'true' ? 1 : 0);
    }
    if (role) {
      countQuery += ' AND u.role_global = ?';
      countParams.push(role);
    }

    const { total } = await db.prepare(countQuery).get(...countParams);

    res.json({
      users,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information including all tenant memberships
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.prepare(`
      SELECT
        id, email, name, first_name, last_name, phone, timezone, role_global, active, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all tenant memberships
    const tenants = await db.prepare(`
      SELECT
        ut.tenant_id,
        ut.role,
        ut.active,
        ut.created_at as joined_at,
        t.name,
        t.status
      FROM user_tenants ut
      INNER JOIN tenants t ON ut.tenant_id = t.id
      WHERE ut.user_id = ?
      ORDER BY ut.created_at DESC
    `).all(userId);

    res.json({
      user,
      tenants
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user account (active and/or platform role)
 * Body:
 *   - active: true/false
 *   - role_global: none/platform_support/platform_admin/system_admin
 */
router.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { active, role_global } = req.body;

    if (active === undefined && role_global === undefined) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Prevent locking yourself out
    if (userId === req.session.userId) {
      return res.status(400).json({ error: 'Cannot modify your own account via this endpoint' });
    }

    // Verify user exists
    const user = await db.prepare(`
      SELECT id, active, role_global FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const protectedPlatformRoles = ['platform_admin', 'system_admin'];

    // Platform admins cannot be deactivated or downgraded/changed
    if (active === false && protectedPlatformRoles.includes(user.role_global)) {
      return res.status(400).json({ error: 'Cannot deactivate a platform admin account' });
    }

    const changes = {};
    const updates = [];
    const params = [];

    if (active !== undefined) {
      changes.wasActive = user.active === 1;
      changes.nowActive = !!active;
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (role_global !== undefined) {
      const validRoles = ['none', 'platform_support', 'platform_admin', 'system_admin'];
      if (!validRoles.includes(role_global)) {
        return res.status(400).json({ error: 'Invalid role_global value' });
      }

      if (protectedPlatformRoles.includes(user.role_global) && role_global !== user.role_global) {
        return res.status(400).json({ error: 'Cannot change role_global for a platform admin account' });
      }

      // Only system admins can grant system_admin
      if (role_global === 'system_admin' && req.platformRole !== 'system_admin') {
        return res.status(403).json({ error: 'Only system admins can grant system_admin role' });
      }

      changes.wasRoleGlobal = user.role_global || 'none';
      changes.nowRoleGlobal = role_global;
      updates.push('role_global = ?');
      params.push(role_global);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    if (active !== undefined) {
      await logAudit({
        actorUserId: req.session.userId,
        actorType: 'platform_user',
        tenantId: null,
        action: active ? AUDIT_ACTIONS.USER_ACTIVATE : AUDIT_ACTIONS.USER_DEACTIVATE,
        targetType: 'user',
        targetId: userId,
        metadata: {
          wasActive: changes.wasActive,
          nowActive: changes.nowActive
        },
        ipAddress: req.ip
      });
    }

    if (role_global !== undefined) {
      await logAudit({
        actorUserId: req.session.userId,
        actorType: 'platform_user',
        tenantId: null,
        action: 'user.role_global_change',
        targetType: 'user',
        targetId: userId,
        metadata: {
          wasRoleGlobal: changes.wasRoleGlobal,
          nowRoleGlobal: changes.nowRoleGlobal
        },
        ipAddress: req.ip
      });
    }

    res.json({
      message: 'User updated successfully',
      userId,
      changes
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * POST /api/admin/users/:userId/tenants/:tenantId/assign
 * Assign existing user to a tenant with a specific role
 * Body:
 *   - role: Tenant role (owner, admin, member, viewer)
 */
router.post('/users/:userId/tenants/:tenantId/assign', async (req, res) => {
  try {
    const { userId, tenantId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role value' });
    }

    // Verify user exists
    const user = await db.prepare(`
      SELECT id FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify tenant exists
    const tenant = await db.prepare(`
      SELECT id FROM tenants WHERE id = ?
    `).get(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Check if user already in tenant
    const existing = await db.prepare(`
      SELECT user_id FROM user_tenants WHERE user_id = ? AND tenant_id = ?
    `).get(userId, tenantId);

    if (existing) {
      return res.status(400).json({ error: 'User already assigned to this tenant' });
    }

    // Add user to tenant
    await db.prepare(`
      INSERT INTO user_tenants (user_id, tenant_id, role, active)
      VALUES (?, ?, ?, 1)
    `).run(userId, tenantId, role);

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: 'admin.user_assign',
      targetType: 'user',
      targetId: userId,
      metadata: {
        tenantId,
        role
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'User assigned to tenant successfully',
      userId,
      tenantId,
      role
    });
  } catch (error) {
    console.error('Error assigning user to tenant:', error);
    res.status(500).json({ error: 'Failed to assign user to tenant' });
  }
});

/**
 * PATCH /api/admin/users/:userId/tenants/:tenantId
 * Update a user's membership role within a tenant
 * Body:
 *   - role: Tenant role (owner, admin, member, viewer)
 */
router.patch('/users/:userId/tenants/:tenantId', async (req, res) => {
  try {
    const { userId, tenantId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role value' });
    }

    // Verify membership exists
    const membership = await db.prepare(`
      SELECT ut.role, ut.active, u.email as user_email, t.name as tenant_name
      FROM user_tenants ut
      INNER JOIN users u ON ut.user_id = u.id
      INNER JOIN tenants t ON ut.tenant_id = t.id
      WHERE ut.user_id = ? AND ut.tenant_id = ?
    `).get(userId, tenantId);

    if (!membership) {
      return res.status(404).json({ error: 'User is not assigned to this tenant' });
    }

    // Prevent leaving a tenant without an owner
    if (membership.role === 'owner' && role !== 'owner') {
      const ownerCount = await db.prepare(`
        SELECT COUNT(*) as count
        FROM user_tenants
        WHERE tenant_id = ? AND role = 'owner' AND active
      `).get(tenantId);

      if (ownerCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot remove last owner from tenant' });
      }
    }

    await db.prepare(`
      UPDATE user_tenants
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tenant_id = ?
    `).run(role, userId, tenantId);

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: 'admin.user_tenant_role_change',
      targetType: 'user',
      targetId: userId,
      metadata: {
        tenantId,
        tenantName: membership.tenant_name,
        email: membership.user_email,
        oldRole: membership.role,
        newRole: role
      },
      ipAddress: req.ip
    });

    res.json({ message: 'Membership updated', userId, tenantId, role });
  } catch (error) {
    console.error('Error updating user tenant membership:', error);
    res.status(500).json({ error: 'Failed to update membership' });
  }
});

/**
 * DELETE /api/admin/users/:userId/tenants/:tenantId
 * Remove a user's membership from a tenant
 */
router.delete('/users/:userId/tenants/:tenantId', async (req, res) => {
  try {
    const { userId, tenantId } = req.params;

    const membership = await db.prepare(`
      SELECT ut.role, u.email as user_email, t.name as tenant_name
      FROM user_tenants ut
      INNER JOIN users u ON ut.user_id = u.id
      INNER JOIN tenants t ON ut.tenant_id = t.id
      WHERE ut.user_id = ? AND ut.tenant_id = ?
    `).get(userId, tenantId);

    if (!membership) {
      return res.status(404).json({ error: 'User is not assigned to this tenant' });
    }

    if (membership.role === 'owner') {
      return res.status(400).json({ error: 'Tenant owners cannot be removed from a tenant' });
    }

    await db.prepare(`
      DELETE FROM user_tenants
      WHERE user_id = ? AND tenant_id = ?
    `).run(userId, tenantId);

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: 'admin.user_unassign',
      targetType: 'user',
      targetId: userId,
      metadata: {
        tenantId,
        tenantName: membership.tenant_name,
        email: membership.user_email,
        role: membership.role
      },
      ipAddress: req.ip
    });

    res.json({ message: 'User removed from tenant', userId, tenantId });
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    res.status(500).json({ error: 'Failed to remove user from tenant' });
  }
});

// ===== AUDIT LOGS =====

/**
 * GET /api/admin/audit-logs
 * View system-wide audit logs with optional filtering
 * Query params:
 *   - tenantId: Filter by tenant
 *   - userId: Filter by actor user ID
 *   - action: Filter by action type
 *   - startDate: Filter by date (ISO format)
 *   - endDate: Filter by date (ISO format)
 *   - limit: Number of results (default 100, max 500)
 *   - offset: Pagination offset (default 0)
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      tenantId,
      userId,
      action,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const limitNum = Math.min(parseInt(limit) || 100, 500);
    const offsetNum = parseInt(offset) || 0;

    let query = `
      SELECT
        al.id,
        al.actor_user_id,
        al.actor_type,
        al.tenant_id,
        al.action,
        al.target_type,
        al.target_id,
        al.metadata,
        al.ip_address,
        al.created_at,
        u.email as actor_email,
        u.name as actor_name,
        t.name as tenant_name
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      LEFT JOIN tenants t ON al.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (tenantId) {
      query += ' AND al.tenant_id = ?';
      params.push(tenantId);
    }

    if (userId) {
      query += ' AND al.actor_user_id = ?';
      params.push(userId);
    }

    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }

    if (startDate) {
      query += ' AND al.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND al.created_at <= ?';
      params.push(endDate);
    }

    query += `
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limitNum, offsetNum);

    const logs = await db.prepare(query).all(...params);

    // Parse metadata JSON for each log
    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : {}
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];

    if (tenantId) {
      countQuery += ' AND tenant_id = ?';
      countParams.push(tenantId);
    }
    if (userId) {
      countQuery += ' AND actor_user_id = ?';
      countParams.push(userId);
    }
    if (action) {
      countQuery += ' AND action = ?';
      countParams.push(action);
    }
    if (startDate) {
      countQuery += ' AND created_at >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND created_at <= ?';
      countParams.push(endDate);
    }

    const { total } = await db.prepare(countQuery).get(...countParams);

    res.json({
      logs: parsedLogs,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics
 * Returns: action counts, date range, actor counts
 */
router.get('/audit-logs/stats', async (req, res) => {
  try {
    // Get action counts
    const actionStats = await db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
    `).all();

    // Get date range
    const dateRange = await db.prepare(`
      SELECT
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM audit_logs
    `).get();

    // Get most active actors
    const actorStats = await db.prepare(`
      SELECT
        actor_user_id,
        u.email,
        COUNT(*) as action_count
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE actor_user_id IS NOT NULL
      GROUP BY actor_user_id, u.email
      ORDER BY action_count DESC
      LIMIT 10
    `).all();

    // Get total stats
    const { total_logs, platform_actions, tenant_actions } = await db.prepare(`
      SELECT
        COUNT(*) as total_logs,
        SUM(CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END) as platform_actions,
        SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END) as tenant_actions
      FROM audit_logs
    `).get();

    res.json({
      summary: {
        total_logs,
        platform_actions,
        tenant_actions,
        dateRange
      },
      actionStats,
      actorStats
    });
  } catch (error) {
    console.error('Error retrieving audit stats:', error);
    res.status(500).json({ error: 'Failed to retrieve audit statistics' });
  }
});

// ===== PLATFORM CONFIGURATION =====

/**
 * GET /api/admin/config
 * Get platform configuration settings
 */
router.get('/config', async (req, res) => {
  try {
    const config = await db.prepare(`
      SELECT key, value, updated_at, updated_by FROM platform_config
      ORDER BY key
    `).all();

    const configObj = {};
    config.forEach(item => {
      try {
        configObj[item.key] = JSON.parse(item.value);
      } catch {
        configObj[item.key] = item.value;
      }
    });

    res.json(configObj);
  } catch (error) {
    console.error('Error retrieving config:', error);
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

/**
 * PATCH /api/admin/config/:key
 * Update a platform configuration setting
 * Body:
 *   - value: New configuration value
 */
router.patch('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Upsert configuration
    await db.prepare(`
      INSERT INTO platform_config (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=?, updated_by=?, updated_at=CURRENT_TIMESTAMP
    `).run(key, JSON.stringify(value), req.session.userId, JSON.stringify(value), req.session.userId);

    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'platform_user',
      tenantId: null,
      action: 'config.update',
      targetType: 'config',
      targetId: key,
      metadata: { key, value },
      ipAddress: req.ip
    });

    res.json({
      message: 'Configuration updated',
      key,
      value
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// ===== PLATFORM STATISTICS =====

/**
 * GET /api/admin/stats
 * Get platform-wide statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      tenants: (await db.prepare('SELECT COUNT(*) as count FROM tenants').get()).count,
      active_tenants: (await db.prepare(`SELECT COUNT(*) as count FROM tenants WHERE status = 'active'`).get()).count,
      users: (await db.prepare('SELECT COUNT(*) as count FROM users').get()).count,
      active_users: (await db.prepare('SELECT COUNT(*) as count FROM users WHERE active').get()).count,
      platform_admins: (await db.prepare('SELECT COUNT(*) as count FROM users WHERE role_global = ?').get('platform_admin')).count,
      campaigns: (await db.prepare('SELECT COUNT(*) as count FROM campaigns').get()).count,
      contacts: (await db.prepare('SELECT COUNT(*) as count FROM contacts').get()).count,
      audit_logs: (await db.prepare('SELECT COUNT(*) as count FROM audit_logs').get()).count,
      whatsapp_messages_sent: (await db.prepare('SELECT COALESCE(SUM(whatsapp_messages_sent), 0) as total FROM usage_counters').get()).total || 0,
      email_messages_sent: (await db.prepare('SELECT COALESCE(SUM(email_messages_sent), 0) as total FROM usage_counters').get()).total || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error retrieving stats:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

module.exports = router;
