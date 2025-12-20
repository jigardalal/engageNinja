/**
 * Campaigns Routes
 * Handles campaign management (list, create, read, update, delete, send, metrics)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const metricsEmitter = require('../services/metricsEmitter');

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
    const { search, status, limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 50, 500); // Max 500 per request
    const parsedOffset = parseInt(offset) || 0;

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
      audience_filters
    } = req.body;

    // Validate required fields
    if (!name || !channel) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Campaign name and channel are required',
        status: 'error'
      });
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
      message_content || null,
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
 * GET /campaigns/:id/metrics
 * Get campaign metrics (sent, delivered, read, failed counts and read rate)
 */
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
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
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
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as original_read_count,
          COUNT(*) as original_total
        FROM messages
        WHERE campaign_id = ?
      `).get(campaign.resend_of_campaign_id);

      const originalReadCount = originalMetrics.original_read_count || 0;
      const additionalReads = readCount - originalReadCount;
      const originalReadRate = originalMetrics.original_total > 0
        ? ((originalReadCount / originalMetrics.original_total) * 100).toFixed(2)
        : 0;

      resendMetrics = {
        original_read_count: originalReadCount,
        resend_read_count: readCount,
        additional_reads: additionalReads,
        uplift_percentage: originalReadCount > 0
          ? ((additionalReads / originalReadCount) * 100).toFixed(2)
          : 0
      };

      upliftData = {
        message: `${additionalReads} additional people read your message after resend (+${resendMetrics.uplift_percentage}%)`,
        additional_reads: additionalReads,
        uplift_percentage: parseFloat(resendMetrics.uplift_percentage)
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
        sent: metrics.sent_count || 0,
        delivered: metrics.delivered_count || 0,
        read: metrics.read_count || 0,
        failed: metrics.failed_count || 0,
        total: totalSent,
        read_rate: parseFloat(readRate)
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
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
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
          failed: metrics.failed_count || 0
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
router.post('/:id/send', requireAuth, validateTenantAccess, (req, res) => {
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

    // Get user's plan
    const tenant = db.prepare('SELECT plan_id FROM tenants WHERE id = ?').get(req.tenantId);
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(tenant.plan_id);

    // Get current month usage
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let usage = db.prepare(`
      SELECT * FROM usage_counters
      WHERE tenant_id = ? AND year_month = ?
    `).get(req.tenantId, yearMonth);

    // Determine message type and get current usage
    let currentUsage = 0;
    let messageType = campaign.channel === 'whatsapp' ? 'whatsapp_messages_sent' : 'email_messages_sent';
    let planLimit = campaign.channel === 'whatsapp' ? plan.whatsapp_messages_per_month : plan.email_messages_per_month;

    if (usage) {
      currentUsage = usage[messageType] || 0;
    }

    // Check plan limits
    if (currentUsage + audienceCount > planLimit) {
      return res.status(400).json({
        error: 'Plan Limit Exceeded',
        message: `You've reached ${planLimit} ${campaign.channel} messages this month. Upgrade to continue.`,
        current: currentUsage,
        limit: planLimit,
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
router.post('/:id/resend', requireAuth, validateTenantAccess, (req, res) => {
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
      if (currentUsage + nonReaders.length > plan.whatsapp_messages_per_month) {
        return res.status(400).json({
          error: 'Plan Limit Exceeded',
          message: `Resending would exceed your monthly WhatsApp limit. You have ${plan.whatsapp_messages_per_month - currentUsage} messages remaining.`,
          status: 'error'
        });
      }
    } else if (campaign.channel === 'email' && usage) {
      currentUsage = usage.email_messages_sent || 0;
      if (currentUsage + nonReaders.length > plan.email_messages_per_month) {
        return res.status(400).json({
          error: 'Plan Limit Exceeded',
          message: `Resending would exceed your monthly Email limit. You have ${plan.email_messages_per_month - currentUsage} messages remaining.`,
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
