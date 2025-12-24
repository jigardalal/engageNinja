const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../../utils/db');
const { decryptCredentials } = require('../../utils/crypto');
const TwilioSmsProvider = require('../../providers/twilioSmsProvider');
const { notifyMetrics } = require('../../utils/metrics');

const eventBridge = new AWS.EventBridge();
const pool = getPool();
const eventSource = process.env.EVENT_BRIDGE_SOURCE || 'engageninja.messaging';

const STATUS_SCHEDULES = [
  { status: 'delivered', delayMs: 3000 },
  { status: 'read', delayMs: 8000 }
];

exports.handler = async (event) => {
  const records = event.Records || [];
  const results = [];

  for (const record of records) {
    let payload;
    try {
      payload = JSON.parse(record.body);
    } catch (error) {
      console.error('Invalid SQS payload', error.message);
      results.push({ error: 'invalid_payload' });
      continue;
    }

    results.push(await processPayload(payload));
  }

  return {
    statusCode: 200,
    processed: results.length,
    detail: results
  };
};

async function processPayload(payload) {
  if (!payload || !payload.messageId) {
    return { error: 'missing_message_id' };
  }

  const client = await pool.connect();
  try {
    const message = await fetchMessage(client, payload.messageId);
    if (!message) {
      return { messageId: payload.messageId, error: 'message_not_found' };
    }

    if (message.status !== 'queued') {
      return { messageId: payload.messageId, status: message.status };
    }

    const contact = await fetchContact(client, message.contact_id);
    if (!contact || !contact.phone) {
      const err = 'contact_phone_missing';
      await markFailed(client, message.id, err);
      return { messageId: message.id, error: err };
    }

    const campaign = await fetchCampaign(client, message.campaign_id);
    if (!campaign) {
      const err = 'campaign_not_found';
      await markFailed(client, message.id, err);
      return { messageId: message.id, error: err };
    }

    // Check if tenant is in demo mode
    const tenant = await fetchTenant(client, message.tenant_id);
    if (!tenant) {
      const err = 'tenant_not_found';
      await markFailed(client, message.id, err);
      return { messageId: message.id, error: err };
    }

    if (tenant.is_demo) {
      // Simulate the send instead of calling real provider
      console.log(`[Demo Mode] Tenant ${message.tenant_id} is in demo mode - simulating message send`);
      return await simulateDemoSend(client, message, campaign);
    }

    const channelConfig = await fetchChannelSettings(client, message.tenant_id, message.channel);
    if (!channelConfig) {
      const err = 'channel_not_configured';
      await markFailed(client, message.id, err);
      return { messageId: message.id, error: err };
    }

    if (message.channel !== 'sms' && message.channel !== 'whatsapp') {
      const err = `unsupported_channel:${message.channel}`;
      await markFailed(client, message.id, err);
      return { messageId: message.id, error: err };
    }

    const credentials = decryptCredentials(channelConfig.credentials_encrypted);
    if (!credentials) {
      const err = 'missing_credentials';
      await markFailed(client, message.id, err);
      return { messageId: message.id, error: err };
    }

    const provider = new TwilioSmsProvider(credentials, {
      phone_number: channelConfig.phone_number,
      messaging_service_sid: channelConfig.messaging_service_sid,
      status_callback: process.env.TWILIO_STATUS_CALLBACK_URL
    });

    const body = formatMessageBody(campaign.message_content, message.content_snapshot);
    const recipient = formatRecipient(message.channel, contact.phone);

    const payloadToSend = {
      to: recipient,
      body,
      messagingServiceSid: channelConfig.messaging_service_sid,
      from: channelConfig.phone_number,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL
    };

    console.log('✔ Sending Twilio message', { tenantId: message.tenant_id, messageId: message.id, to: recipient });

    const result = await provider.send(payloadToSend);

    await updateMessageSent(client, message.id, result.sid, result.status || 'sent');
    await createMapping(client, message, result.sid, result.status || 'sent');
    await logStatusEvent(client, message.id, result.sid, message.status, 'sent');

    message.status = 'sent';
    message.provider_message_id = result.sid;

    await scheduleStatusEvents(message);

    await notifyMetrics({
      message_id: message.id,
      tenant_id: message.tenant_id,
      campaign_id: message.campaign_id
    });

    return { messageId: message.id, providerId: result.sid };
  } catch (error) {
    console.error('SendCampaignMessage error', error);
    await markFailed(client, payload.messageId, error.message);
    return { messageId: payload.messageId, error: error.message };
  } finally {
    client.release();
  }
}

async function fetchMessage(client, messageId) {
  const res = await client.query('SELECT * FROM messages WHERE id = $1', [messageId]);
  return res.rows[0];
}

async function fetchContact(client, contactId) {
  const res = await client.query('SELECT phone, email FROM contacts WHERE id = $1', [contactId]);
  return res.rows[0];
}

async function fetchCampaign(client, campaignId) {
  const res = await client.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
  return res.rows[0];
}

async function fetchTenant(client, tenantId) {
  const res = await client.query('SELECT id, is_demo FROM tenants WHERE id = $1', [tenantId]);
  return res.rows[0];
}

