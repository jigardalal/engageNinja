/**
 * Analytics Routes
 *
 * Endpoints for tracking and reporting conversion events.
 * Used by frontend to track user interactions and measure conversion metrics.
 *
 * Events tracked:
 * - Usage alerts (shown, clicked, dismissed)
 * - Feature locks (shown, clicked)
 * - Upgrade CTAs
 * - Milestones
 * - Plan upgrades
 * - A/B test exposures and conversions
 */

const express = require('express');
const db = require('../db');
const { validateTenantAccess } = require('../middleware/rbac');

const router = express.Router();

/**
 * POST /api/analytics/events
 * Track a conversion event
 *
 * Body:
 * {
 *   event_type: 'USAGE_ALERT_CLICKED',
 *   properties: { channel: 'whatsapp', threshold: 80, ... },
 *   session_id: 'session_xxx'
 * }
 */
router.post('/events', validateTenantAccess, async (req, res) => {
  try {
    const { event_type, properties = {}, session_id } = req.body;
    const tenantId = req.session.activeTenantId;
    const userId = req.session.userId;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    // Insert event into analytics table
    const result = await db.query(
      `INSERT INTO conversion_events
       (tenant_id, user_id, event_type, properties, session_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [
        tenantId,
        userId,
        event_type,
        JSON.stringify(properties),
        session_id
      ]
    );

    res.json({
      status: 'success',
      event_id: result.rows[0]?.id
    });
  } catch (err) {
    console.error('Analytics event error:', err);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * GET /api/analytics/metrics
 * Get conversion metrics for current tenant
 *
 * Query params:
 * - start_date: ISO date string (default: 30 days ago)
 * - end_date: ISO date string (default: today)
 * - event_type: Filter by event type (optional)
 *
 * Returns:
 * {
 *   period: { start, end },
 *   totals: { events, unique_users, unique_sessions },
 *   by_event: { USAGE_ALERT_CLICKED: 123, ... },
 *   by_source: { campaigns: 45, dashboard: 78, ... },
 *   conversion_funnel: { shown: 1000, clicked: 150, converted: 20 }
 * }
 */
router.get('/metrics', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.session.activeTenantId;
    const { start_date, end_date, event_type } = req.query;

    // Default to last 30 days
    const end = new Date(end_date || new Date());
    const start = new Date(start_date || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000));

    let query = `
      SELECT
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        json_agg(DISTINCT properties->'source') as sources
      FROM conversion_events
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
    `;

    const params = [tenantId, start, end];
    let paramIndex = 4;

    if (event_type) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(event_type);
    }

    query += ` GROUP BY event_type ORDER BY count DESC`;

    const result = await db.query(query, params);

    // Calculate totals
    const totals = {
      events: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      unique_users: result.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0),
      unique_sessions: result.rows.reduce((sum, row) => sum + parseInt(row.unique_sessions), 0)
    };

    // Format by event type
    const by_event = {};
    result.rows.forEach(row => {
      by_event[row.event_type] = parseInt(row.count);
    });

    res.json({
      period: { start, end },
      totals,
      by_event,
      events: result.rows
    });
  } catch (err) {
    console.error('Analytics metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/analytics/funnel
 * Get conversion funnel (shown → clicked → converted)
 *
 * Query params:
 * - feature: Feature name to analyze (e.g., 'usage_alert', 'feature_lock')
 * - start_date: ISO date string
 * - end_date: ISO date string
 *
 * Returns funnel stages with conversion rates
 */
router.get('/funnel', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.session.activeTenantId;
    const { feature, start_date, end_date } = req.query;

    const end = new Date(end_date || new Date());
    const start = new Date(start_date || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000));

    let eventPrefix = feature?.toUpperCase() || 'USAGE_ALERT';

    // Get funnel stages
    const query = `
      SELECT
        CASE
          WHEN event_type LIKE $1 || '%SHOWN' THEN 'shown'
          WHEN event_type LIKE $1 || '%CLICKED' THEN 'clicked'
          WHEN event_type LIKE $1 || '%DISMISSED' THEN 'dismissed'
        END as stage,
        COUNT(DISTINCT session_id) as sessions
      FROM conversion_events
      WHERE tenant_id = $2 AND created_at >= $3 AND created_at <= $4
        AND event_type LIKE $1 || '%'
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'shown' THEN 1
          WHEN 'clicked' THEN 2
          WHEN 'dismissed' THEN 3
        END
    `;

    const result = await db.query(query, [eventPrefix, tenantId, start, end]);

    // Calculate conversion rates
    const stages = {};
    let prevCount = null;

    result.rows.forEach(row => {
      const count = parseInt(row.sessions);
      const rate = prevCount ? ((count / prevCount) * 100).toFixed(1) : 100;
      stages[row.stage] = { count, rate: parseFloat(rate) };
      prevCount = count;
    });

    res.json({
      feature,
      period: { start, end },
      stages
    });
  } catch (err) {
    console.error('Analytics funnel error:', err);
    res.status(500).json({ error: 'Failed to fetch funnel' });
  }
});

/**
 * GET /api/analytics/ab-tests
 * Get A/B test performance metrics
 *
 * Query params:
 * - test_id: Test identifier (e.g., 'usage_alert_cta_v1')
 * - start_date: ISO date string
 * - end_date: ISO date string
 *
 * Returns per-variant metrics and conversion rates
 */
router.get('/ab-tests', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.session.activeTenantId;
    const { test_id, start_date, end_date } = req.query;

    if (!test_id) {
      return res.status(400).json({ error: 'test_id is required' });
    }

    const end = new Date(end_date || new Date());
    const start = new Date(start_date || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000));

    // Get variant performance
    const query = `
      SELECT
        properties->>'variant' as variant,
        COUNT(CASE WHEN event_type = 'AB_TEST_EXPOSURE' THEN 1 END) as exposures,
        COUNT(CASE WHEN event_type = 'AB_TEST_CONVERSION' THEN 1 END) as conversions,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM conversion_events
      WHERE tenant_id = $1
        AND created_at >= $2 AND created_at <= $3
        AND properties->>'test_id' = $4
        AND event_type IN ('AB_TEST_EXPOSURE', 'AB_TEST_CONVERSION')
      GROUP BY variant
      ORDER BY exposures DESC
    `;

    const result = await db.query(query, [tenantId, start, end, test_id]);

    // Calculate conversion rates
    const variants = {};
    result.rows.forEach(row => {
      const exposures = parseInt(row.exposures);
      const conversions = parseInt(row.conversions);
      const conversionRate = exposures > 0 ? ((conversions / exposures) * 100).toFixed(1) : 0;

      variants[row.variant] = {
        exposures,
        conversions,
        unique_sessions: parseInt(row.unique_sessions),
        conversion_rate: parseFloat(conversionRate)
      };
    });

    res.json({
      test_id,
      period: { start, end },
      variants,
      winner: null // To be calculated if statistical significance is reached
    });
  } catch (err) {
    console.error('Analytics A/B test error:', err);
    res.status(500).json({ error: 'Failed to fetch A/B test metrics' });
  }
});

/**
 * POST /api/analytics/events/bulk
 * Bulk insert multiple events (for batch tracking)
 *
 * Body:
 * {
 *   events: [
 *     { event_type, properties, session_id },
 *     ...
 *   ]
 * }
 */
router.post('/events/bulk', validateTenantAccess, async (req, res) => {
  try {
    const { events = [] } = req.body;
    const tenantId = req.session.activeTenantId;
    const userId = req.session.userId;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }

    // Batch insert (limit to 100 events at a time)
    const safeBatch = events.slice(0, 100);
    const insertedIds = [];

    for (const event of safeBatch) {
      const { event_type, properties = {}, session_id } = event;

      if (!event_type) continue;

      try {
        const result = await db.query(
          `INSERT INTO conversion_events
           (tenant_id, user_id, event_type, properties, session_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING id`,
          [tenantId, userId, event_type, JSON.stringify(properties), session_id]
        );

        insertedIds.push(result.rows[0]?.id);
      } catch (err) {
        console.warn('Failed to insert event:', err);
      }
    }

    res.json({
      status: 'success',
      inserted: insertedIds.length,
      total: safeBatch.length
    });
  } catch (err) {
    console.error('Bulk analytics error:', err);
    res.status(500).json({ error: 'Failed to insert events' });
  }
});

module.exports = router;
