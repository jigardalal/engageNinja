const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireMember, requireAdmin } = require('../middleware/rbac');

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const validateTenantAccess = (req, res, next) => {
  const tenantId = req.session?.activeTenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'No active tenant selected' });
  }
  req.tenantId = tenantId;
  next();
};

// GET current tenant profile
router.get('/profile', requireAuth, validateTenantAccess, requireMember, async (req, res) => {
  try {
    const tenant = await db.prepare(`
      SELECT id, name, plan_id, legal_name, address_line1, address_line2, city, state, postal_code, country, timezone, billing_email, support_email
      FROM tenants WHERE id = ?
    `).get(req.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ tenant });
  } catch (error) {
    console.error('Error fetching tenant profile:', error);
    res.status(500).json({ error: 'Failed to load tenant profile' });
  }
});

// PATCH current tenant profile (admin/owner)
router.patch('/profile', requireAuth, validateTenantAccess, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      plan_id,
      planId,
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
    } = req.body;

    const updates = [];
    const params = [];

    const selectedPlan = plan_id || planId;

    if (selectedPlan) {
      const planExists = await db.prepare('SELECT 1 FROM plans WHERE id = ?').get(selectedPlan);
      if (!planExists) {
        return res.status(400).json({ error: 'Invalid plan' });
      }
    }

    const requiresFullProfile = selectedPlan && selectedPlan !== 'free';
    if (requiresFullProfile) {
      const requiredFields = {
        legal_name,
        billing_email,
        support_email,
        address_line1,
        city,
        state,
        postal_code,
        country,
        timezone
      };
      const missingField = Object.entries(requiredFields).find(
        ([, val]) => val === undefined || val === null || `${val}`.trim() === ''
      );
      if (missingField) {
        return res.status(400).json({ error: 'All profile details are required for paid plans' });
      }
    }

    const fields = {
      name,
      plan_id: selectedPlan,
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
        if (key === 'name' && (!val || !val.trim())) {
          return res.status(400).json({ error: 'Name cannot be empty' });
        }
        updates.push(`${key} = ?`);
        params.push(val || null);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.tenantId);

    await db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = await db.prepare(`
      SELECT id, name, plan_id, legal_name, address_line1, address_line2, city, state, postal_code, country, timezone, billing_email, support_email
      FROM tenants WHERE id = ?
    `).get(req.tenantId);

    res.json({ tenant: updated });
  } catch (error) {
    console.error('Error updating tenant profile:', error);
    res.status(500).json({ error: 'Failed to update tenant profile' });
  }
});

module.exports = router;
