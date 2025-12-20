/**
 * Message Queue Processor
 * Processes queued messages and sends them via providers
 * Handles retries, error handling, and rate limiting
 */

const db = require('../db');
const whatsappService = require('./whatsapp');
const emailService = require('./emailService');
const crypto = require('crypto');

// Rate limiting: max 80 API calls per second for WhatsApp
const WHATSAPP_RATE_LIMIT = 80;
// Rate limiting: max 14 emails per second for SES
const EMAIL_RATE_LIMIT = 14;
const RATE_WINDOW_MS = 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

// Track API call rate per channel
let apiCallTimestamps = {
  whatsapp: [],
  email: []
};

/**
 * Check if we can make another API call without exceeding rate limit
 * @param {string} channel - 'whatsapp' or 'email'
 * @returns {boolean} True if we can proceed
 */
function canMakeApiCall(channel = 'whatsapp') {
  const now = Date.now();
  const limit = channel === 'email' ? EMAIL_RATE_LIMIT : WHATSAPP_RATE_LIMIT;

  // Remove timestamps older than the rate window
  if (!apiCallTimestamps[channel]) {
    apiCallTimestamps[channel] = [];
  }
  apiCallTimestamps[channel] = apiCallTimestamps[channel].filter(ts => now - ts < RATE_WINDOW_MS);
  // Check if we're under the limit
  return apiCallTimestamps[channel].length < limit;
}

/**
 * Record an API call for rate limiting
 * @param {string} channel - 'whatsapp' or 'email'
 */
function recordApiCall(channel = 'whatsapp') {
  if (!apiCallTimestamps[channel]) {
    apiCallTimestamps[channel] = [];
  }
  apiCallTimestamps[channel].push(Date.now());
}

/**
 * Mark campaign as complete (sent) when no queued messages remain
 * Only flips campaigns currently in "sending" status
 */
