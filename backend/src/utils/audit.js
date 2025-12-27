/**
 * Audit Logging Utility for EngageNinja RBAC
 * Tracks all critical actions for compliance (SOC 2, GDPR, etc.)
 * PostgreSQL with async/await
 */

const crypto = require('crypto');
const db = require('../db');

/**
 * Log an audit event
 *
 * @param {Object} options - Audit event details
 * @param {string} options.actorUserId - User ID who performed the action
 * @param {string} options.actorType - Type of actor: 'platform_user', 'tenant_user', 'system'
 * @param {string} options.tenantId - Optional: Tenant ID (nullable for platform-only actions)
 * @param {string} options.action - Action performed (e.g., 'user.invite', 'campaign.send')
 * @param {string} options.targetType - Optional: What was affected (e.g., 'user', 'campaign', 'tenant')
 * @param {string} options.targetId - Optional: ID of affected resource
 * @param {Object} options.metadata - Optional: Action-specific data (NO SECRETS!)
 * @param {string} options.ipAddress - Optional: IP address of actor
 *
 * @returns {string} Audit log entry ID
 */
async function logAudit({
  actorUserId,
  actorType = 'tenant_user',
  tenantId = null,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
  ipAddress = null
}) {
  const id = crypto.randomUUID();

  try {
    await db.prepare(`
      INSERT INTO audit_logs (
        id, actor_user_id, actor_type, tenant_id, action,
        target_type, target_id, metadata, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      actorUserId,
      actorType,
      tenantId,
      action,
      targetType,
      targetId,
      JSON.stringify(metadata),
      ipAddress
    );

    if (process.env.DEBUG_AUDIT === 'true') {
      console.log(`[AUDIT] ${action}:`, {
        actor: actorUserId,
        tenant: tenantId,
        target: targetId,
        metadata
      });
    }

    return id;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit failures shouldn't break the app
    return null;
  }
}

/**
 * Audit action constants
 * Use these to ensure consistent action naming across the codebase
 */
const AUDIT_ACTIONS = {
  // Authentication & User Account
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_SIGNUP: 'user.signup',
  USER_PASSWORD_CHANGE: 'user.password_change',
  USER_PASSWORD_RESET: 'user.password_reset',

  // User Management
  USER_INVITE: 'user.invite',
  USER_ACCEPT_INVITE: 'user.accept_invite',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_REMOVE: 'user.remove',
  USER_DEACTIVATE: 'user.deactivate',
  USER_ACTIVATE: 'user.activate',

  // Tenant Management
  TENANT_CREATE: 'tenant.create',
  TENANT_UPDATE: 'tenant.update',
  TENANT_SUSPEND: 'tenant.suspend',
  TENANT_ARCHIVE: 'tenant.archive',
  TENANT_DELETE: 'tenant.delete',

  // Channel Management
  CHANNEL_CONNECT: 'channel.connect',
  CHANNEL_DISCONNECT: 'channel.disconnect',
  CHANNEL_UPDATE: 'channel.update',
  CHANNEL_VALIDATE: 'channel.validate',

  // Campaign Actions
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_UPDATE: 'campaign.update',
  CAMPAIGN_SEND: 'campaign.send',
  CAMPAIGN_RESEND: 'campaign.resend',
  CAMPAIGN_ARCHIVE: 'campaign.archive',
  CAMPAIGN_DELETE: 'campaign.delete',

  // Contact Management
  CONTACT_CREATE: 'contact.create',
  CONTACT_UPDATE: 'contact.update',
  CONTACT_DELETE: 'contact.delete',
  CONTACT_IMPORT: 'contact.import',
  CONTACT_EXPORT: 'contact.export',
  CONTACT_DELETE_BULK: 'contact.delete_bulk',

  // Template Actions
  TEMPLATE_SYNC: 'template.sync',
  TEMPLATE_UPDATE: 'template.update',

  // Webhook & API Management
  WEBHOOK_CREATE: 'webhook.create',
  WEBHOOK_UPDATE: 'webhook.update',
  WEBHOOK_DELETE: 'webhook.delete',
  API_KEY_CREATE: 'api_key.create',
  API_KEY_ROTATE: 'api_key.rotate',
  API_KEY_DELETE: 'api_key.delete',

  // Platform Admin Actions
  PLAN_CHANGE: 'plan.change',
  LIMITS_UPDATE: 'limits.update',
  AUDIT_RETENTION_CONFIG: 'audit_retention.config',

  // Tag Management
  TAG_CREATE: 'tag.create',
  TAG_UPDATE: 'tag.update',
  TAG_DELETE: 'tag.delete',

  // Global Tag Management
  GLOBAL_TAG_CREATE: 'global_tag.create',
  GLOBAL_TAG_UPDATE: 'global_tag.update'
};

/**
 * Query audit logs with filtering
 *
 * @param {Object} options - Filter options
 * @param {string} options.tenantId - Optional: Filter by tenant
 * @param {string} options.userId - Optional: Filter by actor user
 * @param {string} options.action - Optional: Filter by action type
 * @param {number} options.limit - Max results (default: 100)
 * @param {number} options.offset - Pagination offset (default: 0)
 *
 * @returns {Array} Audit log entries with actor and tenant info
 */
async function getAuditLogs({
  tenantId = null,
  userId = null,
  action = null,
  limit = 100,
  offset = 0
}) {
  let query = `
    SELECT
      al.*,
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

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  try {
    return await db.prepare(query).all(...params);
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    return [];
  }
}

/**
 * Get audit log statistics
 *
 * @param {string} tenantId - Optional: Filter by tenant
 *
 * @returns {Object} Stats including action counts and date range
 */
async function getAuditStats(tenantId = null) {
  try {
    let query = 'SELECT COUNT(*) as total FROM audit_logs';
    const params = [];

    if (tenantId) {
      query += ' WHERE tenant_id = ?';
      params.push(tenantId);
    }

    const stats = await db.prepare(query).get(...params);

    query = 'SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM audit_logs';
    const params2 = [];
    if (tenantId) {
      query += ' WHERE tenant_id = ?';
      params2.push(tenantId);
    }

    const dateRange = await db.prepare(query).get(...params2);

    return {
      totalEntries: stats.total,
      dateRange: {
        oldest: dateRange.oldest,
        newest: dateRange.newest
      }
    };
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    return { totalEntries: 0, dateRange: {} };
  }
}

/**
 * Clean up old audit logs based on retention policy
 * Should be called periodically (e.g., via cron job)
 *
 * @param {number} retentionDays - How many days to keep (null = keep all)
 *
 * @returns {number} Number of logs deleted
 */
async function cleanupOldAuditLogs(retentionDays = null) {
  // Get retention setting from platform config
  let daysToKeep = retentionDays;

  if (daysToKeep === null) {
    try {
      const config = await db.prepare(`
        SELECT value FROM platform_config WHERE key = 'audit_retention_days'
      `).get();

      daysToKeep = config && config.value !== 'null' ? parseInt(config.value) : null;
    } catch (error) {
      console.error('Failed to get retention config:', error);
      return 0;
    }
  }

  // If no retention limit, don't delete anything
  if (daysToKeep === null || daysToKeep === undefined) {
    if (process.env.DEBUG_AUDIT === 'true') {
      console.log('[AUDIT] No retention limit - keeping all logs');
    }
    return 0;
  }

  try {
    const result = await db.prepare(`
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '? days'
    `).run(daysToKeep);

    if (process.env.DEBUG_AUDIT === 'true') {
      console.log(`[AUDIT] Deleted ${result.changes} logs older than ${daysToKeep} days`);
    }

    return result.changes;
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error);
    return 0;
  }
}

module.exports = {
  logAudit,
  AUDIT_ACTIONS,
  getAuditLogs,
  getAuditStats,
  cleanupOldAuditLogs
};
