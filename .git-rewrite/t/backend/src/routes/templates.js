/**
 * Templates Routes
 * Handles WhatsApp template management
 * - Syncing templates from Meta
 * - Listing cached templates
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const whatsappService = require('../services/whatsapp');
const crypto = require('crypto');

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

// Validate tenant access (ensure user has access to tenant)
const validateTenantAccess = (req, res, next) => {
  const tenantId = req.session.activeTenantId;

  if (!tenantId) {
    return res.status(400).json({
      error: 'Missing tenant',
      message: 'Tenant ID is required',
      status: 'error'
    });
  }

  // Check if user has access to this tenant
  const userTenant = db.prepare(`
    SELECT ut.tenant_id FROM user_tenants ut
    WHERE ut.user_id = ? AND ut.tenant_id = ?
  `).get(req.session.userId, tenantId);

  if (!userTenant) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this tenant',
      status: 'error'
    });
  }

  req.tenantId = tenantId;
  next();
};

// ===== HELPER FUNCTIONS =====

/**
 * Decrypt encrypted credentials
 * @param {string} encrypted - Encrypted credential string
 * @returns {Object} Decrypted credential object
 */
function decryptCredentials(encrypted) {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    // For MVP, we'll parse JSON directly (in production, implement proper decryption)
    if (typeof encrypted === 'string' && encrypted.startsWith('{')) {
      return JSON.parse(encrypted);
    }
    return JSON.parse(encrypted);
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    throw new Error('Failed to decrypt credentials');
  }
}

// ===== ROUTES =====

/**
 * POST /templates/sync
 * Sync WhatsApp templates from Meta API
 * Fetches approved templates and stores them in database
 */
router.post('/sync', requireAuth, validateTenantAccess, async (req, res) => {
  try {
    // Get WhatsApp channel settings for this tenant
    const settings = db.prepare(`
      SELECT * FROM tenant_channel_settings
      WHERE tenant_id = ? AND channel = 'whatsapp' AND is_connected = 1
    `).get(req.tenantId);

    if (!settings) {
      return res.status(400).json({
        error: 'Not Configured',
        message: 'WhatsApp channel is not configured. Please configure it in Settings first.',
        status: 'error'
      });
    }

    // Decrypt credentials
    let credentials;
    try {
      credentials = decryptCredentials(settings.credentials_encrypted);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid Credentials',
        message: 'Failed to decrypt WhatsApp credentials',
        status: 'error'
      });
    }

    if (!credentials.phone_number_id || !credentials.access_token) {
      return res.status(400).json({
        error: 'Invalid Credentials',
        message: 'WhatsApp credentials are incomplete',
        status: 'error'
      });
    }

    // Fetch templates from Meta
    let templates;
    try {
      templates = await whatsappService.fetchTemplatesFromMeta(
        credentials.phone_number_id,
        credentials.access_token
      );
    } catch (error) {
      console.error('Error fetching templates from Meta:', error);
      return res.status(400).json({
        error: 'Sync Failed',
        message: error.message,
        status: 'error'
      });
    }

    if (!templates || templates.length === 0) {
      return res.json({
        data: [],
        status: 'success',
        message: 'No templates found. Create templates in Meta Business Suite first.'
      });
    }

    // Store templates in database
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO whatsapp_templates (
        id, tenant_id, name, status, variable_count, body_template,
        synced_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const template of templates) {
      insertStmt.run(
        uuidv4(),
        req.tenantId,
        template.name,
        template.status,
        template.variables.length,
        template.body_template,
        now,
        now
      );
    }

    return res.json({
      data: {
        synced_count: templates.length,
        templates: templates.map(t => ({
          name: t.name,
          status: t.status,
          variables: t.variables
        }))
      },
      status: 'success',
      message: `Synced ${templates.length} templates from Meta`
    });

  } catch (error) {
    console.error('Error syncing templates:', error);
    return res.status(500).json({
      error: 'Sync Error',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /templates
 * List all cached templates for current tenant
 */
router.get('/', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT id, name, status, variable_count, body_template, synced_at
      FROM whatsapp_templates
      WHERE tenant_id = ?
      ORDER BY name ASC
    `).all(req.tenantId);

    return res.json({
      data: templates.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        variable_count: t.variable_count,
        variables: extractVariablesFromTemplate(t.body_template),
        body: t.body_template,
        synced_at: t.synced_at
      })),
      status: 'success'
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({
      error: 'Failed to fetch templates',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /templates/:id
 * Get a specific template by ID
 */
router.get('/:id', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const template = db.prepare(`
      SELECT *
      FROM whatsapp_templates
      WHERE id = ? AND tenant_id = ?
    `).get(req.params.id, req.tenantId);

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found',
        status: 'error'
      });
    }

    return res.json({
      data: {
        id: template.id,
        name: template.name,
        status: template.status,
        variable_count: template.variable_count,
        variables: extractVariablesFromTemplate(template.body_template),
        body: template.body_template,
        synced_at: template.synced_at
      },
      status: 'success'
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    return res.status(500).json({
      error: 'Failed to fetch template',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * Helper function to extract variables from template body
 * @param {string} body - Template body text
 * @returns {Array<string>} Array of variable names
 */
function extractVariablesFromTemplate(body) {
  if (!body) return [];
  const matches = body.match(/\{\{(\w+)\}\}/g) || [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
}

module.exports = router;
