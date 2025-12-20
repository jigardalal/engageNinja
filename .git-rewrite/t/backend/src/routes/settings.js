/**
 * Settings Routes
 * Handles tenant channel configuration (WhatsApp, Email, etc.)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

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
  const tenantId = req.session.activeTenantId;
  console.log('getTenantId called - session.activeTenantId:', tenantId);
  console.log('getTenantId called - full session:', JSON.stringify(req.session, null, 2));
  return tenantId;
};

// ===== ENCRYPTION UTILITIES =====

/**
 * Encrypt sensitive credentials
 * Uses environment encryption key or falls back to default
 */
const encryptCredentials = (data) => {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    // Simple base64 encoding for MVP (should use AES-256 in production)
    // For MVP, we'll use basic encryption
    const cipher = crypto.createCipher('aes192', encryptionKey);
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
    const decipher = crypto.createDecipher('aes192', encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Decryption error:', err.message);
    throw new Error('Failed to decrypt credentials');
  }
};

// ===== VALIDATION HELPERS =====

/**
 * Validate WhatsApp credentials with Meta API
 * For MVP, we do a simple structure check
 * In production, this would call Meta API to verify
 */
const validateWhatsAppCredentials = async (accessToken, phoneNumberId, businessAccountId) => {
  // MVP: Basic validation
  // Production: Call Meta API: https://graph.instagram.com/v18.0/{phoneNumberId}/contacts

  if (!accessToken || !phoneNumberId) {
    throw new Error('Access token and phone number ID are required');
  }

  if (accessToken.length < 10) {
    throw new Error('Invalid access token format');
  }

  if (phoneNumberId.length < 5) {
    throw new Error('Invalid phone number ID format');
  }

  // In production, we would call Meta API here:
  // const metaApi = `https://graph.instagram.com/v18.0/${phoneNumberId}/contacts`;
  // const response = await fetch(metaApi, { headers: { Authorization: `Bearer ${accessToken}` } });
  // if (!response.ok) throw new Error('Invalid credentials');

  return true;
};

// ===== ROUTES =====

/**
 * GET /api/settings/channels
 * Get all channel settings for current tenant
 */
router.get('/channels', requireAuth, (req, res) => {
  try {
    const tenantId = getTenantId(req);
    console.log('GET /channels - Session:', req.session);
    console.log('GET /channels - Tenant ID:', tenantId);

    if (!tenantId) {
      console.log('GET /channels - No tenant ID found in session');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No active tenant selected',
        status: 'error'
      });
    }

    // Get WhatsApp channel settings
    const whatsappChannel = db.prepare(
      'SELECT id, channel, provider, is_connected, connected_at FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'whatsapp');

    // Get Email channel settings
    const emailChannel = db.prepare(
      'SELECT id, channel, provider, is_connected, connected_at, verified_sender_email FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'email');

    const response = {
      whatsapp: whatsappChannel ? {
        provider: whatsappChannel.provider,
        is_connected: whatsappChannel.is_connected === 1,
        connected_at: whatsappChannel.connected_at
      } : {
        provider: null,
        is_connected: false,
        connected_at: null
      },
      email: emailChannel ? {
        provider: emailChannel.provider,
        is_connected: emailChannel.is_connected === 1,
        connected_at: emailChannel.connected_at,
        verified_sender_email: emailChannel.verified_sender_email
      } : {
        provider: null,
        is_connected: false,
        connected_at: null,
        verified_sender_email: null
      }
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
router.post('/channels/whatsapp', requireAuth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { accessToken, phoneNumberId, businessAccountId } = req.body;

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

    // Validate credentials with Meta API
    try {
      await validateWhatsAppCredentials(accessToken, phoneNumberId, businessAccountId);
    } catch (validationErr) {
      return res.status(400).json({
        error: 'Invalid Credentials',
        message: validationErr.message,
        status: 'error'
      });
    }

    // Check if WhatsApp channel already exists
    const existingChannel = db.prepare(
      'SELECT id FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'whatsapp');

    const credentialsData = {
      accessToken,
      phoneNumberId,
      businessAccountId: businessAccountId || null
    };

    const encryptedCredentials = encryptCredentials(credentialsData);
    const now = new Date().toISOString();

    if (existingChannel) {
      // Update existing channel
      db.prepare(
        `UPDATE tenant_channel_settings
         SET credentials_encrypted = ?, provider = ?, is_connected = 1, connected_at = ?, updated_at = ?
         WHERE tenant_id = ? AND channel = ?`
      ).run(encryptedCredentials, 'whatsapp_cloud', now, now, tenantId, 'whatsapp');
    } else {
      // Create new channel
      const id = uuidv4();
      db.prepare(
        `INSERT INTO tenant_channel_settings
         (id, tenant_id, channel, provider, credentials_encrypted, is_connected, connected_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
      ).run(id, tenantId, 'whatsapp', 'whatsapp_cloud', encryptedCredentials, now, now, now);
    }

    res.status(201).json({
      message: 'WhatsApp channel connected successfully',
      status: 'success',
      channel: 'whatsapp',
      is_connected: true
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
router.post('/channels/email', requireAuth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { provider, accessKeyId, secretAccessKey, region, apiKey, verifiedSenderEmail } = req.body;

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

    if (provider === 'ses' && (!accessKeyId || !secretAccessKey || !region)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'SES requires access key ID, secret key, and region',
        status: 'error'
      });
    }

    if (provider === 'brevo' && !apiKey) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Brevo requires API key',
        status: 'error'
      });
    }

    // Build credentials object based on provider
    let credentialsData = {
      provider,
      verifiedSenderEmail
    };

    if (provider === 'ses') {
      credentialsData.accessKeyId = accessKeyId;
      credentialsData.secretAccessKey = secretAccessKey;
      credentialsData.region = region;
    } else if (provider === 'brevo') {
      credentialsData.apiKey = apiKey;
    }

    const encryptedCredentials = encryptCredentials(credentialsData);
    const now = new Date().toISOString();

    // Check if Email channel already exists
    const existingChannel = db.prepare(
      'SELECT id FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).get(tenantId, 'email');

    if (existingChannel) {
      // Update existing channel
      db.prepare(
        `UPDATE tenant_channel_settings
         SET credentials_encrypted = ?, provider = ?, is_connected = 1, connected_at = ?, verified_sender_email = ?, updated_at = ?
         WHERE tenant_id = ? AND channel = ?`
      ).run(encryptedCredentials, provider, now, verifiedSenderEmail, now, tenantId, 'email');
    } else {
      // Create new channel
      const id = uuidv4();
      db.prepare(
        `INSERT INTO tenant_channel_settings
         (id, tenant_id, channel, provider, credentials_encrypted, verified_sender_email, is_connected, connected_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      ).run(id, tenantId, 'email', provider, encryptedCredentials, verifiedSenderEmail, now, now, now);
    }

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
 * DELETE /api/settings/channels/:channel
 * Disconnect a channel
 */
router.delete('/channels/:channel', requireAuth, (req, res) => {
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

    // Delete the channel configuration
    const result = db.prepare(
      'DELETE FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?'
    ).run(tenantId, channel);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `${channel} channel not found`,
        status: 'error'
      });
    }

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

module.exports = router;
