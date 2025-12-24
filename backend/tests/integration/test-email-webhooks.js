#!/usr/bin/env node

/**
 * SES/SNS webhook integration test (HMAC signature)
 *
 * Preconditions:
 * - Backend running on http://localhost:5173
 * - ENABLE_EMAIL_WEBHOOK_VERIFICATION=true (or ENABLE_WEBHOOK_VERIFICATION=true) in backend/.env
 * - SES_WEBHOOK_SECRET set (defaults to test-webhook-secret)
 */

const crypto = require('crypto');
const fetch = global.fetch || require('node-fetch');
const db = require('../../src/db');

const BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:5173';
const SES_SECRET = process.env.SES_WEBHOOK_SECRET || 'test-webhook-secret';

const ensureEmailFixtures = (tenantId) => {
  let contact = db.prepare(`SELECT id FROM contacts WHERE tenant_id = ? LIMIT 1`).get(tenantId);
  if (!contact) {
    contact = { id: crypto.randomUUID() };
    db.prepare(`
      INSERT INTO contacts (id, tenant_id, email, name, consent_email, consent_source)
      VALUES (?, ?, 'webhook@example.com', 'Email Webhook Contact', 1, 'manual')
    `).run(contact.id, tenantId);
  }

  let campaign = db.prepare(`SELECT id FROM campaigns WHERE tenant_id = ? AND name = 'Email Webhook Test Campaign' LIMIT 1`).get(tenantId);
  if (!campaign) {
    campaign = { id: crypto.randomUUID() };
    db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, description, channel, template_id, message_content, status)
      VALUES (?, ?, 'Email Webhook Test Campaign', 'Test campaign for email webhook', 'email', NULL, 'Test email message', 'sent')
    `).run(campaign.id, tenantId);
  }

  const providerMessageId = 'ses-test-message';
  db.prepare(`DELETE FROM messages WHERE provider_message_id = ?`).run(providerMessageId);
  const messageId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO messages (id, tenant_id, campaign_id, contact_id, channel, provider, provider_message_id, status, content_snapshot)
    VALUES (?, ?, ?, ?, 'email', 'ses', ?, 'queued', 'Email webhook test content')
  `).run(messageId, tenantId, campaign.id, contact.id, providerMessageId);

  return { contactId: contact.id, campaignId: campaign.id, messageId, providerMessageId };
};

const signBody = (body) => `sha256=${crypto.createHmac('sha256', SES_SECRET).update(body).digest('hex')}`;

const main = async () => {
  const tenant = db.prepare(`SELECT id FROM tenants LIMIT 1`).get();
  if (!tenant) throw new Error('No tenant found');

  const fixtures = ensureEmailFixtures(tenant.id);
  console.log('🔧 Prepared email fixtures with message_id:', fixtures.messageId);

  const sesEvent = {
    eventType: 'Delivery',
    mail: {
      messageId: fixtures.providerMessageId,
      timestamp: new Date().toISOString(),
      source: 'sender@example.com',
      destination: ['recipient@example.com']
    },
    delivery: {
      timestamp: new Date().toISOString()
    }
  };

  const snsPayload = {
    Type: 'Notification',
    Message: JSON.stringify(sesEvent),
    MessageId: crypto.randomUUID(),
    Timestamp: new Date().toISOString(),
    TopicArn: 'arn:aws:sns:us-east-1:123456789012:engageninja-test',
    UnsubscribeURL: 'https://example.com/unsubscribe'
  };

  const bodyString = JSON.stringify(snsPayload);
  const signature = signBody(bodyString);

  const goodRes = await fetch(`${BASE_URL}/webhooks/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ses-Signature': signature
    },
    body: bodyString
  });
  const goodData = await goodRes.json().catch(() => ({}));
  if (!goodRes.ok) {
    throw new Error(`Signed email webhook failed: status ${goodRes.status}, body: ${JSON.stringify(goodData)}`);
  }
  const messageRow = db.prepare(`SELECT status, delivered_at, read_at, failed_at FROM messages WHERE provider_message_id = ?`).get(fixtures.providerMessageId);
  console.log('✅ Signed email webhook passed', goodData);
  console.log('   Message status after webhook:', messageRow);

  const badRes = await fetch(`${BASE_URL}/webhooks/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ses-Signature': 'sha256=deadbeef'
    },
    body: bodyString
  });
  if (badRes.status !== 401) {
    const text = await badRes.text();
    throw new Error(`Bad signature should be 401 but got ${badRes.status}, body: ${text}`);
  }
  console.log('✅ Bad signature correctly rejected (401)');

  console.log('\n🎉 Email webhook integration test succeeded');
};

main().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
