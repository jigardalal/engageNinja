/**
 * Settings Routes
 * Handles tenant channel configuration (WhatsApp, Email, etc.)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const whatsappService = require('../services/whatsapp');
const { requireAdmin } = require('../middleware/rbac');
const { logAudit, AUDIT_ACTIONS } = require('../utils/audit');

// Ensure optional webhook columns exist (multi-tenant per channel)
function ensureWhatsAppWebhookColumns() {
  const columns = ['webhook_verify_token', 'webhook_secret'];
  columns.forEach(col => {
    try {
      db.prepare(`ALTER TABLE tenant_channel_settings ADD COLUMN ${col} TEXT`).run();
    } catch (e) {
      // Column already exists - ignore
    }
  });
}

// Ensure webhook columns exist on module load (safe no-ops if already present)
ensureWhatsAppWebhookColumns();

// Ensure provider ID columns exist for WhatsApp (for easier lookups/status)
function ensureWhatsAppProviderColumns() {
  const columns = ['phone_number_id', 'business_account_id'];
  columns.forEach(col => {
    try {
      db.prepare(`ALTER TABLE tenant_channel_settings ADD COLUMN ${col} TEXT`).run();
    } catch (e) {
      // Column already exists - ignore
    }
  });
}

ensureWhatsAppProviderColumns();

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

// Get tenant context from session
const getTenantId = (req) => {
  return req.session.activeTenantId;
};

// ===== ENCRYPTION UTILITIES =====

/**
 * Encrypt sensitive credentials
 * Uses environment encryption key or falls back to default
 */
const encryptCredentials = (data) => {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
    const iv = Buffer.alloc(16, 0); // deterministic IV for MVP
    const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (err) {
    console.error('Encryption error:', err.message);
    throw new Error('Failed to encrypt credentials');
  }
};

/**
 * Decrypt sensitive credentials
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
    throw new Error('Failed to decrypt credentials');
  }
};

// Normalize WhatsApp credential keys (accept camelCase or snake_case) and trim values
const normalizeWhatsAppCredentials = (creds = {}) => {
  const access = creds.access_token || creds.accessToken || '';
  const phone = creds.phone_number_id || creds.phoneNumberId || '';
  const business = creds.business_account_id || creds.businessAccountId || '';

  return {
    access_token: access ? String(access).trim() : '',
    phone_number_id: phone ? String(phone).trim() : '',
    business_account_id: business ? String(business).trim() : null
  };
};

// ===== VALIDATION HELPERS =====

/**
 * Validate WhatsApp credentials with Meta API
 * For MVP, we do a simple structure check
 * In production, this would call Meta API to verify
 */
const validateWhatsAppCredentials = async (accessToken, phoneNumberId, businessAccountId) => {
  if (!accessToken || !phoneNumberId) {
    throw new Error('Access token and phone number ID are required');
  }

  if (accessToken.length < 10) {
    throw new Error('Invalid access token format');
  }

  if (phoneNumberId.length < 5) {
    throw new Error('Invalid phone number ID format');
  }

  // Call Meta to validate credentials (uses a lightweight info lookup)
  await whatsappService.validateCredentials(phoneNumberId, accessToken);
  return true;
};

// ===== ROUTES =====

/**
 * POST /api/settings/channels/whatsapp/test
 * Exercise webhook signature verification using tenant secrets
 */
