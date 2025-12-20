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
const { getProvider } = require('../services/messaging/providerFactory');
const EmailService = require('../services/emailService');

// ===== CONFIGURATION =====
const ENABLE_WEBHOOK_VERIFICATION = process.env.ENABLE_WEBHOOK_VERIFICATION === 'true';
const ENABLE_EMAIL_WEBHOOK_VERIFICATION = process.env.ENABLE_EMAIL_WEBHOOK_VERIFICATION === 'true' || ENABLE_WEBHOOK_VERIFICATION;
const SES_WEBHOOK_SECRET = process.env.SES_WEBHOOK_SECRET || 'test-webhook-secret';

// Webhook event log for debugging
const webhookEventLog = [];
const MAX_LOG_ENTRIES = 1000;

// Ensure message_status_events has status_reason column
const ensureStatusEventsColumns = () => {
  const cols = db.prepare(`PRAGMA table_info(message_status_events)`).all();
  const names = cols.map(c => c.name);
  if (!names.includes('status_reason')) {
    try {
      db.prepare(`ALTER TABLE message_status_events ADD COLUMN status_reason TEXT`).run();
    } catch (e) {
      console.warn('⚠️  Unable to add status_reason to message_status_events:', e.message);
    }
  }
};

// Ensure optional webhook columns exist (per-tenant)
const ensureWhatsAppWebhookColumns = () => {
  const cols = db.prepare(`PRAGMA table_info(tenant_channel_settings)`).all();
  const names = cols.map(c => c.name);
  const addCol = (name) => {
    if (!names.includes(name)) {
      try {
        db.prepare(`ALTER TABLE tenant_channel_settings ADD COLUMN ${name} TEXT`).run();
      } catch (e) {
        console.warn(`⚠️ Could not add column ${name}:`, e.message);
      }
    }
  };
  addCol('webhook_verify_token');
  addCol('webhook_secret');
};

/**
 * Decrypt credentials (copied from settings/messageQueue)
 */
const decryptCredentials = (encryptedData) => {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Decryption error:', err.message);
    return null;
  }
};

// ===== HELPERS =====

/**
 * Verify Meta WhatsApp webhook signature
 * Meta sends X-Hub-Signature header with HMAC-SHA256 signature
 */
