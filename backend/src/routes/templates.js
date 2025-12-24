/**
 * Templates Routes
 * Handles WhatsApp template management
 * - Syncing templates from Meta
 * - Creating new templates
 * - Listing templates with filtering
 * - Deleting templates
 * - Versioning approved templates
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const whatsappService = require('../services/whatsapp');
const crypto = require('crypto');
const { requireAdmin } = require('../middleware/rbac');
const { logAudit, AUDIT_ACTIONS } = require('../utils/audit');

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
 */
function decryptCredentials(encrypted) {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    throw new Error('Failed to decrypt credentials');
  }
}

function normalizeWhatsAppCredentials(creds = {}) {
  return {
    access_token: creds.access_token || creds.accessToken || '',
    phone_number_id: creds.phone_number_id || creds.phoneNumberId || '',
    business_account_id: creds.business_account_id || creds.businessAccountId || null
  };
}

function ensureTemplateColumns() {
  const columnsToAdd = [
    ['header_type', 'TEXT'],
    ['header_text', 'TEXT'],
    ['footer_text', 'TEXT'],
    ['buttons_json', 'TEXT'],
    ['body_variables', 'TEXT'],
    ['header_variables', 'TEXT']
  ];
  columnsToAdd.forEach(([name, type]) => {
    try {
      db.prepare(`ALTER TABLE whatsapp_templates ADD COLUMN ${name} ${type}`).run();
    } catch (e) {
      // Column already exists - ignore
    }
  });
}

/**
 * Extract variables from template text
 */