router.post('/channels/whatsapp/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Bad Request', message: 'No active tenant selected' });
    }

    const channel = db.prepare(`
      SELECT credentials_encrypted, webhook_secret, webhook_verify_token
      FROM tenant_channel_settings WHERE tenant_id = ? AND channel = 'whatsapp'
    `).get(tenantId);

    if (!channel) {
      return res.status(404).json({ error: 'Not Found', message: 'WhatsApp channel not configured' });
    }

    if (!channel.webhook_secret) {
      return res.status(400).json({ error: 'Bad Request', message: 'Webhook secret missing for this tenant' });
    }

    let phoneNumberId = null;
    try {
      const creds = normalizeWhatsAppCredentials(decryptCredentials(channel.credentials_encrypted) || {});
      phoneNumberId = creds.phone_number_id;
    } catch (e) {
      console.warn('Webhook test: unable to decrypt credentials', e.message);
    }

    if (!phoneNumberId) {
      return res.status(400).json({ error: 'Bad Request', message: 'WhatsApp phone_number_id missing for this tenant' });
    }

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'test',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: 'test',
                  phone_number_id: phoneNumberId
                },
                statuses: [
                  {
                    id: 'wamid.test-health',
                    status: 'sent',
                    timestamp: Math.floor(Date.now() / 1000)
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const bodyString = JSON.stringify(payload);
    const signature = `sha256=${crypto.createHmac('sha256', channel.webhook_secret).update(bodyString).digest('hex')}`;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const response = await fetch(`${baseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      },
      body: bodyString
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Webhook test failed',
        status: response.status,
        response: data
      });
    }

    res.json({
      message: 'Webhook test succeeded',
      status: response.status,
      response: data
    });
  } catch (err) {
    console.error('Error testing WhatsApp webhook:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to test webhook',
      status: 'error'
    });
  }
});

/**
 * GET /api/settings/channels
 * Get all channel settings for current tenant
 */
router.get('/channels', requireAuth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    // Get WhatsApp channel settings
    const whatsappChannel = await db.prepare(
      `SELECT id, channel, provider, is_connected, connected_at, credentials_encrypted, webhook_verify_token, webhook_secret, phone_number_id, business_account_id
       FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?`
    ).get(tenantId, 'whatsapp');

    // Get Email channel settings
    const emailChannel = await db.prepare(
      'SELECT id, channel, provider, is_connected, connected_at, verified_sender_email, credentials_encrypted FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'email');

    let whatsappPhoneNumberId = null;
    let whatsappBusinessAccountId = null;
    if (whatsappChannel?.credentials_encrypted) {
      try {
        const creds = decryptCredentials(whatsappChannel.credentials_encrypted);
        const normalized = normalizeWhatsAppCredentials(creds);
        whatsappPhoneNumberId = whatsappChannel.phone_number_id || normalized.phone_number_id || null;
        whatsappBusinessAccountId = whatsappChannel.business_account_id || normalized.business_account_id || null;
      } catch (e) {
        console.warn('⚠️ Could not decrypt WhatsApp credentials for response:', e.message);
      }
    } else {
      whatsappPhoneNumberId = whatsappChannel?.phone_number_id || null;
      whatsappBusinessAccountId = whatsappChannel?.business_account_id || null;
    }

    const smsChannel = await db.prepare(`
      SELECT id, provider, is_connected, connected_at, is_enabled, is_verified,
        verified_at, provider_config_json, webhook_url, phone_number, messaging_service_sid,
        updated_at
      FROM tenant_channel_settings
      WHERE tenant_id = ? AND channel = ?
    `).get(tenantId, 'sms');

    const smsConfig = smsChannel ? (() => {
      let parsed = {};
      if (smsChannel.provider_config_json) {
        try {
          parsed = JSON.parse(smsChannel.provider_config_json);
        } catch (err) {
          console.warn('⚠️ Could not parse SMS provider_config_json:', err.message);
        }
      }
      return {
        provider: smsChannel.provider,
        is_connected: Boolean(smsChannel.is_connected),
        is_enabled: Boolean(smsChannel.is_enabled),
        is_verified: Boolean(smsChannel.is_verified),
        phone_number: smsChannel.phone_number || parsed.phone_number || null,
        webhook_url: smsChannel.webhook_url || parsed.webhook_url || null,
        messaging_service_sid: smsChannel.messaging_service_sid || parsed.messaging_service_sid || null,
        verified_at: smsChannel.verified_at,
        updated_at: smsChannel.updated_at
      };
    })() : {
      provider: null,
      is_connected: false,
      is_enabled: false,
      is_verified: false,
      phone_number: null,
      webhook_url: null,
      messaging_service_sid: null,
      verified_at: null,
      updated_at: null
    };

    const response = {
      whatsapp: whatsappChannel ? {
        provider: whatsappChannel.provider,
        is_connected: whatsappChannel.is_connected === 1,
        connected_at: whatsappChannel.connected_at,
        phone_number_id: whatsappPhoneNumberId,
        business_account_id: whatsappBusinessAccountId,
        webhook_verify_token: whatsappChannel.webhook_verify_token || null,
        webhook_secret_present: Boolean(whatsappChannel.webhook_secret)
      } : {
        provider: null,
        is_connected: false,
        connected_at: null,
        phone_number_id: null,
        business_account_id: null,
        webhook_verify_token: null,
        webhook_secret_present: false
      },
      email: emailChannel ? {
        provider: emailChannel.provider,
        is_connected: emailChannel.is_connected === 1,
        connected_at: emailChannel.connected_at,
        verified_sender_email: emailChannel.verified_sender_email,
        region: (() => {
          try {
            const creds = decryptCredentials(emailChannel.credentials_encrypted);
            return creds?.region || null;
          } catch (e) {
            console.warn('⚠️ Could not decrypt email credentials for response:', e.message);
            return null;
          }
        })(),
        access_key_id: (() => {
          try {
            const creds = decryptCredentials(emailChannel.credentials_encrypted);
            return creds?.accessKeyId || null;
          } catch (e) {
            return null;
          }
        })()
      } : {
        provider: null,
        is_connected: false,
        connected_at: null,
        verified_sender_email: null,
        region: null,
        access_key_id: null
      },
      sms: smsConfig
    };

    res.json(response);
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch channel settings',
      status: 'error'
    });
  }
});

/**
 * POST /api/settings/channels/whatsapp
 * Connect WhatsApp channel
 */
router.post('/channels/whatsapp', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { accessToken, phoneNumberId, businessAccountId, webhookVerifyToken, webhookSecret } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    // Validate input
    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Access token and phone number ID are required',
        status: 'error'
      });
    }

    // Load existing credentials to allow token-only refresh during reconnects
    const existingChannel = db.prepare(
      'SELECT id, credentials_encrypted, webhook_verify_token, webhook_secret FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'whatsapp');

    let mergedCreds = normalizeWhatsAppCredentials({
      access_token: accessToken,
      phone_number_id: phoneNumberId,
      business_account_id: businessAccountId || null
    });

    if (existingChannel && (!mergedCreds.phone_number_id || !mergedCreds.business_account_id)) {
      try {
        const existingCreds = normalizeWhatsAppCredentials(decryptCredentials(existingChannel.credentials_encrypted));
        mergedCreds = {
          access_token: mergedCreds.access_token,
          phone_number_id: mergedCreds.phone_number_id || existingCreds.phone_number_id,
          business_account_id: mergedCreds.business_account_id || existingCreds.business_account_id
        };
      } catch (e) {
        // ignore decrypt error; continue with provided fields
      }
    }

    // Validate credentials with Meta API
    try {
      await validateWhatsAppCredentials(mergedCreds.access_token, mergedCreds.phone_number_id, mergedCreds.business_account_id);
    } catch (validationErr) {
      return res.status(400).json({
        error: 'Invalid Credentials',
        message: validationErr.message,
        status: 'error'
      });
    }

    const encryptedCredentials = encryptCredentials(mergedCreds);
    const now = new Date().toISOString();
    const verifyTokenToStore = webhookVerifyToken || existingChannel?.webhook_verify_token || null;
    const webhookSecretToStore = webhookSecret || existingChannel?.webhook_secret || null;

    if (existingChannel) {
      // Update existing channel
      db.prepare(
        `UPDATE tenant_channel_settings
         SET credentials_encrypted = ?, provider = ?, is_connected = true, connected_at = ?, updated_at = ?, webhook_verify_token = ?, webhook_secret = ?, phone_number_id = ?, business_account_id = ?
         WHERE tenant_id = ? AND channel = ?`
      ).run(
        encryptedCredentials,
        'whatsapp_cloud',
        now,
        now,
        verifyTokenToStore,
        webhookSecretToStore,
        mergedCreds.phone_number_id || null,
        mergedCreds.business_account_id || null,
        tenantId,
        'whatsapp'
      );
    } else {
      // Create new channel
      const id = uuidv4();
      db.prepare(
        `INSERT INTO tenant_channel_settings
         (id, tenant_id, channel, provider, credentials_encrypted, is_connected, connected_at, created_at, updated_at, webhook_verify_token, webhook_secret, phone_number_id, business_account_id)
         VALUES (?, ?, ?, ?, ?, true, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        tenantId,
        'whatsapp',
        'whatsapp_cloud',
        encryptedCredentials,
        now,
        now,
        now,
        verifyTokenToStore,
        webhookSecretToStore,
        mergedCreds.phone_number_id || null,
        mergedCreds.business_account_id || null
      );
    }

    // Log audit event
    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId,
      action: AUDIT_ACTIONS.CHANNEL_CONNECT,
      targetType: 'channel',
      targetId: existingChannel?.id || uuidv4(),
      metadata: {
        channel: 'whatsapp',
        phoneNumberId: mergedCreds.phone_number_id,
        businessAccountId: mergedCreds.business_account_id
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'WhatsApp channel connected successfully',
      status: 'success',
      channel: 'whatsapp',
      is_connected: true,
      provider: 'whatsapp_cloud',
      connected_at: now,
      phone_number_id: mergedCreds.phone_number_id || null,
      business_account_id: mergedCreds.business_account_id || null
    });
  } catch (err) {
    console.error('Error connecting WhatsApp:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to connect WhatsApp channel',
      status: 'error'
    });
  }
});