function markCampaignIfComplete(campaignId, tenantId) {
  try {
    const pending = db.prepare(`
      SELECT COUNT(*) as queued_count
      FROM messages
      WHERE campaign_id = ? AND tenant_id = ? AND status = 'queued'
    `).get(campaignId, tenantId);

    if (pending?.queued_count === 0) {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE campaigns
        SET status = 'sent', completed_at = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ? AND status = 'sending'
      `).run(now, now, campaignId, tenantId);
    }
  } catch (err) {
    console.error('Error marking campaign complete:', err.message);
  }
}

/**
 * Decrypt credentials using the same encryption as settings.js
 */
function decryptCredentials(encryptedData) {
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
}

function normalizeWhatsAppCredentials(creds = {}) {
  return {
    access_token: creds.access_token || creds.accessToken || '',
    phone_number_id: creds.phone_number_id || creds.phoneNumberId || '',
    business_account_id: creds.business_account_id || creds.businessAccountId || null
  };
}

/**
 * Get decrypted WhatsApp credentials for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Object|null} Credentials object or null if not configured
 */
function getWhatsAppCredentials(tenantId) {
  try {
    const setting = db.prepare(`
      SELECT credentials_encrypted FROM tenant_channel_settings
      WHERE tenant_id = ? AND channel = 'whatsapp' AND is_connected = 1
    `).get(tenantId);

    if (!setting) {
      return null;
    }

    return normalizeWhatsAppCredentials(decryptCredentials(setting.credentials_encrypted) || {});
  } catch (error) {
    console.error('Error getting WhatsApp credentials:', error);
    return null;
  }
}

/**
 * Get decrypted Email credentials for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Object|null} Credentials object or null if not configured
 */
function getEmailCredentials(tenantId) {
  try {
    const setting = db.prepare(`
      SELECT credentials_encrypted, verified_sender_email FROM tenant_channel_settings
      WHERE tenant_id = ? AND channel = 'email' AND is_connected = 1
    `).get(tenantId);

    if (!setting) {
      return null;
    }

    const credentials = decryptCredentials(setting.credentials_encrypted);
    if (credentials) {
      credentials.verified_sender_email = setting.verified_sender_email;
    }
    return credentials;
  } catch (error) {
    console.error('Error getting email credentials:', error);
    return null;
  }
}

/**
 * Process a single queued message
 * Sends via WhatsApp or Email, handles retries and errors
 * @param {Object} message - Message record from database
 * @returns {Promise<boolean>} True if sent successfully
 */
async function processMessage(message) {
  try {
    // Get contact details
    const contact = db.prepare('SELECT phone, email, name FROM contacts WHERE id = ?').get(message.contact_id);
    if (!contact) {
      db.prepare(`
        UPDATE messages SET status = 'failed', status_reason = 'Contact not found'
        WHERE id = ?
      `).run(message.id);
      return false;
    }

    const campaign = db.prepare(`
      SELECT template_id, message_content, channel, description FROM campaigns WHERE id = ?
    `).get(message.campaign_id);

    if (!campaign) {
      db.prepare(`
        UPDATE messages SET status = 'failed', status_reason = 'Campaign not found'
        WHERE id = ?
      `).run(message.id);
      return false;
    }

    // Route to appropriate channel handler
    if (message.channel === 'email') {
      return await processEmailMessage(message, contact, campaign);
    } else {
      return await processWhatsAppMessage(message, contact, campaign);
    }

  } catch (error) {
    console.error(`Error processing message ${message.id}:`, error.message);
    handleMessageError(message, error);
    return false;
  }
}

/**
 * Process a WhatsApp message
 */
async function processWhatsAppMessage(message, contact, campaign) {
  try {
    if (!contact.phone) {
      throw new Error('No phone number');
    }

    // Get WhatsApp credentials
    const credentials = getWhatsAppCredentials(message.tenant_id);
    if (!credentials || !credentials.phone_number_id || !credentials.access_token) {
      throw new Error('WhatsApp not configured');
    }

    // Wait if rate limit would be exceeded
    while (!canMakeApiCall('whatsapp')) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Send message via WhatsApp
      const template = db.prepare(`
        SELECT name, header_type, header_text, footer_text, body_template, body_variables, header_variables, variable_count
        FROM whatsapp_templates
        WHERE id = ? AND tenant_id = ?
      `).get(campaign.template_id, message.tenant_id);

    // Normalize template variables
    const parsedBodyVars = safeParseArray(template?.body_variables);
    const parsedHeaderVars = safeParseArray(template?.header_variables);
    const parsedButtons = template?.buttons_json
      ? safeParseArray(JSON.parse(template.buttons_json))
      : (Array.isArray(template?.buttons) ? template.buttons : []);

    const templateName = template?.name || campaign.template_id;
    const variables = buildTemplateVariables(campaign.message_content, contact);
    const media = extractMediaFromMessageContent(campaign.message_content);

    const providerId = await whatsappService.sendWhatsAppMessage(
      credentials.phone_number_id,
      credentials.access_token,
      contact.phone,
      {
        name: templateName,
        body_variables: parsedBodyVars,
        header_variables: parsedHeaderVars,
        header_type: template?.header_type,
        buttons: parsedButtons,
        variables: parsedBodyVars && parsedBodyVars.length > 0 ? parsedBodyVars : undefined // fallback for send helper
      },
      variables,
      media
    );

    recordApiCall('whatsapp');

    // Update message with provider ID and mark as sent (webhook will update to delivered/read)
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE messages
      SET status = 'sent', provider_message_id = ?, sent_at = ?, updated_at = ?
      WHERE id = ?
    `).run(providerId, now, now, message.id);

    console.log(`✓ Message ${message.id} sent via WhatsApp (provider ID: ${providerId})`);
    markCampaignIfComplete(message.campaign_id, message.tenant_id);
    return true;
  } catch (error) {
    // Certain WhatsApp errors are non-retriable (e.g., variable mismatch)
    if (isNonRetriableWhatsAppError(error)) {
      handleMessageError(message, error, { forceFail: true });
      return false;
    }
    throw error;
  }
}

/**
 * Process an Email message
 */