function extractVariablesFromTemplate(body) {
  if (!body) return [];
  const matches = body.match(/\{\{(\d+)\}\}/g) || [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
}

/**
 * Build template response object
 */
function buildTemplateResponse(template) {
  let componentsSchema = null;
  if (template.components_schema) {
    try {
      componentsSchema = JSON.parse(template.components_schema);
    } catch (e) {
      console.warn('Failed to parse components_schema for template', template.id);
    }
  }

  const bodyVars = componentsSchema?.BODY?.example?.body_text?.[0] ||
    (template.body_variables ? JSON.parse(template.body_variables) :
      extractVariablesFromTemplate(template.body_template));

  const headerVars = componentsSchema?.HEADER?.example?.header_text ||
    (template.header_variables ? JSON.parse(template.header_variables) :
      extractVariablesFromTemplate(template.header_text));

  let buttonVars = [];
  const buttons = componentsSchema?.BUTTONS?.buttons ||
    (template.buttons_json ? JSON.parse(template.buttons_json) : []);

  buttons.forEach(btn => {
    if (btn.type === 'URL' && typeof btn.url === 'string') {
      const matches = btn.url.match(/\{\{(\w+)\}\}/g);
      if (matches) {
        matches.forEach(m => buttonVars.push(m.replace(/\{\{|\}\}/g, '')));
      }
    }
  });

  const variables = Array.from(new Set([
    ...(bodyVars || []),
    ...(headerVars || []),
    ...(buttonVars || [])
  ]));

  return {
    id: template.id,
    meta_template_id: template.meta_template_id,
    name: template.name,
    status: template.status,
    language: template.language || 'en',
    category: template.category || 'MARKETING',
    waba_id: template.waba_id,
    variable_count: template.variable_count,
    variables,
    body_variables: bodyVars,
    header_variables: headerVars,
    button_variables: buttonVars,
    body: template.body_template,
    header_type: template.header_type,
    header_text: template.header_text,
    footer_text: template.footer_text,
    buttons,
    components_schema: componentsSchema,
    is_versioned_from: template.is_versioned_from,
    synced_at: template.synced_at,
    created_at: template.created_at,
    updated_at: template.updated_at
  };
}

/**
 * Generate versioned template name (e.g., order_update_v2)
 */
function generateVersionedName(tenantId, baseName) {
  // Remove existing version suffix if present
  const cleanName = baseName.replace(/_v\d+$/, '');

  // Find highest version number
  const templates = db.prepare(`
    SELECT name FROM whatsapp_templates
    WHERE tenant_id = ? AND name LIKE ?
  `).all(tenantId, `${cleanName}%`);

  let maxVersion = 1;
  templates.forEach(t => {
    const match = t.name.match(/_v(\d+)$/);
    if (match) {
      const version = parseInt(match[1], 10);
      if (version >= maxVersion) {
        maxVersion = version + 1;
      }
    }
  });

  return `${cleanName}_v${maxVersion}`;
}

// ===== ROUTES =====

/**
 * POST /templates/sync
 * Sync WhatsApp templates from Meta API
 */
router.post('/sync', requireAuth, validateTenantAccess, requireAdmin, async (req, res) => {
  try {
    ensureTemplateColumns();

    // Get WhatsApp channel settings
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
      credentials = normalizeWhatsAppCredentials(
        decryptCredentials(settings.credentials_encrypted)
      );
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
      if (!credentials.business_account_id) {
        return res.status(400).json({
          error: 'Missing Business Account ID',
          message: 'Add your WhatsApp Business Account ID in Settings to sync templates.',
          status: 'error'
        });
      }

      const resourceId = credentials.business_account_id;
      templates = await whatsappService.fetchTemplatesFromMeta(
        resourceId,
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

    // Store templates in database with new columns
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO whatsapp_templates (
        id, tenant_id, waba_id, meta_template_id, name, status, language, category,
        variable_count, body_template, header_type, header_text, footer_text, buttons_json,
        body_variables, header_variables, components_schema,
        synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const template of templates) {
      insertStmt.run(
        template.id,
        req.tenantId,
        credentials.business_account_id, // waba_id
        template.meta_template_id || template.id,
        template.name,
        template.status,
        template.language || 'en',
        template.category || 'MARKETING',
        template.variables.length,
        template.body_template,
        template.header_type,
        template.header_text,
        template.footer_text,
        template.buttons ? JSON.stringify(template.buttons) : null,
        template.body_variables ? JSON.stringify(template.body_variables) : null,
        template.header_variables ? JSON.stringify(template.header_variables) : null,
        null, // components_schema will be built by migrator
        now,
        now,
        now
      );
    }

    return res.json({
      synced_count: templates.length,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        language: t.language,
        category: t.category,
        variables: t.variables
      })),
      status: 'success',
      message: `Synced ${templates.length} templates from Meta`
    });

    // Log audit event
    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: AUDIT_ACTIONS.TEMPLATE_SYNC,
      targetType: 'templates',
      targetId: `batch-${Date.now()}`,
      metadata: {
        count: templates.length
      },
      ipAddress: req.ip
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
 * List all cached templates with filtering
 */
router.get('/', requireAuth, validateTenantAccess, (req, res) => {
  try {
    ensureTemplateColumns();

    const { status, language, category } = req.query;

    let query = `
      SELECT id, name, status, language, category, variable_count,
             body_template, header_type, header_text, footer_text,
             buttons_json, body_variables, header_variables,
             components_schema, waba_id, meta_template_id,
             is_versioned_from, synced_at, created_at, updated_at
      FROM whatsapp_templates
      WHERE tenant_id = ?
    `;

    const params = [req.tenantId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (language) {
      query += ` AND language = ?`;
      params.push(language);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC`;

    const templates = db.prepare(query).all(...params);
    const mappedTemplates = templates.map(buildTemplateResponse);

    return res.json({
      templates: mappedTemplates,
      data: mappedTemplates,
      filters: {
        status: status || null,
        language: language || null,
        category: category || null
      },
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
      SELECT * FROM whatsapp_templates
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
      data: buildTemplateResponse(template),
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
 * POST /templates
 * Create a new WhatsApp template
 */
router.post('/', requireAuth, validateTenantAccess, requireAdmin, async (req, res) => {
  try {
    const { name, language, category, components } = req.body;

    // Validate input
    if (!name || !components) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Template name and components are required',
        status: 'error'
      });
    }

    // Validate template name format (lowercase alphanumeric and underscores)
    if (!/^[a-z0-9_]+$/.test(name)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Template name must be lowercase alphanumeric with underscores only',
        status: 'error'
      });
    }

    // Check for duplicate template name in this tenant
    const existingTemplate = db.prepare(`
      SELECT id FROM whatsapp_templates
      WHERE tenant_id = ? AND name = ?
    `).get(req.tenantId, name);

    if (existingTemplate) {
      return res.status(400).json({
        error: 'Duplicate Template',
        message: 'A template with this name already exists',
        status: 'error'
      });
    }

    // Get WhatsApp channel settings
    const settings = db.prepare(`
      SELECT * FROM tenant_channel_settings
      WHERE tenant_id = ? AND channel = 'whatsapp' AND is_connected = 1
    `).get(req.tenantId);

    if (!settings) {
      return res.status(400).json({
        error: 'Not Configured',
        message: 'WhatsApp channel is not configured',
        status: 'error'
      });
    }

    // Decrypt credentials
    const credentials = normalizeWhatsAppCredentials(
      decryptCredentials(settings.credentials_encrypted)
    );

    if (!credentials.business_account_id || !credentials.access_token) {
      return res.status(400).json({
        error: 'Invalid Credentials',
        message: 'WhatsApp Business Account ID is required',
        status: 'error'
      });
    }

    // Create template in Meta
    let metaResponse;
    try {
      metaResponse = await whatsappService.createTemplateInMeta(
        credentials.business_account_id,
        credentials.access_token,
        {
          name,
          language: language || 'en',
          category: category || 'MARKETING',
          components
        }
      );
    } catch (error) {
      console.error('Error creating template in Meta:', error);
      return res.status(400).json({
        error: 'Creation Failed',
        message: error.message,
        status: 'error'
      });
    }

    // Store template locally
    const now = new Date().toISOString();
    const templateId = crypto.randomUUID();

    // Extract components for backward compatibility
    const bodyTemplate = components.BODY?.text || '';
    const headerType = components.HEADER?.format || components.HEADER?.type || null;
    const headerText = components.HEADER?.text || null;
    const footerText = components.FOOTER?.text || null;
    const buttons = components.BUTTONS?.buttons || [];

    const bodyVars = extractVariablesFromTemplate(bodyTemplate);
    const headerVars = headerText ? extractVariablesFromTemplate(headerText) : [];

    db.prepare(`
      INSERT INTO whatsapp_templates (
        id, tenant_id, waba_id, meta_template_id, name, status,
        language, category, variable_count, body_template,
        header_type, header_text, footer_text, buttons_json,
        body_variables, header_variables, components_schema,
        synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      req.tenantId,
      credentials.business_account_id,
      metaResponse.id,
      name,
      metaResponse.status || 'PENDING',
      language || 'en',
      category || 'MARKETING',
      bodyVars.length + headerVars.length,
      bodyTemplate,
      headerType,
      headerText,
      footerText,
      buttons.length > 0 ? JSON.stringify(buttons) : null,
      bodyVars.length > 0 ? JSON.stringify(bodyVars) : null,
      headerVars.length > 0 ? JSON.stringify(headerVars) : null,
      JSON.stringify(components),
      now,
      now,
      now
    );

    return res.status(201).json({
      id: templateId,
      meta_template_id: metaResponse.id,
      name,
      status: metaResponse.status || 'PENDING',
      language: language || 'en',
      category: category || 'MARKETING',
      message: 'Template created successfully. Awaiting Meta approval.',
      status_code: 'success'
    });

  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({
      error: 'Creation Error',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * DELETE /templates/:id
 * Delete a WhatsApp template
 */
router.delete('/:id', requireAuth, validateTenantAccess, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get template
    const template = db.prepare(`
      SELECT * FROM whatsapp_templates
      WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found',
        status: 'error'
      });
    }

    // Get WhatsApp channel settings
    const settings = db.prepare(`
      SELECT * FROM tenant_channel_settings
      WHERE tenant_id = ? AND channel = 'whatsapp' AND is_connected = 1
    `).get(req.tenantId);

    if (!settings) {
      return res.status(400).json({
        error: 'Not Configured',
        message: 'WhatsApp channel is not configured',
        status: 'error'
      });
    }

    // Decrypt credentials
    const credentials = normalizeWhatsAppCredentials(
      decryptCredentials(settings.credentials_encrypted)
    );

    // Delete from Meta
    try {
      await whatsappService.deleteTemplateFromMeta(
        credentials.business_account_id,
        template.name,
        credentials.access_token
      );
    } catch (error) {
      console.error('Error deleting template from Meta:', error);
      return res.status(400).json({
        error: 'Deletion Failed',
        message: error.message,
        status: 'error'
      });
    }

    // Delete from local database
    db.prepare(`DELETE FROM whatsapp_templates WHERE id = ?`).run(id);

    return res.json({
      message: 'Template deleted successfully',
      status: 'success'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({
      error: 'Deletion Error',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /templates/:id/duplicate
 * Create a new version of an approved template (versioning)
 */
router.post('/:id/duplicate', requireAuth, validateTenantAccess, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    let { newName } = req.body;

    // Get original template
    const template = db.prepare(`
      SELECT * FROM whatsapp_templates
      WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!template) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found',
        status: 'error'
      });
    }

    // Only allow versioning of approved templates
    if (template.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Only approved templates can be versioned',
        status: 'error'
      });
    }

    // Auto-generate new template name if not provided
    if (!newName) {
      newName = generateVersionedName(req.tenantId, template.name);
    }

    // Validate new name
    if (!/^[a-z0-9_]+$/.test(newName)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Template name must be lowercase alphanumeric with underscores only',
        status: 'error'
      });
    }

    // Check for duplicate
    const existing = db.prepare(`
      SELECT id FROM whatsapp_templates
      WHERE tenant_id = ? AND name = ?
    `).get(req.tenantId, newName);

    if (existing) {
      return res.status(400).json({
        error: 'Duplicate Template',
        message: 'A template with this name already exists',
        status: 'error'
      });
    }

    // Create duplicate
    const now = new Date().toISOString();
    const newTemplateId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO whatsapp_templates (
        id, tenant_id, waba_id, name, status, language, category,
        variable_count, body_template, header_type, header_text,
        footer_text, buttons_json, body_variables, header_variables,
        components_schema, is_versioned_from, synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newTemplateId,
      req.tenantId,
      template.waba_id,
      newName,
      template.language,
      template.category,
      template.variable_count,
      template.body_template,
      template.header_type,
      template.header_text,
      template.footer_text,
      template.buttons_json,
      template.body_variables,
      template.header_variables,
      template.components_schema,
      template.id, // Link to parent
      null, // Not synced yet
      now,
      now
    );

    return res.status(201).json({
      id: newTemplateId,
      name: newName,
      status: 'draft',
      is_versioned_from: template.id,
      original_template: {
        id: template.id,
        name: template.name
      },
      message: 'Template duplicated successfully. Edit and resubmit for approval.',
      status_code: 'success'
    });

  } catch (error) {
    console.error('Error duplicating template:', error);
    return res.status(500).json({
      error: 'Duplication Error',
      message: error.message,
      status: 'error'
    });
  }
});

module.exports = router;
