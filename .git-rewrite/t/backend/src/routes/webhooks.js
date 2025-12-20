/**
 * Webhooks Routes
 * Handles incoming webhooks from Meta WhatsApp and Email providers
 * Processes message status updates (sent, delivered, read, failed)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const metricsEmitter = require('../services/metricsEmitter');

// ===== CONFIGURATION =====
const ENABLE_WEBHOOK_VERIFICATION = process.env.ENABLE_WEBHOOK_VERIFICATION === 'true';
const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || 'test-webhook-secret';
const SES_WEBHOOK_SECRET = process.env.SES_WEBHOOK_SECRET || 'test-webhook-secret';

// Webhook event log for debugging
const webhookEventLog = [];
const MAX_LOG_ENTRIES = 1000;

// ===== HELPERS =====

/**
 * Verify Meta WhatsApp webhook signature
 * Meta sends X-Hub-Signature header with HMAC-SHA256 signature
 */
const verifyWhatsAppSignature = (body, signature) => {
  if (!ENABLE_WEBHOOK_VERIFICATION) {
    console.log('⚠️  Webhook verification disabled (ENABLE_WEBHOOK_VERIFICATION=false)');
    return true;
  }

  const hash = crypto
    .createHmac('sha256', WHATSAPP_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;
  const isValid = expectedSignature === signature;

  if (!isValid) {
    console.warn('⚠️  Invalid WhatsApp webhook signature:', {
      expected: expectedSignature,
      received: signature
    });
  }

  return isValid;
};

/**
 * Log webhook event for audit trail
 */
const logWebhookEvent = (provider, type, data, status = 'received') => {
  const entry = {
    id: uuidv4(),
    provider,
    type,
    status,
    data,
    timestamp: new Date().toISOString()
  };

  webhookEventLog.push(entry);

  // Keep only recent entries
  if (webhookEventLog.length > MAX_LOG_ENTRIES) {
    webhookEventLog.shift();
  }

  console.log(`📩 Webhook [${provider}] ${type}: ${status}`, data);
  return entry.id;
};

/**
 * Update message status from webhook
 */
const updateMessageStatus = (tenantId, providerMessageId, newStatus, eventTimestamp) => {
  try {
    // Find the message by provider_message_id
    const message = db.prepare(`
      SELECT id, campaign_id, status as old_status FROM messages
      WHERE provider_message_id = ? AND tenant_id = ?
    `).get(providerMessageId, tenantId);

    if (!message) {
      console.warn(`❌ Message not found for provider_message_id: ${providerMessageId}`);
      return null;
    }

    // Update message status
    const now = new Date().toISOString();
    const statusTimestampColumn = newStatus === 'sent' ? 'sent_at' :
                                   newStatus === 'delivered' ? 'delivered_at' :
                                   newStatus === 'read' ? 'read_at' :
                                   newStatus === 'failed' ? 'failed_at' : null;

    let updateQuery = `
      UPDATE messages
      SET status = ?, updated_at = ?
    `;
    const params = [newStatus, now];

    if (statusTimestampColumn) {
      updateQuery += `, ${statusTimestampColumn} = ?`;
      params.push(eventTimestamp || now);
    }

    updateQuery += ` WHERE id = ?`;
    params.push(message.id);

    const result = db.prepare(updateQuery).run(...params);

    // Log the status event
    const eventId = uuidv4();
    db.prepare(`
      INSERT INTO message_status_events (
        id, message_id, provider_message_id, old_status, new_status,
        event_timestamp, webhook_received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      message.id,
      providerMessageId,
      message.old_status,
      newStatus,
      eventTimestamp || now,
      now,
      now
    );

    console.log(`✅ Message ${message.id} status updated: ${message.old_status} → ${newStatus}`);

    return {
      messageId: message.id,
      campaignId: message.campaign_id,
      oldStatus: message.old_status,
      newStatus,
      eventId
    };
  } catch (error) {
    console.error('❌ Error updating message status:', error.message);
    throw error;
  }
};

/**
 * Update campaign metrics after status change
 */
const updateCampaignMetrics = (campaignId, tenantId) => {
  try {
    const metrics = db.prepare(`
      SELECT
        COUNT(*) as message_count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM messages
      WHERE campaign_id = ? AND tenant_id = ?
    `).get(campaignId, tenantId);

    return metrics;
  } catch (error) {
    console.error('❌ Error updating campaign metrics:', error.message);
    return null;
  }
};

/**
 * Handle duplicate webhook events (idempotency)
 * Returns true if this is a duplicate event that was already processed
 */
const isDuplicateWebhookEvent = (providerMessageId, newStatus) => {
  // Check if we already have this exact status update
  const existing = db.prepare(`
    SELECT id FROM message_status_events
    WHERE provider_message_id = ? AND new_status = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(providerMessageId, newStatus);

  if (existing) {
    console.log(`⚠️  Duplicate webhook event for ${providerMessageId} → ${newStatus}`);
    return true;
  }

  return false;
};

// ===== ROUTES =====

/**
 * POST /webhooks/whatsapp
 * Receive Meta WhatsApp webhook notifications
 *
 * Webhook format from Meta:
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [
 *     {
 *       "id": "...",
 *       "changes": [
 *         {
 *           "value": {
 *             "messaging_product": "whatsapp",
 *             "metadata": {
 *               "display_phone_number": "...",
 *               "phone_number_id": "..."
 *             },
 *             "statuses": [
 *               {
 *                 "id": "wamid.xyz...",  // provider_message_id
 *                 "status": "sent|delivered|read|failed",
 *                 "timestamp": 1234567890,
 *                 "recipient_id": "..."
 *               }
 *             ]
 *           },
 *           "field": "messages"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/whatsapp', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    // Convert raw body to string for signature verification
    const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'];

    // Verify webhook signature
    if (!verifyWhatsAppSignature(bodyString, signature)) {
      console.warn('❌ WhatsApp webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the body
    const body = typeof req.body === 'string' ? JSON.parse(bodyString) : req.body;

    // Handle webhook verification challenge from Meta
    if (body.object === 'whatsapp_business_account' && !body.entry) {
      console.log('✅ WhatsApp webhook verification request');
      return res.status(200).json({ challenge: req.query.challenge });
    }

    // Process status updates
    if (!body.entry || !Array.isArray(body.entry)) {
      console.warn('⚠️  Invalid WhatsApp webhook format');
      return res.status(400).json({ error: 'Invalid webhook format' });
    }

    let processedCount = 0;

    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        const { value, field } = change;

        // Only process message status updates
        if (field !== 'messages') continue;
        if (!value || !value.statuses) continue;

        // Extract tenant_id from metadata if available
        // In production, you'd have a way to map phone_number_id to tenant
        const phoneNumberId = value.metadata?.phone_number_id;

        for (const status of value.statuses) {
          const { id: providerMessageId, status: newStatus, timestamp: eventTimestamp } = status;

          if (!providerMessageId || !newStatus) continue;

          logWebhookEvent('whatsapp', 'message_status', {
            providerMessageId,
            newStatus,
            phoneNumberId
          });

          // Check for duplicates
          if (isDuplicateWebhookEvent(providerMessageId, newStatus)) {
            processedCount++;
            continue;
          }

          // Find the message and get tenant_id
          const message = db.prepare(`
            SELECT tenant_id FROM messages WHERE provider_message_id = ?
          `).get(providerMessageId);

          if (!message) {
            console.warn(`⚠️  Message not found for: ${providerMessageId}`);
            continue;
          }

          // Update message status
          updateMessageStatus(message.tenant_id, providerMessageId, newStatus, eventTimestamp);

          // Get campaign_id to update metrics
          const msg = db.prepare(`
            SELECT campaign_id FROM messages WHERE provider_message_id = ?
          `).get(providerMessageId);

          if (msg) {
            updateCampaignMetrics(msg.campaign_id, message.tenant_id);

            // Broadcast metrics update to SSE clients
            metricsEmitter.emit(`campaign:${msg.campaign_id}:metrics`);
            console.log(`📡 Metrics broadcast for campaign ${msg.campaign_id}`);
          }

          processedCount++;
        }
      }
    }

    res.status(200).json({
      success: true,
      processed: processedCount,
      message: `Processed ${processedCount} status updates`
    });
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    logWebhookEvent('whatsapp', 'error', { error: error.message }, 'error');
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /webhooks/whatsapp
 * Webhook verification endpoint for Meta WhatsApp
 * Meta sends a verification challenge to confirm the webhook URL
 */
router.get('/whatsapp', (req, res) => {
  const challenge = req.query.hub_challenge;
  const verifyToken = req.query.hub_verify_token;
  const mode = req.query.hub_mode;

  // In production, verify the token matches your configured token
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test-verify-token';

  if (mode === 'subscribe' && verifyToken === expectedToken) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.warn('❌ WhatsApp webhook verification failed');
    res.status(403).json({ error: 'Verification failed' });
  }
});

/**
 * POST /webhooks/email
 * Receive email provider status updates (SES, Brevo, etc.)
 *
 * SES SNS notification format:
 * {
 *   "Message": "{...}",
 *   "MessageId": "...",
 *   "Timestamp": "...",
 *   "TopicArn": "arn:aws:sns:...",
 *   "Type": "Notification",
 *   "UnsubscribeURL": "..."
 * }
 *
 * Inner message is JSON-stringified and contains:
 * {
 *   "eventType": "Send|Bounce|Delivery|Open|Click|Complaint|Send|Reject|...",
 *   "mail": {
 *     "messageId": "...",
 *     "timestamp": "...",
 *     "source": "...",
 *     "sourceArn": "...",
 *     "sendingAccountId": "...",
 *     "destination": ["recipient@example.com"],
 *     "headersTruncated": false,
 *     "headers": [...],
 *     "commonHeaders": {...}
 *   },
 *   "bounce": {...},
 *   "delivery": {...},
 *   "send": {...},
 *   "open": {...},
 *   "click": {...}
 * }
 */
router.post('/email', (req, res) => {
  try {
    const body = req.body;

    // Handle SNS subscription confirmation
    if (body.Type === 'SubscriptionConfirmation') {
      console.log('✅ Email provider (SNS) subscription confirmation');
      // In production, verify the signature and confirm the subscription
      // For now, just acknowledge
      return res.status(200).json({ success: true });
    }

    // Handle SNS notification
    if (body.Type !== 'Notification') {
      console.warn('⚠️  Invalid SNS notification type:', body.Type);
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    // Parse the inner message
    let sesEvent;
    try {
      sesEvent = JSON.parse(body.Message);
    } catch (error) {
      console.warn('⚠️  Failed to parse SNS message:', error.message);
      return res.status(400).json({ error: 'Invalid SNS message format' });
    }

    const { eventType, mail } = sesEvent;

    if (!eventType || !mail) {
      console.warn('⚠️  Missing event type or mail data in SES event');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const messageId = mail.messageId;

    logWebhookEvent('email_ses', eventType, {
      messageId,
      recipients: mail.destination
    });

    let statusUpdate = null;

    // Map SES event types to our status values
    switch (eventType) {
      case 'Send':
        statusUpdate = { newStatus: 'sent', eventTimestamp: mail.timestamp };
        break;
      case 'Delivery':
        statusUpdate = { newStatus: 'delivered', eventTimestamp: sesEvent.delivery?.timestamp };
        break;
      case 'Open':
        statusUpdate = { newStatus: 'read', eventTimestamp: sesEvent.open?.timestamp };
        break;
      case 'Bounce':
      case 'Reject':
        statusUpdate = { newStatus: 'failed', eventTimestamp: sesEvent.bounce?.timestamp || mail.timestamp };
        break;
      case 'Click':
        // Clicks don't change status, but we could track them separately
        statusUpdate = null;
        break;
      case 'Complaint':
        // Mark as failed on complaints
        statusUpdate = { newStatus: 'failed', eventTimestamp: sesEvent.complaint?.timestamp };
        break;
      default:
        console.log(`⚠️  Unhandled SES event type: ${eventType}`);
        statusUpdate = null;
    }

    if (statusUpdate) {
      // Check for duplicates
      if (!isDuplicateWebhookEvent(messageId, statusUpdate.newStatus)) {
        // Find the message and get tenant_id
        const message = db.prepare(`
          SELECT tenant_id, campaign_id FROM messages WHERE provider_message_id = ?
        `).get(messageId);

        if (message) {
          updateMessageStatus(message.tenant_id, messageId, statusUpdate.newStatus, statusUpdate.eventTimestamp);
          updateCampaignMetrics(message.campaign_id, message.tenant_id);

          // Broadcast metrics update to SSE clients
          metricsEmitter.emit(`campaign:${message.campaign_id}:metrics`);
          console.log(`📡 Metrics broadcast for campaign ${message.campaign_id}`);
        } else {
          console.warn(`⚠️  Message not found for SES: ${messageId}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      messageId,
      eventType,
      message: `Processed ${eventType} event`
    });
  } catch (error) {
    console.error('❌ Email webhook error:', error);
    logWebhookEvent('email_ses', 'error', { error: error.message }, 'error');
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /webhooks/health
 * Health check for webhook system
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    webhooks: {
      whatsapp: 'operational',
      email: 'operational'
    },
    recentEvents: webhookEventLog.slice(-10),
    totalEventsLogged: webhookEventLog.length
  });
});

/**
 * GET /webhooks/events
 * Get recent webhook events (for debugging)
 */
router.get('/events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const events = webhookEventLog.slice(-limit);

  res.json({
    totalLogged: webhookEventLog.length,
    returned: events.length,
    events
  });
});

module.exports = router;