async function processEmailMessage(message, contact, campaign) {
  try {
    if (!contact.email) {
      throw new Error('No email address');
    }

    // Get Email credentials
    const credentials = getEmailCredentials(message.tenant_id);
    if (!credentials) {
      throw new Error('Email not configured');
    }

    // Wait if rate limit would be exceeded
    while (!canMakeApiCall('email')) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Parse email content (should be { subject, htmlBody, textBody })
    let emailContent = {};
    try {
      emailContent = JSON.parse(campaign.message_content) || {};
    } catch {
      emailContent = { subject: campaign.name };
    }

    const subject = emailContent.subject || campaign.name || 'Message from EngageNinja';
    const htmlBody = emailContent.htmlBody || campaign.description || '';
    const textBody = emailContent.textBody || '';
    const senderEmail = credentials.verified_sender_email || 'noreply@engageninja.com';

    // Send email via SES/Brevo
    const providerId = await emailService.send(
      credentials,
      contact.email,
      subject,
      htmlBody,
      textBody,
      senderEmail
    );

    recordApiCall('email');

    // Update message with provider ID and mark as sent
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE messages
      SET status = 'delivered',
          provider_message_id = ?,
          sent_at = COALESCE(sent_at, ?),
          delivered_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(providerId, now, now, now, message.id);

    console.log(`✓ Message ${message.id} sent via Email (provider ID: ${providerId})`);
    markCampaignIfComplete(message.campaign_id, message.tenant_id);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Handle message errors and retry logic
 */
function handleMessageError(message, error, options = {}) {
  const newRetries = (message.attempts || 0) + 1;
  const now = new Date().toISOString();
  const reason = error?.message || 'Unknown error';
  const forceFail = options.forceFail;

  if (forceFail || newRetries >= MAX_RETRIES) {
    // Max retries reached, mark as failed
    db.prepare(`
      UPDATE messages
      SET status = 'failed', attempts = ?, updated_at = ?, status_reason = ?
      WHERE id = ?
    `).run(newRetries, now, reason, message.id);
    console.log(`✗ Message ${message.id} failed${forceFail ? ' (non-retriable)' : ''} after ${newRetries} retries: ${reason}`);
    markCampaignIfComplete(message.campaign_id, message.tenant_id);
  } else {
    // Will retry later
    db.prepare(`
      UPDATE messages
      SET attempts = ?, updated_at = ?, status_reason = ?
      WHERE id = ?
    `).run(newRetries, now, reason, message.id);
    console.log(`⟳ Message ${message.id} will retry (attempt ${newRetries}/${MAX_RETRIES}): ${reason}`);
  }
}

/**
 * Process all queued messages (WhatsApp and Email)
 * Called periodically by the message processing loop
 * @returns {Promise<number>} Number of messages processed
 */
async function processQueuedMessages() {
  try {
    // Get queued messages (limit to prevent overwhelming the system)
    const queuedMessages = db.prepare(`
      SELECT m.*, c.name as campaign_name, c.channel
      FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE m.status = 'queued'
      ORDER BY m.created_at ASC
      LIMIT 50
    `).all();

    if (queuedMessages.length === 0) {
      return 0;
    }

    let processedCount = 0;

    // Process each message
    for (const message of queuedMessages) {
      // Attempt to lock this message to avoid double-processing
      const now = new Date().toISOString();
      const lockResult = db.prepare(`
        UPDATE messages
        SET status = 'processing', updated_at = ?
        WHERE id = ? AND status = 'queued'
      `).run(now, message.id);

      if (lockResult.changes === 0) {
        continue; // already being processed
      }

      const success = await processMessage({ ...message, status: 'processing' });
      if (success) {
        processedCount++;
      }
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (queuedMessages.length > 0) {
      console.log(`Processed ${processedCount}/${queuedMessages.length} queued messages`);
    }
    return processedCount;

  } catch (error) {
    console.error('Error in message queue processor:', error);
    return 0;
  }
}

/**
 * Start the message queue processor
 * Runs continuously, processing messages every 100ms
 */
function startMessageProcessor() {
  console.log('🔄 Starting message queue processor...');

  setInterval(async () => {
    try {
      await processQueuedMessages();
    } catch (error) {
      console.error('Fatal error in message processor:', error);
    }
  }, 100); // Check queue every 100ms

  console.log('✓ Message queue processor started');
}

module.exports = {
  processQueuedMessages,
  processMessage,
  startMessageProcessor,
  canMakeApiCall,
  recordApiCall,
  getWhatsAppCredentials,
  getEmailCredentials
};

function isNonRetriableWhatsAppError(error) {
  if (!error || !error.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('number of parameters does not match') ||
    msg.includes('mismatched variable') ||
    msg.includes('template params') ||
    msg.includes('placeholder') ||
    msg.includes('permission');
}

function safeParseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function buildTemplateVariables(messageContent, contact) {
  if (!messageContent) return {};
  let parsed = {};
  try {
    parsed = typeof messageContent === 'string' ? JSON.parse(messageContent) : messageContent;
  } catch (e) {
    console.error('Failed to parse message_content for campaign', e.message);
    return {};
  }

  // Legacy: plain object means static values
  if (parsed && !parsed.static && !parsed.mapping) {
    return parsed;
  }

  const variables = { ...(parsed.static || {}) };
  const mapping = parsed.mapping || {};

  Object.keys(mapping).forEach((key) => {
    const source = mapping[key];
    if (source === 'contact.name') variables[key] = contact?.name || '';
    if (source === 'contact.email') variables[key] = contact?.email || '';
    if (source === 'contact.phone') variables[key] = contact?.phone || '';
  });

  return variables;
}

function extractMediaFromMessageContent(messageContent) {
  if (!messageContent) return {};
  try {
    const parsed = typeof messageContent === 'string' ? JSON.parse(messageContent) : messageContent;
    if (parsed && parsed.media) {
      return parsed.media;
    }
  } catch (e) {
    console.error('Failed to parse media from message_content', e.message);
  }
  return {};
}