const verifyWhatsAppSignature = (body, signature, secret) => {
  if (!ENABLE_WEBHOOK_VERIFICATION) {
    console.log('⚠️  Webhook verification disabled (ENABLE_WEBHOOK_VERIFICATION=false)');
    return true;
  }

  const signingSecret = secret;
  if (!signingSecret) {
    console.warn('⚠️  No WhatsApp webhook secret found for tenant; rejecting');
    return false;
  }

  if (!signature) {
    console.warn('⚠️  Missing X-Hub-Signature-256 header');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', signingSecret)
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
 * Verify SES/SNS webhook signature (HMAC-SHA256 over body)
 */
const verifyEmailSignature = (body, signature) => {
  if (!ENABLE_EMAIL_WEBHOOK_VERIFICATION) {
    console.log('⚠️  Email webhook verification disabled (ENABLE_EMAIL_WEBHOOK_VERIFICATION=false)');
    return true;
  }

  if (!signature) {
    console.warn('⚠️  Missing email webhook signature header');
    return false;
  }

  if (!SES_WEBHOOK_SECRET) {
    console.warn('⚠️  No SES webhook secret configured; rejecting');
    return false;
  }

  const hash = crypto.createHmac('sha256', SES_WEBHOOK_SECRET).update(body).digest('hex');
  const expectedSignature = `sha256=${hash}`;
  const isValid = expectedSignature === signature;

  if (!isValid) {
    console.warn('⚠️  Invalid SES webhook signature', { expected: expectedSignature, received: signature });
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
const updateMessageStatus = (tenantId, providerMessageId, newStatus, eventTimestamp, statusReason = null) => {
  try {
    ensureStatusEventsColumns();

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
      SET status = ?, updated_at = ?, status_reason = COALESCE(?, status_reason)
    `;
    const params = [newStatus, now, statusReason];

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
        event_timestamp, webhook_received_at, created_at, status_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      message.id,
      providerMessageId,
      message.old_status,
      newStatus,
      eventTimestamp || now,
      now,
      now,
      statusReason || null
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

/**
 * Handle template status update webhook events from Meta
 * Meta sends message_template_status_update events when templates are approved, rejected, etc.
 *
 * Webhook format from Meta:
 * {
 *   "entry": [{
 *     "id": "waba_id",
 *     "changes": [{
 *       "field": "message_template_status_update",
 *       "value": {
 *         "event": "APPROVED|REJECTED|PAUSED|DISABLED",
 *         "message_template_id": "123456",
 *         "message_template_name": "order_update",
 *         "message_template_language": "en",
 *         "reason": "..."  // Only for rejections
 *       }
 *     }]
 *   }]
 * }
 */
function handleTemplateStatusUpdate(entry) {
  try {
    if (!entry.changes || !Array.isArray(entry.changes)) return;

    for (const change of entry.changes) {
      if (change.field !== 'message_template_status_update') continue;

      const { value } = change;
      if (!value) continue;

      const {
        event,
        message_template_id,
        message_template_name,
        message_template_language,
        reason
      } = value;

      if (!message_template_id && !message_template_name) {
        console.warn('⚠️  Missing template identifier in webhook');
        continue;
      }

      logWebhookEvent('whatsapp', 'template_status_update', {
        event,
        template_id: message_template_id,
        template_name: message_template_name,
        language: message_template_language
      });

      // Find template by meta_template_id or name
      let template;
      if (message_template_id) {
        template = db.prepare(`
          SELECT id, tenant_id, status FROM whatsapp_templates
          WHERE meta_template_id = ?
        `).get(message_template_id);
      }

      if (!template && message_template_name) {
        template = db.prepare(`
          SELECT id, tenant_id, status FROM whatsapp_templates
          WHERE name = ? AND language = ?
          ORDER BY created_at DESC LIMIT 1
        `).get(message_template_name, message_template_language || 'en');
      }

      if (!template) {
        console.warn(`⚠️  Template not found for: ${message_template_name} (${message_template_id})`);
        continue;
      }

      // Update template status
      const now = new Date().toISOString();
      const oldStatus = template.status;

      db.prepare(`
        UPDATE whatsapp_templates
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).run(event, now, template.id);

      console.log(`✅ Template ${template.id} status updated: ${oldStatus} → ${event}`);

      // Broadcast status update to SSE clients if metrics emitter is available
      if (metricsEmitter) {
        metricsEmitter.emit(`template:${template.id}:status`, {
          template_id: template.id,
          old_status: oldStatus,
          new_status: event,
          reason: reason || null,
          updated_at: now
        });
      }
    }
  } catch (error) {
    console.error('❌ Error handling template status update:', error);
  }
}

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
    ensureWhatsAppWebhookColumns();
    // Convert raw body to string for signature verification
    const bodyString = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const signature = req.headers['x-hub-signature-256'];

    // Parse the body
    const body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? JSON.parse(bodyString || '{}') : req.body;

    // Resolve tenant secret from phone_number_id
    let tenantSecret = null;
    let tenantIdForEvent = null;
    const phoneNumberIdFromMeta = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    console.log('🔎 Incoming WhatsApp webhook', {
      phoneNumberId: phoneNumberIdFromMeta,
      signature: signature || '(none)',
      verificationEnabled: ENABLE_WEBHOOK_VERIFICATION
    });
    if (phoneNumberIdFromMeta) {
      const channels = db.prepare(`SELECT tenant_id, credentials_encrypted, webhook_secret FROM tenant_channel_settings WHERE channel = 'whatsapp'`).all();
      for (const ch of channels) {
        const creds = decryptCredentials(ch.credentials_encrypted) || {};
        if (creds.phone_number_id && creds.phone_number_id === phoneNumberIdFromMeta) {
          tenantSecret = ch.webhook_secret || null;
          tenantIdForEvent = ch.tenant_id;
          break;
        }
      }
    }
    // Fallback: if we didn't find a tenant by phone_number_id, use the first WhatsApp secret (helps Meta sample tests)
    if (!tenantSecret) {
      const fallback = db.prepare(`SELECT tenant_id, webhook_secret FROM tenant_channel_settings WHERE channel = 'whatsapp' LIMIT 1`).get();
      if (fallback) {
        tenantSecret = fallback.webhook_secret;
        tenantIdForEvent = tenantIdForEvent || fallback.tenant_id;
        console.log('ℹ️  Using fallback WhatsApp webhook secret (no phone_number_id match)');
      }
    }

    // Verify webhook signature
    const sigOk = verifyWhatsAppSignature(bodyString, signature, tenantSecret);
    if (!sigOk) {
      console.warn('❌ WhatsApp webhook signature verification failed', { phoneNumberIdFromMeta, tenantIdForEvent });
      return res.status(401).json({ error: 'Invalid signature' });
    }

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

        // Handle template status updates
        if (field === 'message_template_status_update') {
          handleTemplateStatusUpdate(entry);
          processedCount++;
          continue;
        }

        // Only process message status updates
        if (field !== 'messages') continue;
        if (!value || !value.statuses) continue;

        // Extract tenant_id from metadata if available
        // In production, you'd have a way to map phone_number_id to tenant
        const phoneNumberId = value.metadata?.phone_number_id;

        for (const status of value.statuses) {
          const { id: providerMessageId, status: newStatus, timestamp: eventTimestamp, errors } = status;

          if (!providerMessageId || !newStatus) continue;

          logWebhookEvent('whatsapp', 'message_status', {
            providerMessageId,
            newStatus,
            phoneNumberId,
            tenant_id: tenantIdForEvent
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

          const statusReason = Array.isArray(errors) && errors.length > 0 ? (errors[0].title || errors[0].message) : null;

          // Update message status
          updateMessageStatus(message.tenant_id, providerMessageId, newStatus, eventTimestamp, statusReason);

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
  // Meta may send hub.challenge (dot) or hub_challenge (underscore)
  const challenge = req.query['hub.challenge'] || req.query.hub_challenge;
  const verifyToken = req.query['hub.verify_token'] || req.query.hub_verify_token;
  const mode = req.query['hub.mode'] || req.query.hub_mode;

  ensureWhatsAppWebhookColumns();

  // Look up verify token per tenant; fallback to env if not found
  let tokenMatch = false;
  if (verifyToken) {
    const rows = db.prepare(`SELECT webhook_verify_token FROM tenant_channel_settings WHERE channel = 'whatsapp'`).all();
    tokenMatch = rows.some(r => r.webhook_verify_token === verifyToken);
  }

  if (mode === 'subscribe' && tokenMatch) {
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
    const bodyString = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    const signature = req.headers['x-ses-signature'] || req.headers['x-amz-sns-signature'] || req.headers['x-engageninja-signature'];
    if (!verifyEmailSignature(bodyString, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const body = JSON.parse(bodyString || '{}');

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
 * POST /webhooks/twilio
 * Twilio status callback for SMS and WhatsApp messages
 *
 * Twilio sends form-urlencoded data with:
 * - MessageSid: Provider message ID
 * - MessageStatus: sent, delivered, failed, undelivered, read
 * - AccountSid: Twilio account identifier
 * - To/From: Phone numbers
 */
router.post('/twilio', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    // 1. Log incoming webhook
    logWebhookEvent('twilio', req.body, req.headers);

    // 2. Extract message info
    const { MessageSid, MessageStatus } = req.body;

    if (!MessageSid || !MessageStatus) {
      console.warn('[Webhook] Twilio: Missing MessageSid or MessageStatus');
      return res.status(400).send('Missing MessageSid or MessageStatus');
    }

    // 3. Find message by provider_message_id
    const message = db.prepare(`
      SELECT m.id, m.tenant_id, m.campaign_id, m.status, m.channel
      FROM messages m
      WHERE m.provider_message_id = ?
      LIMIT 1
    `).get(MessageSid);

    if (!message) {
      console.log(`[Webhook] Twilio: Message not found for MessageSid: ${MessageSid}`);
      return res.status(200).send('OK'); // Acknowledge but don't process
    }

    // 4. Get provider for signature verification
    let provider;
    try {
      provider = await getProvider(message.tenant_id, message.channel);
    } catch (error) {
      console.error(`[Webhook] Twilio: Failed to get provider for message:`, error.message);
      return res.status(200).send('OK'); // Acknowledge but can't verify
    }

    // 5. Verify webhook signature if enabled
    if (process.env.ENABLE_WEBHOOK_VERIFICATION === 'true') {
      const signature = req.headers['x-twilio-signature'];
      const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:5173'}/webhooks/twilio`;

      try {
        const isValid = provider.verifyWebhookSignature(req.body, signature, webhookUrl);

        if (!isValid) {
          console.error('[Webhook] Twilio: Invalid signature for MessageSid:', MessageSid);
          return res.status(403).send('Invalid signature');
        }
      } catch (error) {
        console.warn('[Webhook] Twilio: Signature verification error:', error.message);
        // Continue anyway, might not have webhook URL configured
      }
    }

    // 6. Parse webhook using provider
    let parsed;
    try {
      parsed = provider.parseWebhook(req.body, req.headers['x-twilio-signature']);

      if (parsed.error) {
        console.error('[Webhook] Twilio: Parsing failed:', parsed.error);
        return res.status(200).send('OK'); // Acknowledge but can't parse
      }
    } catch (error) {
      console.error('[Webhook] Twilio: Parsing exception:', error.message);
      return res.status(200).send('OK');
    }

    // 7. Update message status
    const now = new Date().toISOString();
    const statusReason = req.body.ErrorCode ? `Error ${req.body.ErrorCode}: ${req.body.ErrorMessage}` : null;

    // Check for duplicate webhook event
    const isDuplicate = db.prepare(`
      SELECT id FROM message_status_events
      WHERE message_id = ? AND new_status = ? AND created_at > datetime('now', '-60 seconds')
    `).get(message.id, parsed.status);

    if (isDuplicate) {
      console.log(`[Webhook] Twilio: Duplicate event for message ${message.id}, ignoring`);
      return res.status(200).send('OK');
    }

    // Update messages table
    db.prepare(`
      UPDATE messages
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(parsed.status, now, message.id);

    // Log event
    const eventId = uuidv4();
    db.prepare(`
      INSERT INTO message_status_events (id, message_id, provider_message_id, old_status, new_status, event_timestamp, webhook_received_at, status_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, message.id, MessageSid, message.status, parsed.status, parsed.timestamp.toISOString(), now, statusReason);

    // Update timestamp columns based on status
    const updates = {};
    if (parsed.status === 'sent') updates.sent_at = now;
    if (parsed.status === 'delivered') updates.delivered_at = now;
    if (parsed.status === 'read') updates.read_at = now;
    if (parsed.status === 'failed') updates.failed_at = now;

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE messages SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), message.id);
    }

    // 8. Broadcast metrics update via SSE
    if (message.campaign_id) {
      try {
        // Get campaign metrics
        const campaignMetrics = db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
          FROM messages
          WHERE campaign_id = ?
        `).get(message.campaign_id);

        metricsEmitter.emit('campaign:metrics', {
          campaign_id: message.campaign_id,
          tenant_id: message.tenant_id,
          ...campaignMetrics
        });
      } catch (error) {
        console.error('[Webhook] Twilio: Failed to broadcast metrics:', error.message);
      }
    }

    console.log(`✓ [Webhook] Twilio: Updated message ${message.id} to status ${parsed.status}`);
    res.status(200).send('OK');

  } catch (error) {
    console.error('[Webhook] Twilio: Unexpected error:', error);
    res.status(500).send('Internal server error');
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

/**
 * POST /webhooks/billing/stripe
 * Receive Stripe webhook events for subscription management
 *
 * Events handled:
 * - customer.subscription.created - New subscription
 * - customer.subscription.updated - Subscription changes
 * - customer.subscription.deleted - Subscription canceled
 * - invoice.paid - Invoice paid
 * - invoice.payment_failed - Payment failed
 */
router.post('/billing/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get the raw body for signature verification
    const bodyString = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    const signature = req.headers['stripe-signature'];

    // Get billing service from app context (passed via app.locals)
    const billingService = req.app.locals.billingService;
    if (!billingService) {
      console.warn('⚠️  Stripe webhook received but billing service not initialized');
      return res.status(503).json({ error: 'Billing service not available' });
    }

    // Verify webhook signature
    const isValid = await billingService.verifyWebhookSignature(bodyString, signature);
    if (!isValid) {
      console.warn('❌ Stripe webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the event
    const event = JSON.parse(bodyString || '{}');
    const { type, id } = event;

    console.log(`📩 Stripe webhook received: ${type} (${id})`);
    logWebhookEvent('stripe', type, { event_id: id });

    // Check for duplicate webhook processing
    const existing = db
      .prepare(`SELECT id FROM webhook_processing_log WHERE provider = 'stripe' AND provider_event_id = ?`)
      .get(id);

    if (existing) {
      console.log(`⚠️  Stripe webhook already processed: ${id}`);
      return res.status(200).json({ message: 'Webhook already processed' });
    }

    // Process the webhook
    const result = await billingService.handleWebhook(event);

    // Log successful processing
    db.prepare(
      `INSERT INTO webhook_processing_log (provider, provider_event_id, event_type, result, created_at)
       VALUES ('stripe', ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(id, type, JSON.stringify(result));

    console.log(`✅ Stripe webhook processed: ${type}`);

    // Send email notifications based on webhook result
    if (result && result.tenantId) {
      try {
        const emailService = new EmailService();
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(result.tenantId);

        if (tenant && result.notification) {
          const notif = result.notification;

          if (notif.type === 'payment_failed') {
            // Send payment failure email
            await emailService.sendBillingFailureEmail(tenant, notif.failureReason, notif.gracePeriodUntil);
            console.log('📧 Payment failure email sent to tenant:', tenant.id);
          } else if (notif.type === 'payment_succeeded') {
            // Send payment success email
            await emailService.sendPaymentSuccessEmail(tenant);
            console.log('📧 Payment success email sent to tenant:', tenant.id);
          } else if (notif.type === 'subscription_cancelled') {
            // Send subscription cancellation email
            await emailService.sendSubscriptionCancelledEmail(tenant, notif.canceledAt, notif.reason);
            console.log('📧 Subscription cancellation email sent to tenant:', tenant.id);
          }
        }
      } catch (emailError) {
        console.warn('⚠️  Failed to send email notification:', emailError.message);
        // Don't crash the server if email fails - webhook was already processed
      }
    }

    res.status(200).json({ received: true, event_id: id });
  } catch (error) {
    console.error('❌ Stripe webhook error:', error);
    logWebhookEvent('stripe', 'error', { error: error.message }, 'error');

    // Return 200 to acknowledge receipt and prevent Stripe retries
    // Stripe will retry if we return 4xx/5xx
    res.status(200).json({ error: 'Internal processing error', message: error.message });
  }
});

/**
 * TEST ENDPOINT: Manually trigger Stripe webhook events (dev/test only)
 * POST /webhooks/test/stripe-event
 * Body: { event_type: 'invoice.paid', tenant_id: 'xxx', amount: 9900 }
 *
 * This endpoint allows developers to test webhook handling without waiting for actual Stripe events.
 * Only available if NODE_ENV is development or test.
 */
router.post('/test/stripe-event', async (req, res) => {
  // Only allow in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoint not available in production' });
  }

  try {
    // Parse body if it's a Buffer (due to express.raw() middleware)
    let bodyData = req.body;
    if (Buffer.isBuffer(bodyData)) {
      bodyData = JSON.parse(bodyData.toString('utf8'));
    }

    const { event_type, tenant_id, amount = 9900 } = bodyData;

    if (!event_type || !tenant_id) {
      return res.status(400).json({
        error: 'Missing required fields: event_type, tenant_id',
        example: {
          event_type: 'invoice.paid',
          tenant_id: 'some-uuid',
          amount: 9900
        }
      });
    }

    console.log(`\n🧪 TEST WEBHOOK: Creating ${event_type} event for tenant ${tenant_id}`);

    // Get tenant and their Stripe customer
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const billingCustomer = db
      .prepare(`SELECT provider_customer_id FROM billing_customers WHERE tenant_id = ? AND provider = 'stripe'`)
      .get(tenant_id);

    if (!billingCustomer) {
      return res.status(400).json({
        error: 'No Stripe customer found for tenant. Create one first.',
        help: 'Call POST /api/billing/checkout-session first'
      });
    }

    // Get billing service
    const billingService = req.app.locals.billingService;
    if (!billingService) {
      return res.status(503).json({ error: 'Billing service not initialized' });
    }

    // Build mock Stripe event based on type
    let event = null;
    const eventId = `evt_test_${Date.now()}`;

    switch (event_type) {
      case 'invoice.paid':
        event = {
          id: eventId,
          type: 'invoice.paid',
          data: {
            object: {
              id: `in_test_${Date.now()}`,
              customer: billingCustomer.provider_customer_id,
              amount_paid: amount,
              currency: 'usd',
              created: Math.floor(Date.now() / 1000),
              hosted_invoice_url: 'https://example.com/invoice',
              metadata: { tenant_id: tenant_id }
            }
          }
        };
        break;

      case 'invoice.payment_failed':
        event = {
          id: eventId,
          type: 'invoice.payment_failed',
          data: {
            object: {
              id: `in_test_${Date.now()}`,
              customer: billingCustomer.provider_customer_id,
              amount_due: amount,
              currency: 'usd',
              created: Math.floor(Date.now() / 1000),
              metadata: { tenant_id: tenant_id },
              last_finalization_error: {
                code: 'card_declined',
                message: 'Your card was declined'
              }
            }
          }
        };
        break;

      case 'customer.subscription.created':
        event = {
          id: eventId,
          type: 'customer.subscription.created',
          data: {
            object: {
              id: `sub_test_${Date.now()}`,
              customer: billingCustomer.provider_customer_id,
              status: 'active',
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
              cancel_at_period_end: false,
              metadata: { tenant_id: tenant_id, plan_key: 'starter' }
            }
          }
        };
        break;

      default:
        return res.status(400).json({
          error: `Unsupported event type: ${event_type}`,
          supported: ['invoice.paid', 'invoice.payment_failed', 'customer.subscription.created']
        });
    }

    // Process the event
    console.log(`🧪 Processing test event:`, event);
    const result = await billingService.handleWebhook(event);

    // Log the test event
    db.prepare(
      `INSERT OR IGNORE INTO webhook_processing_log (provider, provider_event_id, event_type, result, created_at)
       VALUES ('stripe', ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(eventId, event_type, JSON.stringify(result));

    console.log(`✅ Test event processed:`, result);

    // Send email notifications (matching real webhook handler)
    if (result && result.tenantId) {
      try {
        const emailService = new EmailService();
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(result.tenantId);

        if (tenant && result.notification) {
          const notif = result.notification;

          if (notif.type === 'payment_failed') {
            await emailService.sendBillingFailureEmail(tenant, notif.failureReason, notif.gracePeriodUntil);
            console.log('📧 Payment failure email sent to tenant:', tenant.id);
          } else if (notif.type === 'payment_succeeded') {
            await emailService.sendPaymentSuccessEmail(tenant);
            console.log('📧 Payment success email sent to tenant:', tenant.id);
          } else if (notif.type === 'subscription_cancelled') {
            await emailService.sendSubscriptionCancelledEmail(tenant, notif.canceledAt, notif.reason);
            console.log('📧 Subscription cancellation email sent to tenant:', tenant.id);
          }
        }
      } catch (emailError) {
        console.warn('⚠️  Failed to send email notification:', emailError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Test event ${event_type} processed successfully`,
      event_id: eventId,
      result
    });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({
      error: 'Failed to process test event',
      message: error.message
    });
  }
});

/**
 * Create webhook_processing_log table if it doesn't exist
 * This prevents duplicate webhook processing
 */
const ensureWebhookLogTable = () => {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS webhook_processing_log (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        provider TEXT NOT NULL,
        provider_event_id TEXT NOT NULL,
        event_type TEXT,
        result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_event_id)
      )
    `).run();
  } catch (error) {
    console.warn('⚠️  Unable to create webhook_processing_log table:', error.message);
  }
};

// Initialize on module load
ensureWebhookLogTable();

module.exports = router;
