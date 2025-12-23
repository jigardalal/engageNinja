const { getPool } = require('../../utils/db');
const { decryptCredentials } = require('../../utils/crypto');
const { notifyMetrics } = require('../../utils/metrics');
const { applyStatusUpdate } = require('../../utils/statusService');
const TwilioSmsProvider = require('../../providers/twilioSmsProvider');

const pool = getPool();

exports.handler = async (event) => {
  const signature = getHeader(event.headers, 'x-twilio-signature');
  const payload = parseFormBody(event);
  const messageSid = payload.MessageSid;
  const status = payload.MessageStatus;
  const errorMessage = payload.ErrorMessage;
  const errorCode = payload.ErrorCode;

  if (!messageSid || !status) {
    return {
      statusCode: 400,
      body: 'Missing required Twilio fields'
    };
  }

  const client = await pool.connect();
  try {
    const mapping = await client.query(
      'SELECT message_id FROM message_provider_mappings WHERE provider_message_id = $1',
      [messageSid]
    );

    if (!mapping.rows.length) {
      return { statusCode: 404, body: 'Message not found' };
    }

    const messageId = mapping.rows[0].message_id;
    const message = await fetchMessage(client, messageId);
    if (!message) {
      return { statusCode: 404, body: 'Message record missing' };
    }

    const channelSettings = await fetchChannelSettings(client, message.tenant_id, message.channel);
    if (!channelSettings) {
      return { statusCode: 404, body: 'Channel settings missing' };
    }

    const credentials = decryptCredentials(channelSettings.credentials_encrypted);
    const webhookUrl = buildUrl(event);
    const provider = new TwilioSmsProvider(credentials, {
      webhook_url: webhookUrl
    });

    if (signature) {
      const valid = provider.verifyWebhookSignature(signature, webhookUrl, payload);
      if (!valid) {
        return { statusCode: 403, body: 'Invalid signature' };
      }
    }

    const mappedStatus = mapStatus(status);
    const reason = errorMessage ? `Twilio ${errorCode || 'unknown'}: ${errorMessage}` : null;
    await applyStatusUpdate(client, message, mappedStatus, reason);

    await notifyMetrics({
      message_id: message.id,
      tenant_id: message.tenant_id,
      campaign_id: message.campaign_id,
      status: mappedStatus
    });

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Twilio webhook error', error);
    return { statusCode: 500, body: 'Internal error' };
  } finally {
    client.release();
  }
};

function parseFormBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';
  const params = new URLSearchParams(raw);
  const parsed = {};
  for (const [key, value] of params.entries()) {
    parsed[key] = value;
  }
  return parsed;
}

function getHeader(headers = {}, name) {
  if (!headers) return null;
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      return headers[key];
    }
  }
  return null;
}

function buildUrl(event) {
  const protocol = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || 'https';
  const host = (event.headers && (event.headers.Host || event.headers.host)) || 'localhost';
  const path = event.rawPath || '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  return `${protocol}://${host}${path}${query}`;
}

async function fetchMessage(client, messageId) {
  const res = await client.query('SELECT * FROM messages WHERE id = $1', [messageId]);
  return res.rows[0];
}

async function fetchChannelSettings(client, tenantId, channel) {
  const res = await client.query(
    `SELECT credentials_encrypted FROM tenant_channel_settings
     WHERE tenant_id = $1 AND channel = $2`,
    [tenantId, channel]
  );
  return res.rows[0];
}

function mapStatus(status) {
  const mapping = {
    accepted: 'sent',
    queued: 'sent',
    sending: 'sent',
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    undelivered: 'failed',
    failed: 'failed'
  };
  return mapping[status.toLowerCase()] || 'sent';
}
