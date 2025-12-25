/**
 * Contacts Routes
 * Handles contact management (list, create, read, update, delete, search, filter)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { requireMember, requireAdmin } = require('../middleware/rbac');
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
  const tenantId = req.session.activeTenantId || req.body.tenant_id || req.query.tenant_id;

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

// ===== ROUTES =====

/**
 * GET /contacts
 * List all contacts for current tenant with optional search and filtering
 */
router.get('/', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { search, tag, limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 50, 500); // Max 500 per request
    const parsedOffset = parseInt(offset) || 0;

    let query = `
      SELECT
        c.id,
        c.phone,
        c.email,
        c.name,
        c.consent_whatsapp,
        c.consent_email,
        c.created_at,
        STRING_AGG(t.name, ', ') as tags
      FROM contacts c
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.tenant_id = ?
    `;

    let params = [req.tenantId];

    // Search by name or phone
    if (search && search.trim()) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Filter by tag
    if (tag && tag.trim()) {
      query += ` AND t.name = ?`;
      params.push(tag.trim());
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parsedLimit, parsedOffset);

    const contacts = db.prepare(query).all(...params);

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT c.id) as count FROM contacts c`;
    let countParams = [req.tenantId];

    if (search && search.trim()) {
      countQuery += ` WHERE c.tenant_id = ? AND (c.name LIKE ? OR c.phone LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      countParams = [req.tenantId, searchTerm, searchTerm];
    } else if (tag && tag.trim()) {
      countQuery += `
        LEFT JOIN contact_tags ct ON c.id = ct.contact_id
        LEFT JOIN tags t ON ct.tag_id = t.id
        WHERE c.tenant_id = ? AND t.name = ?
      `;
      countParams = [req.tenantId, tag.trim()];
    } else {
      countQuery += ` WHERE c.tenant_id = ?`;
      countParams = [req.tenantId];
    }

    const { count } = db.prepare(countQuery).get(...countParams);

    // Parse tags into arrays
    const formattedContacts = contacts.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      consent_whatsapp: Boolean(c.consent_whatsapp),
      consent_email: Boolean(c.consent_email),
      tags: c.tags ? c.tags.split(', ').filter(t => t) : [],
      created_at: c.created_at
    }));

    res.status(200).json({
      contacts: formattedContacts,
      pagination: {
        total: count,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + parsedLimit < count
      },
      status: 'success'
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      error: 'Failed to fetch contacts',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /contacts/bulk/tags
 * Add tags to multiple contacts
 */
router.post('/bulk/tags', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { contact_ids = [], tag_ids = [] } = req.body || {};

    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contact_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'tag_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (contact_ids.length > 500) {
      return res.status(400).json({
        error: 'Too Many Contacts',
        message: 'Limit bulk operations to 500 contacts at a time',
        status: 'error'
      });
    }

    const tagPlaceholders = tag_ids.map(() => '?').join(',');
    const validTags = db.prepare(
      `SELECT id FROM tags WHERE tenant_id = ? AND status = 'active' AND id IN (${tagPlaceholders})`
    ).all(req.tenantId, ...tag_ids);

    if (validTags.length === 0) {
      return res.status(400).json({
        error: 'Invalid Tags',
        message: 'No valid tags found for this tenant',
        status: 'error'
      });
    }

    const contactPlaceholders = contact_ids.map(() => '?').join(',');
    const validContacts = db.prepare(
      `SELECT id FROM contacts WHERE tenant_id = ? AND id IN (${contactPlaceholders})`
    ).all(req.tenantId, ...contact_ids);

    if (validContacts.length === 0) {
      return res.status(400).json({
        error: 'Invalid Contacts',
        message: 'No valid contacts found for this tenant',
        status: 'error'
      });
    }

    const insertContactTag = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?) ON CONFLICT (contact_id, tag_id) DO NOTHING');
    const addTagsTransaction = db.transaction((contactIds, tags) => {
      for (const contact of contactIds) {
        for (const tag of tags) {
          insertContactTag.run(contact.id, tag.id);
        }
      }
    });

    addTagsTransaction(validContacts, validTags);

    return res.json({
      status: 'success',
      message: `Added ${validTags.length} tag(s) to ${validContacts.length} contact(s)`
    });
  } catch (error) {
    console.error('Bulk add tags error:', error);
    return res.status(500).json({
      error: 'Failed to add tags to contacts',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /contacts/bulk/delete
 * Delete multiple contacts
 */
router.post('/bulk/delete', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { contact_ids = [] } = req.body || {};

    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contact_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (contact_ids.length > 500) {
      return res.status(400).json({
        error: 'Too Many Contacts',
        message: 'Limit bulk delete to 500 contacts at a time',
        status: 'error'
      });
    }

    const contactPlaceholders = contact_ids.map(() => '?').join(',');
    const validContacts = db.prepare(
      `SELECT id FROM contacts WHERE tenant_id = ? AND id IN (${contactPlaceholders})`
    ).all(req.tenantId, ...contact_ids);

    if (validContacts.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No matching contacts found',
        status: 'error'
      });
    }

    const deleteTransaction = db.transaction((ids) => {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM contact_tags WHERE contact_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM messages WHERE contact_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM contacts WHERE id IN (${placeholders}) AND tenant_id = ?`).run(...ids, req.tenantId);
    });

    deleteTransaction(validContacts.map(c => c.id));

    return res.json({
      status: 'success',
      message: `Deleted ${validContacts.length} contact(s)`
    });
  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    return res.status(500).json({
      error: 'Failed to delete contacts',
      message: error.message,
      status: 'error'
    });
  }
});
/**
 * POST /contacts/bulk/tags
 * Add tags to multiple contacts
 */
router.post('/bulk/tags', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { contact_ids = [], tag_ids = [] } = req.body || {};

    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contact_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'tag_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (contact_ids.length > 500) {
      return res.status(400).json({
        error: 'Too Many Contacts',
        message: 'Limit bulk operations to 500 contacts at a time',
        status: 'error'
      });
    }

    const tagPlaceholders = tag_ids.map(() => '?').join(',');
    const validTags = db.prepare(
      `SELECT id FROM tags WHERE tenant_id = ? AND status = 'active' AND id IN (${tagPlaceholders})`
    ).all(req.tenantId, ...tag_ids);

    if (validTags.length === 0) {
      return res.status(400).json({
        error: 'Invalid Tags',
        message: 'No valid tags found for this tenant',
        status: 'error'
      });
    }

    const contactPlaceholders = contact_ids.map(() => '?').join(',');
    const validContacts = db.prepare(
      `SELECT id FROM contacts WHERE tenant_id = ? AND id IN (${contactPlaceholders})`
    ).all(req.tenantId, ...contact_ids);

    if (validContacts.length === 0) {
      return res.status(400).json({
        error: 'Invalid Contacts',
        message: 'No valid contacts found for this tenant',
        status: 'error'
      });
    }

    const insertContactTag = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?) ON CONFLICT (contact_id, tag_id) DO NOTHING');
    const addTagsTransaction = db.transaction((contactIds, tags) => {
      for (const contact of contactIds) {
        for (const tag of tags) {
          insertContactTag.run(contact.id, tag.id);
        }
      }
    });

    addTagsTransaction(validContacts, validTags);

    return res.json({
      status: 'success',
      message: `Added ${validTags.length} tag(s) to ${validContacts.length} contact(s)`
    });
  } catch (error) {
    console.error('Bulk add tags error:', error);
    return res.status(500).json({
      error: 'Failed to add tags to contacts',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /contacts/bulk/delete
 * Delete multiple contacts
 */
router.post('/bulk/delete', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { contact_ids = [] } = req.body || {};

    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contact_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (contact_ids.length > 500) {
      return res.status(400).json({
        error: 'Too Many Contacts',
        message: 'Limit bulk delete to 500 contacts at a time',
        status: 'error'
      });
    }

    const contactPlaceholders = contact_ids.map(() => '?').join(',');
    const validContacts = db.prepare(
      `SELECT id FROM contacts WHERE tenant_id = ? AND id IN (${contactPlaceholders})`
    ).all(req.tenantId, ...contact_ids);

    if (validContacts.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No matching contacts found',
        status: 'error'
      });
    }

    const deleteTransaction = db.transaction((ids) => {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM contact_tags WHERE contact_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM messages WHERE contact_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM contacts WHERE id IN (${placeholders}) AND tenant_id = ?`).run(...ids, req.tenantId);
    });

    deleteTransaction(validContacts.map(c => c.id));

    return res.json({
      status: 'success',
      message: `Deleted ${validContacts.length} contact(s)`
    });
  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    return res.status(500).json({
      error: 'Failed to delete contacts',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /contacts
 * Create a new contact
 */
router.post('/', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { name, phone, email, consent_whatsapp = false, consent_email = false, tags = [] } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Name and phone are required',
        status: 'error'
      });
    }

    // Check if phone already exists for this tenant
    const existing = db.prepare(
      'SELECT id FROM contacts WHERE tenant_id = ? AND phone = ?'
    ).get(req.tenantId, phone);

    if (existing) {
      return res.status(400).json({
        error: 'Phone already exists',
        message: 'This phone number already exists for this tenant',
        status: 'error'
      });
    }

    // Create contact
    const contactId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO contacts
      (id, tenant_id, name, phone, email, consent_whatsapp, consent_email, consent_source, consent_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?)
    `).run(
      contactId,
      req.tenantId,
      name,
      phone,
      email || null,
      consent_whatsapp ? 1 : 0,
      consent_email ? 1 : 0,
      now,
      now,
      now
    );

    // Add tags
    const insertContactTag = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)');
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        // Verify tag belongs to this tenant
        const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND tenant_id = ? AND status = \'active\'').get(tagId, req.tenantId);
        if (tag) {
          insertContactTag.run(contactId, tagId);
        }
      }
    }

    res.status(201).json({
      contact_id: contactId,
      name,
      phone,
      email,
      message: 'Contact created successfully',
      status: 'success'
    });

  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      error: 'Failed to create contact',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /contacts/bulk/tags
 * Add tags to multiple contacts
 */
router.post('/bulk/tags', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { contact_ids = [], tag_ids = [] } = req.body || {};

    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contact_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'tag_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (contact_ids.length > 500) {
      return res.status(400).json({
        error: 'Too Many Contacts',
        message: 'Limit bulk operations to 500 contacts at a time',
        status: 'error'
      });
    }

    const tagPlaceholders = tag_ids.map(() => '?').join(',');
    const validTags = db.prepare(
      `SELECT id FROM tags WHERE tenant_id = ? AND status = 'active' AND id IN (${tagPlaceholders})`
    ).all(req.tenantId, ...tag_ids);

    if (validTags.length === 0) {
      return res.status(400).json({
        error: 'Invalid Tags',
        message: 'No valid tags found for this tenant',
        status: 'error'
      });
    }

    const contactPlaceholders = contact_ids.map(() => '?').join(',');
    const validContacts = db.prepare(
      `SELECT id FROM contacts WHERE tenant_id = ? AND id IN (${contactPlaceholders})`
    ).all(req.tenantId, ...contact_ids);

    if (validContacts.length === 0) {
      return res.status(400).json({
        error: 'Invalid Contacts',
        message: 'No valid contacts found for this tenant',
        status: 'error'
      });
    }

    const insertContactTag = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?) ON CONFLICT (contact_id, tag_id) DO NOTHING');
    const addTagsTransaction = db.transaction((contactIds, tags) => {
      for (const contact of contactIds) {
        for (const tag of tags) {
          insertContactTag.run(contact.id, tag.id);
        }
      }
    });

    addTagsTransaction(validContacts, validTags);

    return res.json({
      status: 'success',
      message: `Added ${validTags.length} tag(s) to ${validContacts.length} contact(s)`
    });
  } catch (error) {
    console.error('Bulk add tags error:', error);
    return res.status(500).json({
      error: 'Failed to add tags to contacts',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /contacts/bulk/delete
 * Delete multiple contacts
 */
router.post('/bulk/delete', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { contact_ids = [] } = req.body || {};

    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contact_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (contact_ids.length > 500) {
      return res.status(400).json({
        error: 'Too Many Contacts',
        message: 'Limit bulk delete to 500 contacts at a time',
        status: 'error'
      });
    }

    const contactPlaceholders = contact_ids.map(() => '?').join(',');
    const validContacts = db.prepare(
      `SELECT id FROM contacts WHERE tenant_id = ? AND id IN (${contactPlaceholders})`
    ).all(req.tenantId, ...contact_ids);

    if (validContacts.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No matching contacts found',
        status: 'error'
      });
    }

    const deleteTransaction = db.transaction((ids) => {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM contact_tags WHERE contact_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM messages WHERE contact_id IN (${placeholders})`).run(...ids);
      db.prepare(`DELETE FROM contacts WHERE id IN (${placeholders}) AND tenant_id = ?`).run(...ids, req.tenantId);
    });

    deleteTransaction(validContacts.map(c => c.id));

    return res.json({
      status: 'success',
      message: `Deleted ${validContacts.length} contact(s)`
    });
  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    return res.status(500).json({
      error: 'Failed to delete contacts',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /contacts/:id
 * Get a single contact by ID
 */
router.get('/:id', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;

    const contact = db.prepare(`
      SELECT
        c.id,
        c.phone,
        c.email,
        c.name,
        c.consent_whatsapp,
        c.consent_email,
        c.consent_source,
        c.consent_updated_at,
        c.created_at,
        c.updated_at
      FROM contacts c
      WHERE c.id = ? AND c.tenant_id = ?
    `).get(id, req.tenantId);

    if (!contact) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Contact not found',
        status: 'error'
      });
    }

    // Get tags
    const tags = db.prepare(`
      SELECT t.id, t.name FROM tags t
      JOIN contact_tags ct ON t.id = ct.tag_id
      WHERE ct.contact_id = ?
    `).all(id);

    res.status(200).json({
      contact: {
        ...contact,
        consent_whatsapp: Boolean(contact.consent_whatsapp),
        consent_email: Boolean(contact.consent_email),
        tags: tags.map(t => ({ id: t.id, name: t.name }))
      },
      status: 'success'
    });

  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      error: 'Failed to fetch contact',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * PUT /contacts/:id
 * Update a contact
 */
