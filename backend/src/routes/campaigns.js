/**
 * Campaigns Routes
 * Handles campaign management (list, create, read, update, delete, send, metrics)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const metricsEmitter = require('../services/metricsEmitter');
const { getWhatsAppCredentials, getEmailCredentials } = require('../services/messageQueue');
const { requireMember, requireAdmin } = require('../middleware/rbac');
const { logAudit, AUDIT_ACTIONS } = require('../utils/audit');
const { canTenantSendCampaigns } = require('../utils/subscriptionChecks');

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
 * GET /campaigns
 * List all campaigns for current tenant with optional search and filtering
 */
router.get('/', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { search, status, limit = 50, offset = 0, hide_archived } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 50, 500); // Max 500 per request
    const parsedOffset = parseInt(offset) || 0;
    // Default behavior: hide archived unless explicitly disabled or status filter is set
    const shouldHideArchived = (!status || status.trim() === '') &&
      !(hide_archived === 'false' || hide_archived === '0');

    let query = `
      SELECT
        c.id,
        c.name,
        c.channel,
        c.status,
        c.created_at,
        c.sent_at,
        COUNT(m.id) as message_count,
        SUM(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM campaigns c
      LEFT JOIN messages m ON c.id = m.campaign_id
      WHERE c.tenant_id = ?
    `;

    let params = [req.tenantId];

    // Search by campaign name
    if (search && search.trim()) {
      query += ` AND c.name LIKE ?`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm);
    }

    // Filter by status
    if (status && status.trim()) {
      query += ` AND c.status = ?`;
      params.push(status.trim());
    } else if (shouldHideArchived) {
      query += ` AND c.status != 'archived'`;
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parsedLimit, parsedOffset);

    const campaigns = db.prepare(query).all(...params);

    // Count total campaigns
    let countQuery = `SELECT COUNT(*) as total FROM campaigns WHERE tenant_id = ?`;
    let countParams = [req.tenantId];

    if (search && search.trim()) {
      countQuery += ` AND name LIKE ?`;
      countParams.push(`%${search.trim()}%`);
    }
    if (status && status.trim()) {
      countQuery += ` AND status = ?`;
      countParams.push(status.trim());
    } else if (shouldHideArchived) {
      countQuery += ` AND status != 'archived'`;
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    return res.json({
      data: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        audience_count: campaign.message_count || 0,
        sent_count: campaign.sent_count || 0,
        delivered_count: campaign.delivered_count || 0,
        read_count: campaign.read_count || 0,
        failed_count: campaign.failed_count || 0,
        created_at: campaign.created_at,
        sent_at: campaign.sent_at
      })),
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: total
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({
      error: 'Failed to fetch campaigns',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /campaigns/bulk/archive
 * Archive multiple campaigns (keeps metrics/messages)
 */
router.post('/bulk/archive', requireAuth, validateTenantAccess, requireAdmin, (req, res) => {
  try {
    const { campaign_ids = [] } = req.body || {};

    if (!Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'campaign_ids is required and must be a non-empty array',
        status: 'error'
      });
    }

    if (campaign_ids.length > 500) {
      return res.status(400).json({
        error: 'Too Many Campaigns',
        message: 'Limit bulk archive to 500 campaigns at a time',
        status: 'error'
      });
    }

    const placeholders = campaign_ids.map(() => '?').join(',');
    const campaigns = db.prepare(
      `SELECT id FROM campaigns WHERE tenant_id = ? AND id IN (${placeholders})`
    ).all(req.tenantId, ...campaign_ids);

    if (campaigns.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No campaigns matched for archive',
        status: 'error'
      });
    }

    const archiveTransaction = db.transaction((ids) => {
      const ph = ids.map(() => '?').join(',');
      db.prepare(`UPDATE campaigns SET status = 'archived', updated_at = ? WHERE id IN (${ph}) AND tenant_id = ?`)
        .run(new Date().toISOString(), ...ids, req.tenantId);
    });

    archiveTransaction(campaigns.map(c => c.id));

    // Log audit event
    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: AUDIT_ACTIONS.CAMPAIGN_ARCHIVE,
      targetType: 'campaigns',
      targetId: campaign_ids.join(','),
      metadata: {
        count: campaigns.length,
        campaignIds: campaign_ids
      },
      ipAddress: req.ip
    });

    return res.json({
      status: 'success',
      message: `Archived ${campaigns.length} campaign(s)`
    });
  } catch (error) {
    console.error('Bulk archive campaigns error:', error);
    return res.status(500).json({
      error: 'Failed to archive campaigns',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /campaigns
 * Create a new campaign draft
 */
router.post('/', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const {
      name,
      description,
      channel,
      template_id,
      message_content,
      audience_filters,
      subject
    } = req.body;

    // Validate required fields
    if (!name || !channel) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Campaign name and channel are required',
        status: 'error'
      });
    }

    // Channel-specific validation
    if (channel === 'whatsapp') {
      const creds = getWhatsAppCredentials(req.tenantId);
      if (!creds || !creds.phone_number_id || !creds.access_token) {
        return res.status(400).json({
          error: 'WhatsApp Not Configured',
          message: 'Connect WhatsApp in Settings before creating a WhatsApp campaign',
          status: 'error'
        });
      }
      if (!template_id) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Template is required for WhatsApp campaigns',
          status: 'error'
        });
      }
    }

    let normalizedMessageContent = message_content || null;

    if (channel === 'email') {
      const creds = getEmailCredentials(req.tenantId);
      if (!creds) {
        return res.status(400).json({
          error: 'Email Not Configured',
          message: 'Connect Email (SES/Brevo) in Settings before creating an email campaign',
          status: 'error'
        });
      }

      // Normalize email payload to JSON { subject, htmlBody, textBody }
      const incomingContent = typeof message_content === 'object'
        ? message_content || {}
        : { htmlBody: message_content || '', textBody: message_content || '' };

      const emailSubject = (subject || incomingContent.subject || '').trim();
      const htmlBody = incomingContent.htmlBody || incomingContent.html || '';
      const textBody = incomingContent.textBody || incomingContent.text || '';

      if (!emailSubject) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Subject is required for email campaigns',
          status: 'error'
        });
      }

      if (!htmlBody && !textBody) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email body is required',
          status: 'error'
        });
      }

      normalizedMessageContent = JSON.stringify({
        subject: emailSubject,
        htmlBody,
        textBody
      });
    }

    if (channel === 'whatsapp' && message_content && typeof message_content !== 'string') {
      normalizedMessageContent = JSON.stringify(message_content);
    }

    const campaignId = uuidv4();
    const now = new Date().toISOString();

    // Insert campaign
    const stmt = db.prepare(`
      INSERT INTO campaigns (
        id, tenant_id, name, description, channel, status, template_id,
        message_content, audience_filters, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      campaignId,
      req.tenantId,
      name,
      description || null,
      channel,
      'draft',
      template_id || null,
      normalizedMessageContent || null,
      audience_filters ? JSON.stringify(audience_filters) : null,
      now,
      now
    );

    // Fetch the created campaign
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);

    return res.status(201).json({
      data: {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      },
      status: 'success',
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({
      error: 'Failed to create campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /campaigns/:id/duplicate
 * Duplicate an existing campaign into a new draft for edits/retries
 */
router.post('/:id/duplicate', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;
    const { name_override } = req.body || {};

    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    const now = new Date().toISOString();
    const newId = uuidv4();

    const deriveVersionedName = () => {
      if (name_override && name_override.trim()) {
        return name_override.trim();
      }

      // If name already has _vN, increment it; otherwise start at _v2
      const match = campaign.name.match(/^(.*)_v(\d+)$/i);
      const baseName = match ? match[1] : campaign.name;
      const currentVersion = match ? parseInt(match[2], 10) : 1;

      // Find highest existing version for this base
      const rows = db.prepare(`
        SELECT name FROM campaigns
        WHERE tenant_id = ? AND name LIKE ?
      `).all(req.tenantId, `${baseName}_v%`);

      let maxVersion = currentVersion;
      rows.forEach(row => {
        const m = row.name.match(new RegExp(`^${baseName}_v(\\d+)$`, 'i'));
        if (m) {
          const v = parseInt(m[1], 10);
          if (!Number.isNaN(v) && v > maxVersion) {
            maxVersion = v;
          }
        }
      });

      return `${baseName}_v${maxVersion + 1}`;
    };

    const newName = deriveVersionedName();

    db.prepare(`
      INSERT INTO campaigns (
        id, tenant_id, name, description, channel, status, template_id,
        message_content, audience_filters, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
    `).run(
      newId,
      req.tenantId,
      newName,
      campaign.description,
      campaign.channel,
      campaign.template_id,
      campaign.message_content,
      campaign.audience_filters,
      now,
      now
    );

    return res.status(201).json({
      status: 'success',
      message: 'Campaign duplicated as draft',
      data: {
        id: newId,
        name: newName,
        channel: campaign.channel,
        status: 'draft'
      }
    });
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    return res.status(500).json({
      error: 'Failed to duplicate campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * PUT /campaigns/:id
 * Update an existing campaign (drafts only)
 */
router.put('/:id', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      channel,
      template_id,
      message_content,
      audience_filters
    } = req.body;

    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Only draft campaigns can be edited',
        status: 'error'
      });
    }

    // Validate channel-specific requirements
    if (channel === 'whatsapp') {
      const creds = getWhatsAppCredentials(req.tenantId);
      if (!creds) {
        return res.status(400).json({
          error: 'WhatsApp Not Configured',
          message: 'Configure WhatsApp in Settings before editing a WhatsApp campaign',
          status: 'error'
        });
      }
      if (!template_id) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Template is required for WhatsApp campaigns',
          status: 'error'
        });
      }
    }

    let normalizedMessageContent = message_content;

    if (channel === 'email') {
      const creds = getEmailCredentials(req.tenantId);
      if (!creds) {
        return res.status(400).json({
          error: 'Email Not Configured',
          message: 'Configure Email in Settings before editing an Email campaign',
          status: 'error'
        });
      }

      const incomingContent = typeof message_content === 'object'
        ? message_content || {}
        : { htmlBody: message_content || '', textBody: message_content || '' };

      const emailSubject = (req.body.subject || incomingContent.subject || '').trim();
      const htmlBody = incomingContent.htmlBody || incomingContent.html || '';
      const textBody = incomingContent.textBody || incomingContent.text || '';

      if (!emailSubject) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Subject is required for email campaigns',
          status: 'error'
        });
      }

      if (!htmlBody && !textBody) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email body is required',
          status: 'error'
        });
      }

      normalizedMessageContent = JSON.stringify({
        subject: emailSubject,
        htmlBody,
        textBody
      });
    }

    if (channel === 'whatsapp' && message_content && typeof message_content !== 'string') {
      normalizedMessageContent = JSON.stringify(message_content);
    }

    if (!name || !channel) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Campaign name and channel are required',
        status: 'error'
      });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE campaigns
      SET name = ?, description = ?, channel = ?, template_id = ?, message_content = ?, audience_filters = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `).run(
      name,
      description || null,
      channel,
      template_id || null,
      normalizedMessageContent || null,
      audience_filters ? JSON.stringify(audience_filters) : null,
      now,
      id,
      req.tenantId
    );

    const updated = db.prepare(`SELECT id, name, channel, status, updated_at FROM campaigns WHERE id = ?`).get(id);

    return res.json({
      data: updated,
      status: 'success',
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.status(500).json({
      error: 'Failed to update campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /campaigns/:id/metrics
 * Get campaign metrics (sent, delivered, read, failed counts and read rate)
 */
router.get('/roi-snapshot', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { limit = 25 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 25, 100);

    // Fetch recent campaigns (non-draft) for this tenant
    const campaigns = db.prepare(`
      SELECT id, name, status, channel, sent_at, created_at, resend_of_campaign_id
      FROM campaigns
      WHERE tenant_id = ? AND status != 'draft'
      ORDER BY COALESCE(sent_at, created_at) DESC
      LIMIT ?
    `).all(req.tenantId, parsedLimit);

    if (campaigns.length === 0) {
      return res.json({
        data: {
          total_campaigns: 0,
          total_sent: 0,
          total_reads: 0,
          overall_read_rate: 0,
          resend_count: 0,
          uplift_reads: 0,
          avg_uplift_points: 0,
          best_resend: null
        },
        status: 'success'
      });
    }

    // Include original campaigns referenced by resends so uplift has both sides
    const campaignIds = new Set(campaigns.map(c => c.id));
    campaigns.forEach(c => {
      if (c.resend_of_campaign_id) {
        campaignIds.add(c.resend_of_campaign_id);
      }
    });

    const placeholders = Array.from(campaignIds).map(() => '?').join(',');
    const statsRows = db.prepare(`
      SELECT
        campaign_id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count
      FROM messages
      WHERE campaign_id IN (${placeholders})
      GROUP BY campaign_id
    `).all(...Array.from(campaignIds));

    const statsByCampaign = {};
    statsRows.forEach(row => {
      statsByCampaign[row.campaign_id] = {
        total: row.total || 0,
        delivered: row.delivered_count || 0,
        read: row.read_count || 0
      };
    });

    let totalSent = 0;
    let totalReads = 0;
    let resendCount = 0;
    let upliftReads = 0;
    const upliftDeltas = [];
    let bestResend = null;

    campaigns.forEach(campaign => {
      const metrics = statsByCampaign[campaign.id] || { total: 0, delivered: 0, read: 0 };
      totalSent += metrics.total;
      totalReads += metrics.read;

      if (campaign.resend_of_campaign_id) {
        resendCount += 1;
        const originalMetrics = statsByCampaign[campaign.resend_of_campaign_id] || { total: 0, read: 0 };
        const additionalReads = Math.max((metrics.read || 0) - (originalMetrics.read || 0), 0);
        const originalReadRate = originalMetrics.total > 0
          ? (originalMetrics.read / originalMetrics.total) * 100
          : 0;
        const resendReadRate = metrics.total > 0
          ? (metrics.read / metrics.total) * 100
          : 0;
        const upliftDelta = resendReadRate - originalReadRate;

        upliftReads += additionalReads;
        upliftDeltas.push(upliftDelta);

        if (!bestResend || upliftDelta > bestResend.uplift_points) {
          bestResend = {
            campaign_id: campaign.id,
            name: campaign.name,
            additional_reads: additionalReads,
            uplift_points: parseFloat(upliftDelta.toFixed(2)),
            original_read_rate: parseFloat(originalReadRate.toFixed(2)),
            resend_read_rate: parseFloat(resendReadRate.toFixed(2))
          };
        }
      }
    });

    const overallReadRate = totalSent > 0 ? ((totalReads / totalSent) * 100).toFixed(2) : 0;
    const avgUpliftPoints = upliftDeltas.length > 0
      ? (upliftDeltas.reduce((sum, val) => sum + val, 0) / upliftDeltas.length).toFixed(2)
      : 0;

    return res.json({
      data: {
        total_campaigns: campaigns.length,
        total_sent: totalSent,
        total_reads: totalReads,
        overall_read_rate: parseFloat(overallReadRate),
        resend_count: resendCount,
        uplift_reads: upliftReads,
        avg_uplift_points: parseFloat(avgUpliftPoints),
        best_resend: bestResend
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error generating ROI snapshot:', error);
    return res.status(500).json({
      error: 'Failed to generate ROI snapshot',
      message: error.message,
      status: 'error'
    });
  }
});

router.get('/:id/metrics', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    // Get message metrics for this campaign
    const metrics = db.prepare(`
      SELECT
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_count,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        MAX(status_reason) as last_error,
        MAX(updated_at) as last_message_update
      FROM messages
      WHERE campaign_id = ?
    `).get(id);

    // Calculate read rate
    const totalSent = metrics.total_sent || 0;
    const readCount = metrics.read_count || 0;
    const readRate = totalSent > 0 ? ((readCount / totalSent) * 100).toFixed(2) : 0;

    // Check if this is a resend (has parent campaign)
    let resendMetrics = null;
    let upliftData = null;

    if (campaign.resend_of_campaign_id) {
      // This is a resend - get metrics for original campaign
      const originalMetrics = db.prepare(`
        SELECT
          COUNT(*) as original_total,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as original_delivered_count,
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as original_read_count
        FROM messages
        WHERE campaign_id = ?
      `).get(campaign.resend_of_campaign_id);

      const originalReadCount = originalMetrics.original_read_count || 0;
      const originalDelivered = originalMetrics.original_delivered_count || 0;
      const originalTotal = originalMetrics.original_total || 0;
      const additionalReads = Math.max(readCount - originalReadCount, 0);
      const originalReadRate = originalTotal > 0
        ? ((originalReadCount / originalTotal) * 100).toFixed(2)
        : 0;
      const resendReadRate = totalSent > 0
        ? ((readCount / totalSent) * 100).toFixed(2)
        : 0;

      const upliftRateDelta = (parseFloat(resendReadRate) || 0) - (parseFloat(originalReadRate) || 0);

      resendMetrics = {
        original_total: originalTotal,
        original_delivered_count: originalDelivered,
        original_read_count: originalReadCount,
        original_read_rate: parseFloat(originalReadRate) || 0,
        resend_total: totalSent,
        resend_delivered_count: metrics.delivered_count || 0,
        resend_read_count: readCount,
        resend_read_rate: parseFloat(resendReadRate) || 0,
        additional_reads: additionalReads,
        uplift_reads: additionalReads,
        uplift_rate_delta: parseFloat(upliftRateDelta.toFixed(2))
      };

      upliftData = {
        message: `${additionalReads} additional people read your message after resend (+${upliftRateDelta.toFixed(2)} pts)`,
        additional_reads: additionalReads,
        uplift_percentage: parseFloat(upliftRateDelta.toFixed(2))
      };
    }

    return res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        sent_at: campaign.sent_at,
        completed_at: campaign.completed_at
      },
      metrics: {
        queued: metrics.queued_count || 0,
        processing: metrics.processing_count || 0,
        sent: metrics.sent_count || 0,
        delivered: metrics.delivered_count || 0,
        read: metrics.read_count || 0,
        failed: metrics.failed_count || 0,
        total: totalSent,
        read_rate: parseFloat(readRate),
        last_error: metrics.last_error || null,
        last_message_update: metrics.last_message_update || null
      },
      resend_metrics: resendMetrics,
      uplift: upliftData,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    return res.status(500).json({
      error: 'Failed to fetch campaign metrics',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /campaigns/:id
 * Get campaign details
 */
router.get('/:id', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;

    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    // Get message metrics
    const metrics = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        MAX(status_reason) as last_error
      FROM messages WHERE campaign_id = ?
    `).get(id);

    return res.json({
      data: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        channel: campaign.channel,
        status: campaign.status,
        template_id: campaign.template_id,
        message_content: campaign.message_content,
        audience_filters: campaign.audience_filters ? JSON.parse(campaign.audience_filters) : null,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        sent_at: campaign.sent_at,
        metrics: {
          total: metrics.total || 0,
          queued: metrics.queued_count || 0,
          sent: metrics.sent_count || 0,
          delivered: metrics.delivered_count || 0,
          read: metrics.read_count || 0,
          failed: metrics.failed_count || 0,
          last_error: metrics.last_error || null
        }
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return res.status(500).json({
      error: 'Failed to fetch campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * PATCH /campaigns/:id
 * Update campaign (draft only)
 */
router.patch('/:id', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, message_content, audience_filters } = req.body;

    // Check if campaign exists and is in draft status
    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Can only edit draft campaigns',
        status: 'error'
      });
    }

    const now = new Date().toISOString();

    // Update campaign
    const stmt = db.prepare(`
      UPDATE campaigns
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          message_content = COALESCE(?, message_content),
          audience_filters = COALESCE(?, audience_filters),
          updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `);

    stmt.run(
      name || null,
      description || null,
      message_content || null,
      audience_filters ? JSON.stringify(audience_filters) : null,
      now,
      id,
      req.tenantId
    );

    // Fetch updated campaign
    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);

    return res.json({
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        channel: updated.channel,
        status: updated.status,
        message_content: updated.message_content,
        updated_at: updated.updated_at
      },
      status: 'success',
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.status(500).json({
      error: 'Failed to update campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /campaigns/:id/send
 * Send campaign with usage limits check
 */
router.post('/:id/send', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign
    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Campaign must be in draft status to send',
        status: 'error'
      });
    }

    // Parse audience filters
    const audienceFilters = campaign.audience_filters ? JSON.parse(campaign.audience_filters) : {};

    // Get all contacts for this tenant that match audience filters
    let contactQuery = 'SELECT id FROM contacts WHERE tenant_id = ? AND deleted_at IS NULL';
    let params = [req.tenantId];

    // Filter by tags if specified
    if (audienceFilters.tags && audienceFilters.tags.length > 0) {
      const placeholders = audienceFilters.tags.map(() => '?').join(',');
      contactQuery = `
        SELECT DISTINCT c.id FROM contacts c
        INNER JOIN contact_tags ct ON c.id = ct.contact_id
        INNER JOIN tags t ON ct.tag_id = t.id
        WHERE c.tenant_id = ? AND c.deleted_at IS NULL
        AND t.id IN (${placeholders})
        GROUP BY c.id
        HAVING COUNT(DISTINCT t.id) = ?
      `;
      params = [req.tenantId, ...audienceFilters.tags, audienceFilters.tags.length];
    }

    const contacts = db.prepare(contactQuery).all(...params);
    const audienceCount = contacts.length;

    if (audienceCount === 0) {
      return res.status(400).json({
        error: 'No Recipients',
        message: 'No contacts match the specified audience filters',
        status: 'error'
      });
    }

    // Channel-level validations before queueing messages
    if (campaign.channel === 'whatsapp') {
      const creds = getWhatsAppCredentials(req.tenantId);
      if (!creds || !creds.access_token || !creds.phone_number_id) {
        return res.status(400).json({
          error: 'WhatsApp Not Configured',
          message: 'Connect WhatsApp in Settings before sending this campaign',
          status: 'error'
        });
      }
      if (!campaign.template_id) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Template is required to send a WhatsApp campaign',
          status: 'error'
        });
      }

      // Validate template variable count matches payload
      const tmpl = db.prepare(`
        SELECT body_variables, header_variables, variable_count, buttons_json
        FROM whatsapp_templates
        WHERE id = ? AND tenant_id = ?
      `).get(campaign.template_id, req.tenantId);

      let requiredVars = [];
      let requiredCount = 0;
      let buttonVars = [];
      try {
        const bodyVars = tmpl?.body_variables ? JSON.parse(tmpl.body_variables) : [];
        const headerVars = tmpl?.header_variables ? JSON.parse(tmpl.header_variables) : [];
        // Button URL placeholders
        if (tmpl?.buttons_json) {
          try {
            const buttons = JSON.parse(tmpl.buttons_json) || [];
            buttons.forEach(btn => {
              if (btn.type === 'URL' && typeof btn.url === 'string') {
                const matches = btn.url.match(/\{\{(\w+)\}\}/g);
                if (matches) {
                  matches.forEach(m => buttonVars.push(m.replace(/\{\{|\}\}/g, '')));
                }
              }
            });
          } catch (e) {
            // ignore
          }
        }

        requiredVars = Array.from(new Set([...(bodyVars || []), ...(headerVars || []), ...(buttonVars || [])])).filter(Boolean);
        requiredCount = requiredVars.length;
      } catch (e) {
        // ignore parse errors; treat as no requirements
        requiredVars = [];
      }
      if (!requiredCount && typeof tmpl?.variable_count === 'number') {
        requiredCount = tmpl.variable_count;
      }

      if (requiredVars.length > 0 || requiredCount > 0) {
        let providedVars = [];
        try {
          const parsed = typeof campaign.message_content === 'string'
            ? JSON.parse(campaign.message_content)
            : campaign.message_content || {};
          const staticVars = parsed.static || {};
          const mappingVars = parsed.mapping || {};
          providedVars = Array.from(new Set([...Object.keys(staticVars), ...Object.keys(mappingVars)]));
        } catch (e) {
          providedVars = [];
        }

        const missing = requiredVars.filter(v => !providedVars.includes(String(v)));
        if (missing.length > 0 || (requiredCount && providedVars.length < requiredCount)) {
          return res.status(400).json({
            error: 'Template Variables Missing',
            message: missing.length > 0
              ? `Missing values for template variables: ${missing.join(', ')}`
              : `Template expects ${requiredCount} variables but only ${providedVars.length} provided`,
            status: 'error'
          });
        }
      }
    } else if (campaign.channel === 'email') {
      const creds = getEmailCredentials(req.tenantId);
      if (!creds) {
        return res.status(400).json({
          error: 'Email Not Configured',
          message: 'Connect Email (SES/Brevo) in Settings before sending this campaign',
          status: 'error'
        });
      }
      let emailContent = {};
      try {
        emailContent = typeof campaign.message_content === 'string'
          ? JSON.parse(campaign.message_content)
          : campaign.message_content || {};
      } catch {
        emailContent = {};
      }
      const emailSubject = (emailContent.subject || campaign.name || '').trim();
      const htmlBody = emailContent.htmlBody || emailContent.html || (typeof campaign.message_content === 'string' ? campaign.message_content : '');
      const textBody = emailContent.textBody || emailContent.text || '';
      if (!emailSubject || (!htmlBody && !textBody)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email subject and body are required before sending',
          status: 'error'
        });
      }
    }

    // Get user's plan
    const tenant = db.prepare('SELECT plan_id FROM tenants WHERE id = ?').get(req.tenantId);
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(tenant.plan_id);

    // Check subscription status and grace period before allowing campaign send
    const subscriptionCheck = canTenantSendCampaigns(db, req.tenantId);
    if (!subscriptionCheck.allowed) {
      return res.status(403).json({
        error: 'Subscription Issue',
        message: subscriptionCheck.reason,
        status: 'error',
        graceUntil: subscriptionCheck.graceUntil,
        failureReason: subscriptionCheck.failureReason,
        expired: subscriptionCheck.expired
      });
    }

    // Get current month usage
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let usage = db.prepare(`
      SELECT * FROM usage_counters
      WHERE tenant_id = ? AND year_month = ?
    `).get(req.tenantId, yearMonth);

    // Get plan overrides if they exist
    const overrides = db.prepare(`SELECT * FROM plan_overrides WHERE tenant_id = ?`).get(req.tenantId);

    // Determine message type and get current usage
    let currentUsage = 0;
    let messageType = campaign.channel === 'whatsapp' ? 'whatsapp_messages_sent' : 'email_messages_sent';

    // Use override limit if set, otherwise use plan default
    let planLimit;
    if (campaign.channel === 'whatsapp') {
      planLimit = overrides?.wa_messages_override ?? plan.whatsapp_messages_per_month;
    } else if (campaign.channel === 'email') {
      planLimit = overrides?.emails_override ?? plan.email_messages_per_month;
    } else {
      planLimit = 0;
    }

    if (usage) {
      currentUsage = usage[messageType] || 0;
    }

    // Check plan limits (hard cap enforcement)
    if (currentUsage + audienceCount > planLimit) {
      return res.status(403).json({
        error: 'Usage Limit Exceeded',
        message: `You've used ${currentUsage} of ${planLimit} ${campaign.channel} messages this month. Upgrade your plan to send more.`,
        current: currentUsage,
        limit: planLimit,
        remaining: Math.max(0, planLimit - currentUsage),
        requested: audienceCount,
        status: 'error'
      });
    }

    // Create message records (one per recipient)
    const messageInsertStmt = db.prepare(`
      INSERT INTO messages (
        id, tenant_id, campaign_id, contact_id, channel, provider,
        status, attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now_iso = new Date().toISOString();
    const messageIds = [];

    for (const contact of contacts) {
      const messageId = uuidv4();
      messageIds.push(messageId);
      messageInsertStmt.run(
        messageId,
        req.tenantId,
        campaign.id,
        contact.id,
        campaign.channel,
        campaign.channel === 'whatsapp' ? 'whatsapp_cloud' : 'ses',
        'queued',
        1,
        now_iso,
        now_iso
      );
    }

    // Update campaign status to "sending"
    db.prepare(`
      UPDATE campaigns
      SET status = 'sending', sent_at = ?, sent_by = ?, updated_at = ?
      WHERE id = ?
    `).run(now_iso, req.session.userId, now_iso, campaign.id);

    // Update usage counter
    if (usage) {
      db.prepare(`
        UPDATE usage_counters
        SET ${messageType} = ${messageType} + ?
        WHERE tenant_id = ? AND year_month = ?
      `).run(audienceCount, req.tenantId, yearMonth);
    } else {
      const counterStmt = db.prepare(`
        INSERT INTO usage_counters (
          id, tenant_id, year_month, whatsapp_messages_sent,
          email_messages_sent, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      const counterId = uuidv4();
      counterStmt.run(
        counterId,
        req.tenantId,
        yearMonth,
        campaign.channel === 'whatsapp' ? audienceCount : 0,
        campaign.channel === 'email' ? audienceCount : 0,
        now_iso
      );
    }

    // Return success with metrics
    return res.json({
      data: {
        id: campaign.id,
        status: 'sending',
        audience_count: audienceCount,
        message_ids: messageIds,
        metrics: {
          total: audienceCount,
          queued: audienceCount,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0
        }
      },
      status: 'success',
      message: 'Campaign sent successfully'
    });

    // Log audit event
    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: AUDIT_ACTIONS.CAMPAIGN_SEND,
      targetType: 'campaign',
      targetId: campaign.id,
      metadata: {
        campaignName: campaign.name,
        channel: campaign.channel,
        audienceCount,
        messageIds: messageIds.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return res.status(500).json({
      error: 'Failed to send campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /campaigns/:id/resend
 * Resend campaign to non-readers (24h after original send)
 */
router.post('/:id/resend', requireAuth, validateTenantAccess, requireMember, (req, res) => {
  try {
    const { id } = req.params;

    // Get original campaign
    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    // Campaign must be in "sending" or "sent" status (not draft)
    if (campaign.status === 'draft') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Campaign must be sent before resending',
        status: 'error'
      });
    }

    // Campaign cannot already be a resend
    if (campaign.resend_of_campaign_id) {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Cannot resend a resend campaign',
        status: 'error'
      });
    }

    // Check if campaign has already been resent (only one resend allowed)
    const existingResend = db.prepare(`
      SELECT id FROM campaigns
      WHERE resend_of_campaign_id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (existingResend) {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'This campaign has already been resent. Only one resend per campaign is allowed.',
        status: 'error'
      });
    }

    // Check if 24 hours have passed since original send
    if (!campaign.sent_at) {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Campaign has not been sent yet',
        status: 'error'
      });
    }

    const sentTime = new Date(campaign.sent_at).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - sentTime) / (1000 * 60 * 60);

    if (hoursPassed < 24) {
      const timeRemaining = 24 - hoursPassed;
      return res.status(400).json({
        error: 'Too Early',
        message: `Campaign must be at least 24 hours old before resending. ${timeRemaining.toFixed(1)} hours remaining.`,
        available_at: new Date(sentTime + 24 * 60 * 60 * 1000).toISOString(),
        status: 'error'
      });
    }

    // Validate channel credentials/content before resending
    if (campaign.channel === 'whatsapp') {
      const creds = getWhatsAppCredentials(req.tenantId);
      if (!creds || !creds.access_token || !creds.phone_number_id) {
        return res.status(400).json({
          error: 'WhatsApp Not Configured',
          message: 'Connect WhatsApp in Settings before resending',
          status: 'error'
        });
      }
      if (!campaign.template_id) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Template is required to resend a WhatsApp campaign',
          status: 'error'
        });
      }
    } else if (campaign.channel === 'email') {
      const creds = getEmailCredentials(req.tenantId);
      if (!creds) {
        return res.status(400).json({
          error: 'Email Not Configured',
          message: 'Connect Email (SES/Brevo) in Settings before resending',
          status: 'error'
        });
      }
      let emailContent = {};
      try {
        emailContent = typeof campaign.message_content === 'string'
          ? JSON.parse(campaign.message_content)
          : campaign.message_content || {};
      } catch {
        emailContent = {};
      }
      const emailSubject = (emailContent.subject || campaign.name || '').trim();
      const htmlBody = emailContent.htmlBody || emailContent.html || (typeof campaign.message_content === 'string' ? campaign.message_content : '');
      const textBody = emailContent.textBody || emailContent.text || '';
      if (!emailSubject || (!htmlBody && !textBody)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email subject and body are required before resending',
          status: 'error'
        });
      }
    }

    // Get non-readers from original campaign
    // Non-readers = delivered but not read
    const nonReaders = db.prepare(`
      SELECT DISTINCT contact_id FROM messages
      WHERE campaign_id = ?
        AND status = 'delivered'
      UNION
      SELECT DISTINCT contact_id FROM messages
      WHERE campaign_id = ?
        AND status IN ('sent', 'queued')
    `).all(id, id);

    if (nonReaders.length === 0) {
      return res.status(400).json({
        error: 'No Recipients',
        message: 'All recipients have read the original message. No resend needed.',
        status: 'error'
      });
    }

    // Get usage limits for the tenant
    const tenant = db.prepare('SELECT plan_id FROM tenants WHERE id = ?').get(req.tenantId);
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(tenant.plan_id);

    // Check subscription status and grace period before allowing campaign resend
    const subscriptionCheck = canTenantSendCampaigns(db, req.tenantId);
    if (!subscriptionCheck.allowed) {
      return res.status(403).json({
        error: 'Subscription Issue',
        message: subscriptionCheck.reason,
        status: 'error',
        graceUntil: subscriptionCheck.graceUntil,
        failureReason: subscriptionCheck.failureReason,
        expired: subscriptionCheck.expired
      });
    }

    // Get plan overrides if they exist
    const overrides = db.prepare(`SELECT * FROM plan_overrides WHERE tenant_id = ?`).get(req.tenantId);

    // Get current month usage
    const now_date = new Date();
    const yearMonth = `${now_date.getFullYear()}-${String(now_date.getMonth() + 1).padStart(2, '0')}`;

    let usage = db.prepare(`
      SELECT * FROM usage_counters
      WHERE tenant_id = ? AND year_month = ?
    `).get(req.tenantId, yearMonth);

    // Check if resend would exceed limits (for WhatsApp campaigns)
    let currentUsage = 0;
    if (campaign.channel === 'whatsapp' && usage) {
      currentUsage = usage.whatsapp_messages_sent || 0;
      const waLimit = overrides?.wa_messages_override ?? plan.whatsapp_messages_per_month;
      if (currentUsage + nonReaders.length > waLimit) {
        return res.status(403).json({
          error: 'Usage Limit Exceeded',
          message: `Resending would exceed your monthly WhatsApp limit. You've used ${currentUsage} of ${waLimit} messages. ${Math.max(0, waLimit - currentUsage)} remaining.`,
          current: currentUsage,
          limit: waLimit,
          remaining: Math.max(0, waLimit - currentUsage),
          requested: nonReaders.length,
          status: 'error'
        });
      }
    } else if (campaign.channel === 'email' && usage) {
      currentUsage = usage.email_messages_sent || 0;
      const emailLimit = overrides?.emails_override ?? plan.email_messages_per_month;
      if (currentUsage + nonReaders.length > emailLimit) {
        return res.status(403).json({
          error: 'Usage Limit Exceeded',
          message: `Resending would exceed your monthly Email limit. You've used ${currentUsage} of ${emailLimit} messages. ${Math.max(0, emailLimit - currentUsage)} remaining.`,
          current: currentUsage,
          limit: emailLimit,
          remaining: Math.max(0, emailLimit - currentUsage),
          requested: nonReaders.length,
          status: 'error'
        });
      }
    }

    // Create new campaign as resend
    const resendCampaignId = uuidv4();
    const now_iso = new Date().toISOString();

    db.prepare(`
      INSERT INTO campaigns (
        id, tenant_id, name, description, channel, template_id,
        audience_filters, message_content, status, resend_of_campaign_id,
        sent_by, sent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resendCampaignId,
      req.tenantId,
      `${campaign.name} - Resend`,
      campaign.description,
      campaign.channel,
      campaign.template_id,
      campaign.audience_filters,
      campaign.message_content,
      'sending',
      id, // Link to original campaign
      req.session.userId,
      now_iso,
      now_iso,
      now_iso
    );

    // Create message records for non-readers
    const messageInsertStmt = db.prepare(`
      INSERT INTO messages (
        id, tenant_id, campaign_id, contact_id, channel, provider,
        status, attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const messageIds = [];
    for (const record of nonReaders) {
      const messageId = uuidv4();
      messageIds.push(messageId);
      messageInsertStmt.run(
        messageId,
        req.tenantId,
        resendCampaignId,
        record.contact_id,
        campaign.channel,
        campaign.channel === 'whatsapp' ? 'whatsapp_cloud' : 'ses',
        'queued',
        1,
        now_iso,
        now_iso
      );
    }

    // Update usage counter
    const messageType = campaign.channel === 'whatsapp' ? 'whatsapp_messages_sent' : 'email_messages_sent';
    if (usage) {
      db.prepare(`
        UPDATE usage_counters
        SET ${messageType} = ${messageType} + ?
        WHERE tenant_id = ? AND year_month = ?
      `).run(nonReaders.length, req.tenantId, yearMonth);
    } else {
      const counterId = uuidv4();
      db.prepare(`
        INSERT INTO usage_counters (
          id, tenant_id, year_month, whatsapp_messages_sent,
          email_messages_sent, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        counterId,
        req.tenantId,
        yearMonth,
        campaign.channel === 'whatsapp' ? nonReaders.length : 0,
        campaign.channel === 'email' ? nonReaders.length : 0,
        now_iso
      );
    }

    // Log audit event
    logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId: req.tenantId,
      action: AUDIT_ACTIONS.CAMPAIGN_RESEND,
      targetType: 'campaign',
      targetId: id,
      metadata: {
        campaignName: campaign.name,
        resendCampaignId,
        channel: campaign.channel,
        resendCount: nonReaders.length,
        messageIds: messageIds.length
      },
      ipAddress: req.ip
    });

    return res.json({
      data: {
        id: resendCampaignId,
        original_campaign_id: id,
        status: 'sending',
        recipient_count: nonReaders.length,
        message_ids: messageIds,
        metrics: {
          total: nonReaders.length,
          queued: nonReaders.length,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0
        }
      },
      status: 'success',
      message: `Resending to ${nonReaders.length} non-readers`
    });
  } catch (error) {
    console.error('Error resending campaign:', error);
    return res.status(500).json({
      error: 'Failed to resend campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /campaigns/:id/retry-failed
 * Re-queue failed messages for this campaign (use when provider errors occurred)
 */
router.post('/:id/retry-failed', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;

    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    // Validate channel is still configured
    if (campaign.channel === 'whatsapp') {
      const creds = getWhatsAppCredentials(req.tenantId);
      if (!creds || !creds.access_token || !creds.phone_number_id) {
        return res.status(400).json({
          error: 'WhatsApp Not Configured',
          message: 'Connect WhatsApp in Settings before retrying failed messages',
          status: 'error'
        });
      }
      if (!campaign.template_id) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Template is required to retry WhatsApp messages',
          status: 'error'
        });
      }
    } else if (campaign.channel === 'email') {
      const creds = getEmailCredentials(req.tenantId);
      if (!creds) {
        return res.status(400).json({
          error: 'Email Not Configured',
          message: 'Connect Email in Settings before retrying failed messages',
          status: 'error'
        });
      }
    }

    // Prevent stacking retries while there are already queued messages for this campaign
    const queuedCount = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE campaign_id = ? AND status = 'queued'
    `).get(id).count;

    if (queuedCount > 0) {
      return res.status(400).json({
        error: 'Retry Already In Progress',
        message: `There are ${queuedCount} queued message(s) for this campaign. Wait for processing to finish before retrying.`,
        status: 'error'
      });
    }

    // Get failed messages (non-archived campaigns only, but allow sent/sending)
    const failedMessages = db.prepare(`
      SELECT id FROM messages
      WHERE campaign_id = ? AND status = 'failed'
    `).all(id);

    if (failedMessages.length === 0) {
      return res.status(400).json({
        error: 'No Failed Messages',
        message: 'There are no failed messages to retry for this campaign',
        status: 'error'
      });
    }

    const now = new Date().toISOString();
    const retryTransaction = db.transaction((ids) => {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`
        UPDATE messages
        SET status = 'queued',
            attempts = 0,
            status_reason = NULL,
            updated_at = ?
        WHERE id IN (${placeholders})
      `).run(now, ...ids);
    });

    retryTransaction(failedMessages.map(m => m.id));

    return res.json({
      status: 'success',
      message: `Queued ${failedMessages.length} failed message(s) for retry`,
      data: {
        retry_count: failedMessages.length
      }
    });
  } catch (error) {
    console.error('Error retrying failed messages:', error);
    return res.status(500).json({
      error: 'Failed to retry messages',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * DELETE /campaigns/:id
 * Delete campaign (draft only)
 */
router.delete('/:id', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Can only delete draft campaigns',
        status: 'error'
      });
    }

    // Delete campaign and related messages
    db.prepare('DELETE FROM messages WHERE campaign_id = ?').run(id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);

    return res.json({
      status: 'success',
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({
      error: 'Failed to delete campaign',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /campaigns/:id/metrics/stream
 * Server-Sent Events endpoint for real-time metric updates
 * Client connects and receives metric updates as they arrive via webhooks
 *
 * Flow:
 * 1. Client opens persistent HTTP connection
 * 2. Server sends initial metrics
 * 3. As webhooks arrive, metrics are broadcast to all connected clients
 * 4. Connection auto-closes after 30 minutes of inactivity
 */
router.get('/:id/metrics/stream', requireAuth, validateTenantAccess, (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const campaign = db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
    `).get(id, req.tenantId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found',
        status: 'error'
      });
    }

    // Setup SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (nginx)
    // CORS headers for SSE
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Helper function to send metrics
    const sendMetrics = () => {
      try {
        const metrics = db.prepare(`
          SELECT
            COUNT(*) as total_sent,
            SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_count,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
            SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
          FROM messages
          WHERE campaign_id = ?
        `).get(id);

        const totalSent = metrics.total_sent || 0;
        const readCount = metrics.read_count || 0;
        const readRate = totalSent > 0 ? ((readCount / totalSent) * 100).toFixed(2) : 0;

        // Build response object
        const data = {
          timestamp: new Date().toISOString(),
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status
          },
          metrics: {
            queued: metrics.queued_count || 0,
            sent: metrics.sent_count || 0,
            delivered: metrics.delivered_count || 0,
            read: metrics.read_count || 0,
            failed: metrics.failed_count || 0,
            total: totalSent,
            read_rate: parseFloat(readRate)
          }
        };

        // Check if this is a resend for uplift calculation
        if (campaign.resend_of_campaign_id) {
          const originalMetrics = db.prepare(`
            SELECT
              SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as original_read_count,
              COUNT(*) as original_total
            FROM messages
            WHERE campaign_id = ?
          `).get(campaign.resend_of_campaign_id);

          const originalReadCount = originalMetrics.original_read_count || 0;
          const additionalReads = readCount - originalReadCount;
          const upliftPercentage = originalReadCount > 0
            ? ((additionalReads / originalReadCount) * 100).toFixed(2)
            : 0;

          data.uplift = {
            message: `${additionalReads} additional people read your message after resend (+${upliftPercentage}%)`,
            additional_reads: additionalReads,
            uplift_percentage: parseFloat(upliftPercentage)
          };
        }

        // Send SSE formatted data
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error(`[SSE] Error sending metrics for campaign ${id}:`, err.message);
        // Continue anyway - don't crash the connection
      }
    };

    // Send initial metrics immediately
    sendMetrics();

    // Register for future updates
    metricsEmitter.subscribe(id, res);

    // Listen for metric update events
    const onMetricsUpdate = () => {
      sendMetrics();
    };

    metricsEmitter.on(`campaign:${id}:metrics`, onMetricsUpdate);

    // Cleanup on disconnect
    res.on('close', () => {
      metricsEmitter.removeListener(`campaign:${id}:metrics`, onMetricsUpdate);
      console.log(`[SSE] Client disconnected from campaign ${id} stream`);
    });

  } catch (error) {
    console.error('Error in SSE endpoint:', error);
    res.status(500).json({
      error: 'Failed to setup metrics stream',
      message: error.message,
      status: 'error'
    });
  }
});

module.exports = router;