async function fetchChannelSettings(client, tenantId, channel) {
  const res = await client.query(
    `SELECT provider, credentials_encrypted, provider_config_json, webhook_url, phone_number, messaging_service_sid
     FROM tenant_channel_settings
     WHERE tenant_id = $1 AND channel = $2
       AND (is_enabled = true OR is_enabled = 1)`,
    [tenantId, channel]
  );

  const row = res.rows[0];
  if (!row) {
    return null;
  }

  let parsed = {};
  if (row.provider_config_json) {
    try {
      parsed = JSON.parse(row.provider_config_json);
    } catch (error) {
      console.warn('Unable to parse provider_config_json:', error.message);
    }
  }

  return {
    ...row,
    ...parsed,
    phone_number: row.phone_number || parsed.phone_number,
    messaging_service_sid: row.messaging_service_sid || parsed.messaging_service_sid,
    webhook_url: row.webhook_url || parsed.webhook_url
  };
}

function formatRecipient(channel, phone) {
  if (!phone) {
    return null;
  }
  const normalized = phone.trim();
  if (channel === 'whatsapp') {
    return normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;
  }
  return normalized;
}

function formatMessageBody(content, fallback) {
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }
  if (fallback && typeof fallback === 'string') {
    return fallback;
  }
  try {
    return JSON.stringify(content || fallback);
  } catch (error) {
    return '';
  }
}

async function simulateDemoSend(client, message, campaign) {
  /**
   * Simulate message send for demo tenants
   * - Generate realistic demo message ID
   * - Update message status to 'sent'
   * - Create provider mapping
   * - Log status event
   * - Schedule delivery/read updates
   * - Notify metrics
   */

  // Generate a realistic demo message ID (similar to Twilio SID format: SMxxxxxxxxxxxxxxxxxxxxxxxx)
  const demoMessageId = 'SM' + require('crypto').randomBytes(17).toString('hex').toUpperCase().substring(0, 30);

  console.log(`[Demo] Simulating message send: ${message.id} -> ${demoMessageId}`);

  // Update message as sent
  await updateMessageSent(client, message.id, demoMessageId, 'sent');

  // Create provider mapping
  await createMapping(client, message, demoMessageId, 'sent');

  // Log status event
  await logStatusEvent(client, message.id, demoMessageId, message.status, 'sent');

  // Schedule simulated delivery/read updates
  message.status = 'sent';
  message.provider_message_id = demoMessageId;
  await scheduleStatusEvents(message);

  // Notify metrics for real-time SSE updates
  await notifyMetrics({
    message_id: message.id,
    tenant_id: message.tenant_id,
    campaign_id: message.campaign_id
  });

  return { messageId: message.id, providerId: demoMessageId, demo: true };
}

async function markFailed(client, messageId, reason) {
  if (!messageId) {
    return;
  }
  const now = new Date().toISOString();
  await client.query(
    `UPDATE messages SET status = 'failed', status_reason = $1, failed_at = $2, updated_at = $2 WHERE id = $3`,
    [reason, now, messageId]
  );
  await logStatusEvent(client, messageId, null, 'queued', 'failed', reason);
  try {
    await notifyMetrics({ message_id: messageId });
  } catch (err) {
    console.error('Unable to notify metrics on failure', err.message);
  }
}

async function updateMessageSent(client, messageId, providerId, providerStatus) {
  const now = new Date().toISOString();
  await client.query(
    `UPDATE messages
     SET provider_message_id = $1,
         status = 'sent',
         sent_at = $2,
         updated_at = $2
     WHERE id = $3`,
    [providerId, now, messageId]
  );
}

async function createMapping(client, message, providerId, providerStatus) {
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO message_provider_mappings
     (id, message_id, channel, provider, provider_message_id, provider_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     ON CONFLICT (message_id, provider) DO UPDATE SET provider_message_id = $5, provider_status = $6, updated_at = $7`,
    [uuidv4(), message.id, message.channel, message.provider || 'twilio', providerId, providerStatus, now]
  );
}

async function logStatusEvent(client, messageId, providerMessageId, oldStatus, newStatus, reason = null) {
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO message_status_events
     (id, message_id, provider_message_id, old_status, new_status, event_timestamp, webhook_received_at, status_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7)`
    , [uuidv4(), messageId, providerMessageId, oldStatus || 'queued', newStatus, now, reason]
  );
}

async function scheduleStatusEvents(message) {
  for (const entry of STATUS_SCHEDULES) {
    try {
      await scheduleStatusUpdate(message, entry.status, entry.delayMs);
    } catch (error) {
      console.warn('Unable to schedule status update', error.message);
    }
  }
}

async function scheduleStatusUpdate(message, status, delayMs) {
  const now = Date.now();
  const eventTime = new Date(now + delayMs);
  const detail = {
    message_id: message.id,
    tenant_id: message.tenant_id,
    campaign_id: message.campaign_id,
    new_status: status
  };

  await eventBridge.putEvents({
    Entries: [
      {
        Source: eventSource,
        DetailType: 'MockStatusUpdate',
        Detail: JSON.stringify(detail),
        Time: eventTime
      }
    ]
  }).promise();
}