/**
 * POST /api/settings/channels/email
 * Connect Email channel (SES or Brevo)
 */
router.post('/channels/email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { provider, accessKeyId, secretAccessKey, region, apiKey, verifiedSenderEmail, useStoredCredentials } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    // Validate input
    if (!provider || !verifiedSenderEmail) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Provider and verified sender email are required',
        status: 'error'
      });
    }

    // Check if Email channel already exists
    const existingChannel = db.prepare(
      'SELECT id, credentials_encrypted FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'email');

    let mergedCreds = null;
    if (useStoredCredentials) {
      // Attempt to reuse stored credentials
      if (!existingChannel || !existingChannel.credentials_encrypted) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No stored credentials to reuse',
          status: 'error'
        });
      }
      mergedCreds = decryptCredentials(existingChannel.credentials_encrypted);
    }

    // Validate input
    if (!provider || !verifiedSenderEmail) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Provider and verified sender email are required',
        status: 'error'
      });
    }

    if (!useStoredCredentials && provider === 'ses' && (!accessKeyId || !secretAccessKey || !region)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'SES requires access key ID, secret key, and region',
        status: 'error'
      });
    }

    if (!useStoredCredentials && provider === 'brevo' && !apiKey) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Brevo requires API key',
        status: 'error'
      });
    }

    // Build credentials object based on provider
    let credentialsData = useStoredCredentials ? mergedCreds : { provider, verifiedSenderEmail };

    if (!useStoredCredentials) {
      if (provider === 'ses') {
        credentialsData.accessKeyId = accessKeyId;
        credentialsData.secretAccessKey = secretAccessKey;
        credentialsData.region = region;
      } else if (provider === 'brevo') {
        credentialsData.apiKey = apiKey;
      }
    }

    // Ensure provider and verified sender in credentials
    credentialsData.provider = provider;
    credentialsData.verifiedSenderEmail = verifiedSenderEmail;

    const encryptedCredentials = encryptCredentials(credentialsData);
    const now = new Date().toISOString();

    if (existingChannel) {
      // Update existing channel
      db.prepare(
        `UPDATE tenant_channel_settings
         SET credentials_encrypted = ?, provider = ?, is_connected = true, connected_at = ?, verified_sender_email = ?, updated_at = ?
         WHERE tenant_id = ? AND channel = ?`
      ).run(encryptedCredentials, provider, now, verifiedSenderEmail, now, tenantId, 'email');
    } else {
      // Create new channel
      const id = uuidv4();
      db.prepare(
        `INSERT INTO tenant_channel_settings
         (id, tenant_id, channel, provider, credentials_encrypted, verified_sender_email, is_connected, connected_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, true, ?, ?, ?)`
      ).run(id, tenantId, 'email', provider, encryptedCredentials, verifiedSenderEmail, now, now, now);
    }

    // Log audit event
    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId,
      action: AUDIT_ACTIONS.CHANNEL_CONNECT,
      targetType: 'channel',
      targetId: existingChannel?.id || uuidv4(),
      metadata: {
        channel: 'email',
        provider,
        verifiedSenderEmail
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Email channel connected successfully',
      status: 'success',
      channel: 'email',
      provider,
      is_connected: true
    });
  } catch (err) {
    console.error('Error connecting email channel:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to connect email channel',
      status: 'error'
    });
  }
});