router.put('/:id', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, consent_whatsapp, consent_email, tags } = req.body;

    // Check if contact exists and belongs to tenant
    const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!contact) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Contact not found',
        status: 'error'
      });
    }

    // Check for duplicate phone if changing
    if (phone) {
      const existing = db.prepare(
        'SELECT id FROM contacts WHERE tenant_id = ? AND phone = ? AND id != ?'
      ).get(req.tenantId, phone, id);

      if (existing) {
        return res.status(400).json({
          error: 'Phone already exists',
          message: 'This phone number already exists for this tenant',
          status: 'error'
        });
      }
    }

    // Update contact
    const now = new Date().toISOString();
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email || null);
    }
    if (consent_whatsapp !== undefined) {
      updates.push('consent_whatsapp = ?');
      params.push(consent_whatsapp ? 1 : 0);
    }
    if (consent_email !== undefined) {
      updates.push('consent_email = ?');
      params.push(consent_email ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      params.push(req.tenantId);

      db.prepare(`
        UPDATE contacts
        SET ${updates.join(', ')}
        WHERE id = ? AND tenant_id = ?
      `).run(...params);
    }

    // Update tags if provided
    if (Array.isArray(tags)) {
      // Remove existing tags
      db.prepare('DELETE FROM contact_tags WHERE contact_id = ?').run(id);

      // Add new tags
      const insertContactTag = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)');
      for (const tagId of tags) {
        const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND tenant_id = ? AND status = \'active\'').get(tagId, req.tenantId);
        if (tag) {
          insertContactTag.run(id, tagId);
        }
      }
    }

    res.status(200).json({
      contact_id: id,
      message: 'Contact updated successfully',
      status: 'success'
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      error: 'Failed to update contact',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * DELETE /contacts/:id
 * Delete a contact
 */
router.delete('/:id', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { id } = req.params;

    // Check if contact exists
    const contact = db.prepare('SELECT id FROM contacts WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!contact) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Contact not found',
        status: 'error'
      });
    }

    // Delete contact tags first (foreign key constraint)
    db.prepare('DELETE FROM contact_tags WHERE contact_id = ?').run(id);

    // Delete messages referencing this contact
    db.prepare('DELETE FROM messages WHERE contact_id = ?').run(id);

    // Delete contact
    db.prepare('DELETE FROM contacts WHERE id = ? AND tenant_id = ?').run(id, req.tenantId);

    res.status(200).json({
      message: 'Contact deleted successfully',
      status: 'success'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      error: 'Failed to delete contact',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /contacts/tags/list
 * Get all tags for current tenant
 */
router.get('/tags/list', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const includeArchived = req.query.include_archived === 'true' || req.query.include_archived === '1';
    const tags = db.prepare(`
      SELECT id, name, status, is_default FROM tags
      WHERE tenant_id = ? ${includeArchived ? '' : `AND status = 'active'`}
      ORDER BY name ASC
    `).all(req.tenantId);

    return res.json({
      data: tags.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status || 'active',
        is_default: !!t.is_default
      })),
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({
      error: 'Failed to fetch tags',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /contacts/tags
 * Create a new tenant tag (admin/owner only)
 */
router.post('/tags', requireAuth, validateTenantAccess, requireAdmin, (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({
        error: 'Invalid tag name',
        message: 'Tag name is required'
      });
    }

    const existing = db.prepare(`
      SELECT id, status FROM tags WHERE tenant_id = ? AND name = ?
    `).get(req.tenantId, name);

    if (existing) {
      if (existing.status === 'archived') {
        db.prepare(`
          UPDATE tags SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(existing.id);

        logAudit({
          actorUserId: req.session.userId,
          actorType: 'tenant_user',
          tenantId: req.tenantId,
          action: AUDIT_ACTIONS.TAG_UPDATE,
          targetType: 'tag',
          targetId: existing.id,
          metadata: { name, reactivated: true },
          ipAddress: req.ip
        });

        return res.status(200).json({
          id: existing.id,
          name,
          status: 'active',
          reactivated: true
        });
      }

      return res.status(200).json({
        id: existing.id,
        name,
        status: existing.status || 'active',
        duplicate: true
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
      VALUES (?, ?, ?, ?, ?, 'active', 'tenant', 0)
    `).run(id, req.tenantId, name, now, now);

    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: AUDIT_ACTIONS.TAG_CREATE,
      targetType: 'tag',
      targetId: id,
      metadata: { name },
      ipAddress: req.ip
    });

    return res.status(201).json({
      id,
      name,
      status: 'active'
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    return res.status(500).json({
      error: 'Failed to create tag',
      message: error.message
    });
  }
});

/**
 * PATCH /contacts/tags/:tagId
 * Rename or archive/unarchive a tag (admin/owner only)
 */
router.patch('/tags/:tagId', requireAuth, validateTenantAccess, requireAdmin, (req, res) => {
  try {
    const { tagId } = req.params;
    const { name, status } = req.body || {};
    const tag = db.prepare(`
      SELECT id, name, status FROM tags WHERE id = ? AND tenant_id = ?
    `).get(tagId, req.tenantId);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const updates = [];
    const params = [];
    let newName = tag.name;
    let newStatus = tag.status || 'active';

    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Tag name cannot be empty' });
      }

      const duplicate = db.prepare(`
        SELECT id FROM tags WHERE tenant_id = ? AND name = ? AND id != ?
      `).get(req.tenantId, trimmed, tagId);

      if (duplicate) {
        return res.status(400).json({ error: 'Tag name already exists' });
      }

      updates.push('name = ?');
      params.push(trimmed);
      newName = trimmed;
    }

    if (typeof status === 'string') {
      const normalized = status.toLowerCase();
      if (!['active', 'archived'].includes(normalized)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(normalized);
      newStatus = normalized;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(tagId, req.tenantId);

    db.prepare(`
      UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
    `).run(...params);

    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: AUDIT_ACTIONS.TAG_UPDATE,
      targetType: 'tag',
      targetId: tagId,
      metadata: {
        previous: { name: tag.name, status: tag.status || 'active' },
        updated: { name: newName, status: newStatus }
      },
      ipAddress: req.ip
    });

    return res.json({
      id: tagId,
      name: newName,
      status: newStatus
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    return res.status(500).json({
      error: 'Failed to update tag',
      message: error.message
    });
  }
});

/**
 * POST /contacts/import
 * Import contacts from CSV file
 * Body: { data: array of contact objects parsed from CSV }
 */
router.post('/import', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { data: contactsData } = req.body;

    if (!Array.isArray(contactsData) || contactsData.length === 0) {
      return res.status(400).json({
        error: 'Invalid data',
        message: 'Please provide an array of contacts',
        status: 'error'
      });
    }

    const results = {
      total: contactsData.length,
      imported: 0,
      failed: 0,
      errors: []
    };

    // Validate and insert in transaction
    const insertContact = db.prepare(`
      INSERT INTO contacts
      (id, tenant_id, name, phone, email, consent_whatsapp, consent_email, consent_source, consent_updated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'csv_import', ?, ?, ?)
    `);

    const insertContactTag = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)');
    const getTagByName = db.prepare('SELECT id, status FROM tags WHERE tenant_id = ? AND name = ?');
    const activateTag = db.prepare(`UPDATE tags SET status = 'active', updated_at = ? WHERE id = ?`);
    const createTag = db.prepare(`
      INSERT INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
      VALUES (?, ?, ?, ?, ?, 'active', 'tenant', 0)
    `);

    // Start transaction
    const transaction = db.transaction(() => {
      for (let i = 0; i < contactsData.length; i++) {
        const row = contactsData[i];
        const rowNum = i + 1;

        try {
          // Validate required fields
          const name = row.name?.toString().trim();
          const phone = row.phone?.toString().trim();
          const email = row.email?.toString().trim() || null;
          const tagsStr = row.tags?.toString().trim() || '';

          if (!name) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              field: 'name',
              message: 'Name is required'
            });
            continue;
          }

          if (!phone) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              field: 'phone',
              message: 'Phone is required'
            });
            continue;
          }

          // Validate E.164 phone format
          if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/[^\d+]/g, ''))) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              field: 'phone',
              message: 'Invalid phone format. Must be E.164 format (e.g., +1234567890)'
            });
            continue;
          }

          // Validate email if provided
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              field: 'email',
              message: 'Invalid email format'
            });
            continue;
          }

          // Check for duplicate phone
          const existing = db.prepare(
            'SELECT id FROM contacts WHERE tenant_id = ? AND phone = ?'
          ).get(req.tenantId, phone);

          if (existing) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              field: 'phone',
              message: 'Phone already exists for this tenant'
            });
            continue;
          }

          // Create contact
          const contactId = uuidv4();
          const now = new Date().toISOString();

          insertContact.run(
            contactId,
            req.tenantId,
            name,
            phone,
            email,
            1, // consent_whatsapp default true for imported
            0, // consent_email default false
            now,
            now,
            now
          );

          // Add tags if provided
          if (tagsStr) {
            const tagNames = tagsStr.split(',').map(t => t.trim()).filter(t => t);
            for (const tagName of tagNames) {
              let tag = getTagByName.get(req.tenantId, tagName);
              if (tag) {
                if (tag.status === 'archived') {
                  activateTag.run(now, tag.id);
                  tag.status = 'active';
                }
              } else {
                const tagId = uuidv4();
                createTag.run(tagId, req.tenantId, tagName, now, now);
                tag = { id: tagId, status: 'active' };
              }
              if (tag.status === 'active') {
                insertContactTag.run(contactId, tag.id);
              }
            }
          }

          results.imported++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            message: error.message
          });
        }
      }
    });

    // Execute transaction
    transaction();

    // Log audit event
    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: AUDIT_ACTIONS.CONTACT_IMPORT,
      targetType: 'contacts',
      targetId: `batch-${Date.now()}`,
      metadata: {
        imported: results.imported,
        failed: results.failed,
        total: results.total
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      message: `Import complete: ${results.imported} imported, ${results.failed} failed`,
      data: results,
      status: 'success'
    });

  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({
      error: 'Failed to import contacts',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /contacts/export
 * Export contacts as CSV
 */
router.get('/export', requireAuth, validateTenantAccess, (req, res) => {
  try {
    // Get all contacts with tags for this tenant
    const contacts = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.email,
        c.consent_whatsapp,
        c.consent_email,
        c.created_at,
        STRING_AGG(t.name, ', ') as tags
      FROM contacts c
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.tenant_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all(req.tenantId);

    // Build CSV content
    let csv = 'Name,Phone,Email,Tags,Consent WhatsApp,Consent Email,Created At\n';

    for (const contact of contacts) {
      const name = (contact.name || '').replace(/"/g, '""');
      const phone = contact.phone || '';
      const email = (contact.email || '').replace(/"/g, '""');
      const tags = (contact.tags || '').replace(/"/g, '""');
      const consentWa = contact.consent_whatsapp ? 'Yes' : 'No';
      const consentEmail = contact.consent_email ? 'Yes' : 'No';
      const createdAt = contact.created_at || '';

      csv += `"${name}","${phone}","${email}","${tags}","${consentWa}","${consentEmail}","${createdAt}"\n`;
    }

    // Send as file download
    const filename = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

  } catch (error) {
    console.error('Export contacts error:', error);
    res.status(500).json({
      error: 'Failed to export contacts',
      message: error.message,
      status: 'error'
    });
  }
});

module.exports = router;
