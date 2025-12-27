/**
 * Message Queue Processor
 * Processes queued messages and sends them via providers
 * Handles retries, error handling, and rate limiting
 */

const db = require('../db');
const { getProvider } = require('./messaging/providerFactory');
const crypto = require('crypto');

// Rate limiting: max 80 API calls per second for WhatsApp
const WHATSAPP_RATE_LIMIT = 80;
// Rate limiting: max 14 emails per second for SES
const EMAIL_RATE_LIMIT = 14;
// Rate limiting: approximate limit for Twilio SMS sends per second
const SMS_RATE_LIMIT = 40;
const RATE_WINDOW_MS = 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

// Track API call rate per channel
let apiCallTimestamps = {
  whatsapp: [],
  email: [],
  sms: []
};

/**
 * Check if we can make another API call without exceeding rate limit
 * @param {string} channel - 'whatsapp' or 'email'
 * @returns {boolean} True if we can proceed
 */
function canMakeApiCall(channel = 'whatsapp') {
  const now = Date.now();
  let limit = WHATSAPP_RATE_LIMIT;
  if (channel === 'email') {
    limit = EMAIL_RATE_LIMIT;
  } else if (channel === 'sms') {
    limit = SMS_RATE_LIMIT;
  }

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
async function markCampaignIfComplete(campaignId, tenantId) {
  try {
    const pending = await db.prepare(`
      SELECT COUNT(*) as queued_count
      FROM messages
      WHERE campaign_id = ? AND tenant_id = ? AND status = 'queued'
    `).get(campaignId, tenantId);

    if (pending?.queued_count === 0) {
      const now = new Date().toISOString();
      await db.prepare(`
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
 * Process a single queued message
 * Sends via SMS, WhatsApp, or Email via the appropriate provider
 * Handles retries and errors
 * @param {Object} message - Message record from database
 * @returns {Promise<boolean>} True if sent successfully
 */
async function processMessage(message) {
  try {
    // Get contact details
    const contact = await db.prepare('SELECT phone, email, name FROM contacts WHERE id = ?').get(message.contact_id);
    if (!contact) {
      await db.prepare(`
        UPDATE messages SET status = 'failed', status_reason = 'Contact not found'
        WHERE id = ?
      `).run(message.id);
      return false;
    }

    const campaign = await db.prepare(`
      SELECT template_id, message_content, channel, description, from_number, from_email FROM campaigns WHERE id = ?
    `).get(message.campaign_id);

    if (!campaign) {
      await db.prepare(`
        UPDATE messages SET status = 'failed', status_reason = 'Campaign not found'
        WHERE id = ?
      `).run(message.id);
      return false;
    }

    // Route to appropriate channel handler
    switch (message.channel) {
      case 'sms':
        return await processSmsMessage(message, contact, campaign);
      case 'whatsapp':
        return await processWhatsAppMessage(message, contact, campaign);
      case 'email':
        return await processEmailMessage(message, contact, campaign);
      default:
        throw new Error(`Unsupported channel: ${message.channel}`);
    }

  } catch (error) {
    console.error(`Error processing message ${message.id}:`, error.message);
    await handleMessageError(message, error);
    return false;
  }
}

/**
 * Process a WhatsApp message via provider
 */
async function processWhatsAppMessage(message, contact, campaign) {
  try {
    if (!contact.phone) {
      throw new Error('No phone number');
    }

    // Wait if rate limit would be exceeded
    while (!canMakeApiCall('whatsapp')) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get provider (handles demo mode automatically)
    const provider = await getProvider(message.tenant_id, 'whatsapp');

    // Build message object for provider
    const messageData = {
      id: message.id,
      phone_number: contact.phone,
      content: campaign.message_content,
      from_number: campaign.from_number
    };

    // Send via provider
    const result = await provider.send(messageData);

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    recordApiCall('whatsapp');

    // Update message with provider ID and mark as sent (webhook will update to delivered/read)
    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE messages
      SET status = 'sent', provider_message_id = ?, sent_at = ?, updated_at = ?
      WHERE id = ?
    `).run(result.provider_message_id, now, now, message.id);

    console.log(`✓ Message ${message.id} sent via WhatsApp (provider ID: ${result.provider_message_id})`);
    await markCampaignIfComplete(message.campaign_id, message.tenant_id);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Process an Email message via provider
 */
async function processEmailMessage(message, contact, campaign) {
  try {
    if (!contact.email) {
      throw new Error('No email address');
    }

    // Wait if rate limit would be exceeded
    while (!canMakeApiCall('email')) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get provider (handles demo mode automatically)
    const provider = await getProvider(message.tenant_id, 'email');

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
    const fromEmail = campaign.from_email || 'noreply@engageninja.com';

    // Build message object for provider
    const messageData = {
      id: message.id,
      to_email: contact.email,
      from_email: fromEmail,
      subject: subject,
      html_body: htmlBody,
      text_body: textBody
    };

    // Send via provider
    const result = await provider.send(messageData);

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    recordApiCall('email');

    // Update message with provider ID and mark as sent
    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE messages
      SET status = 'sent',
          provider_message_id = ?,
          sent_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(result.provider_message_id, now, now, message.id);

    console.log(`✓ Message ${message.id} sent via Email (provider ID: ${result.provider_message_id})`);
    await markCampaignIfComplete(message.campaign_id, message.tenant_id);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Process an SMS message via provider
 */
async function processSmsMessage(message, contact, campaign) {
  try {
    if (!contact.phone) {
      throw new Error('No phone number');
    }

    // Wait if rate limit would be exceeded
    while (!canMakeApiCall('sms')) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get provider (handles demo mode automatically)
    const provider = await getProvider(message.tenant_id, 'sms');

    // Build message object for provider
    const messageData = {
      id: message.id,
      phone_number: contact.phone,
      content: campaign.message_content,
      from_number: campaign.from_number
    };

    // Send via provider
    const result = await provider.send(messageData);

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    recordApiCall('sms');

    // Update message with provider ID and mark as sent (webhook will update to delivered/read)
    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE messages
      SET status = 'sent', provider_message_id = ?, sent_at = ?, updated_at = ?
      WHERE id = ?
    `).run(result.provider_message_id, now, now, message.id);

    console.log(`✓ Message ${message.id} sent via SMS (provider ID: ${result.provider_message_id})`);
    await markCampaignIfComplete(message.campaign_id, message.tenant_id);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Handle message errors and retry logic
 */
async function handleMessageError(message, error, options = {}) {
  const newRetries = (message.attempts || 0) + 1;
  const now = new Date().toISOString();
  const reason = error?.message || 'Unknown error';
  const forceFail = options.forceFail;

  if (forceFail || newRetries >= MAX_RETRIES) {
    // Max retries reached, mark as failed
    await db.prepare(`
      UPDATE messages
      SET status = 'failed', attempts = ?, updated_at = ?, status_reason = ?
      WHERE id = ?
    `).run(newRetries, now, reason, message.id);
    console.log(`✗ Message ${message.id} failed${forceFail ? ' (non-retriable)' : ''} after ${newRetries} retries: ${reason}`);
    await markCampaignIfComplete(message.campaign_id, message.tenant_id);
  } else {
    // Will retry later
    await db.prepare(`
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
    const queuedMessages = await db.prepare(`
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
      const lockResult = await db.prepare(`
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
  // Check if SQS is enabled - if yes, skip local processing
  const useSQS = !!process.env.SQS_OUTBOUND_MESSAGES_URL;

  if (useSQS) {
    console.log('ℹ️  SQS enabled - skipping local message processor');
    console.log(`   Messages will be processed by Lambda via: ${process.env.SQS_OUTBOUND_MESSAGES_URL}`);
    return;
  }

  console.log('🔄 Starting local message queue processor...');

  setInterval(async () => {
    try {
      await processQueuedMessages();
    } catch (error) {
      console.error('Fatal error in message processor:', error);
    }
  }, 100); // Check queue every 100ms

  console.log('✓ Local message queue processor started');
}

module.exports = {
  processQueuedMessages,
  processMessage,
  startMessageProcessor,
  canMakeApiCall,
  recordApiCall
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