/**
 * POST /api/settings/channels/sms
 * Update per-tenant Twilio phone number + webhook URL
 */
router.post('/channels/sms', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { phoneNumber, webhookUrl } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Phone number is required',
        status: 'error'
      });
    }

    const channelRow = await db.prepare(
      'SELECT id, provider_config_json, webhook_url, phone_number, messaging_service_sid FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'sms');

    if (!channelRow) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'SMS configuration not found. Run the Twilio seeding script first.',
        status: 'error'
      });
    }

    let config = {};
    if (channelRow.provider_config_json) {
      try {
        config = JSON.parse(channelRow.provider_config_json);
      } catch (err) {
        console.warn('⚠️ Could not parse SMS provider_config_json:', err.message);
      }
    }

    config.phone_number = String(phoneNumber).trim();

    // Handle webhook URL: if explicitly provided (even as null), use it; otherwise keep existing
    let finalWebhookUrl = channelRow.webhook_url;
    if (webhookUrl !== undefined) {
      finalWebhookUrl = webhookUrl ? String(webhookUrl).trim() : null;
      config.webhook_url = finalWebhookUrl;
    }

    const now = new Date().toISOString();
    await db.prepare(
      `UPDATE tenant_channel_settings
       SET provider_config_json = ?, is_enabled = true,
           webhook_url = ?,
           phone_number = ?,
           messaging_service_sid = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(
      JSON.stringify(config),
      finalWebhookUrl,
      phoneNumber,
      config.messaging_service_sid || channelRow.messaging_service_sid || null,
      now,
      channelRow.id
    );

    res.json({
      message: 'SMS settings saved',
      status: 'success',
      phone_number: config.phone_number,
      webhook_url: config.webhook_url || null
    });
  } catch (err) {
    console.error('Error updating SMS channel settings:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save SMS settings',
      status: 'error'
    });
  }
});

/**
 * DELETE /api/settings/channels/:channel
 * Disconnect a channel
 */
router.delete('/channels/:channel', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { channel } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    // Validate channel
    if (!['whatsapp', 'email'].includes(channel)) {
      return res.status(400).json({
        error: 'Invalid Channel',
        message: 'Channel must be "whatsapp" or "email"',
        status: 'error'
      });
    }

    // Soft-disconnect: preserve credentials but mark inactive
    const result = await db.prepare(
      `UPDATE tenant_channel_settings
       SET is_connected = false, connected_at = NULL, updated_at = ?
       WHERE tenant_id = ? AND channel = ?`
    ).run(new Date().toISOString(), tenantId, channel);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `${channel} channel not found`,
        status: 'error'
      });
    }

    // Log audit event
    await logAudit({
      actorUserId: req.session.userId,
      actorType: 'tenant_user',
      tenantId,
      action: AUDIT_ACTIONS.CHANNEL_DISCONNECT,
      targetType: 'channel',
      targetId: channel,
      metadata: { channel },
      ipAddress: req.ip
    });

    res.json({
      message: `${channel} channel disconnected successfully`,
      status: 'success',
      channel,
      is_connected: false
    });
  } catch (err) {
    console.error('Error disconnecting channel:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disconnect channel',
      status: 'error'
    });
  }
});

/**
 * GET /api/settings/channels/email/health
 * Basic health check for email channel (credential presence + verified sender)
 */
router.get('/channels/email/health', requireAuth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    const channel = await db.prepare(
      'SELECT provider, is_connected, verified_sender_email, credentials_encrypted FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'email');

    if (!channel) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email channel not configured',
        status: 'error'
      });
    }

    let creds = null;
    try {
      creds = decryptCredentials(channel.credentials_encrypted);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid Credentials',
        message: 'Failed to decrypt stored email credentials',
        status: 'error'
      });
    }

    const missing = [];
    if (channel.provider === 'ses') {
      if (!creds?.accessKeyId) missing.push('accessKeyId');
      if (!creds?.secretAccessKey) missing.push('secretAccessKey');
      if (!creds?.region) missing.push('region');
    }
    if (channel.provider === 'brevo') {
      if (!creds?.apiKey) missing.push('apiKey');
    }
    if (!channel.verified_sender_email) {
      missing.push('verified_sender_email');
    }

    const credentialStatus = missing.length === 0 ? 'ok' : 'missing_fields';

    return res.json({
      status: 'success',
      data: {
        provider: channel.provider,
        is_connected: channel.is_connected === 1,
        verified_sender_email: channel.verified_sender_email,
        credential_status: credentialStatus,
        missing_fields: missing
      }
    });
  } catch (err) {
    console.error('Error checking email health:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check email health',
      status: 'error'
    });
  }
});

/**
 * POST /api/settings/channels/whatsapp/validate
 * Validate WhatsApp credentials (uses provided token/ids or stored credentials)
 */
router.post('/channels/whatsapp/validate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { accessToken, phoneNumberId, useStoredCredentials = false } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    let tokenToUse = accessToken;
    let phoneToUse = phoneNumberId;

    if (useStoredCredentials || (!accessToken && !phoneNumberId)) {
      const channel = db.prepare(
        `SELECT credentials_encrypted, phone_number_id FROM tenant_channel_settings
         WHERE tenant_id = ? AND channel = 'whatsapp' AND is_connected = 1`
      ).get(tenantId);

      if (!channel) {
        return res.status(400).json({
          error: 'Not Configured',
          message: 'WhatsApp channel is not configured. Provide credentials to validate.',
          status: 'error'
        });
      }

      try {
        const creds = normalizeWhatsAppCredentials(decryptCredentials(channel.credentials_encrypted));
        tokenToUse = creds.access_token;
        phoneToUse = channel.phone_number_id || creds.phone_number_id;
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid Credentials',
          message: 'Failed to decrypt stored credentials',
          status: 'error'
        });
      }
    }

    if (!tokenToUse || !phoneToUse) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Access token and phone number ID are required',
        status: 'error'
      });
    }

    await validateWhatsAppCredentials(tokenToUse, phoneToUse);

    return res.json({
      status: 'success',
      message: 'WhatsApp credentials are valid',
      phone_number_id: phoneToUse
    });
  } catch (err) {
    console.error('Error validating WhatsApp credentials:', err);
    return res.status(400).json({
      error: 'Validation Failed',
      message: err.message || 'Failed to validate WhatsApp credentials',
      status: 'error'
    });
  }
});

module.exports = router;
