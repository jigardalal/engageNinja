#!/usr/bin/env node

/**
 * WhatsApp webhook integration smoke test (tenant-only secrets)
 *
 * Preconditions:
 * - Backend server running on http://localhost:5173
 * - ENABLE_WEBHOOK_VERIFICATION=true set for the running server
 * - tenant_channel_settings has a WhatsApp row with webhook_verify_token and webhook_secret
 * - phone_number_id is stored in credentials_encrypted for that row
 *
 * What it does:
 * 1) Loads tenant webhook token/secret from the DB
 * 2) Exercises GET verification with the tenant token
 * 3) Sends a signed POST webhook with the tenant secret (expects 200)
 * 4) Sends a POST with an invalid signature (expects 401)
 */

const crypto = require('crypto');
const fetch = global.fetch || require('node-fetch'); // node >=18 has fetch
const db = require('../../src/db');

const BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:5173';

const decryptCredentials = (encryptedData) => {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
  const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
  const iv = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

const signBody = (bodyString, secret) => {
  const hash = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
  return `sha256=${hash}`;
};

const ensureFixtures = (tenantId) => {
  // Reuse an existing contact for the tenant or create one
  let contact = db.prepare(`SELECT id FROM contacts WHERE tenant_id = ? LIMIT 1`).get(tenantId);
  if (!contact) {
    contact = { id: crypto.randomUUID() };
    db.prepare(`
      INSERT INTO contacts (id, tenant_id, phone, name, consent_whatsapp, consent_email, consent_source)
      VALUES (?, ?, '+10000000001', 'Webhook Test Contact', 1, 1, 'manual')
    `).run(contact.id, tenantId);
  }

  // Reuse or create a test campaign
  let campaign = db.prepare(`SELECT id FROM campaigns WHERE tenant_id = ? AND name = 'Webhook Test Campaign' LIMIT 1`).get(tenantId);
  if (!campaign) {
    campaign = { id: crypto.randomUUID() };
    db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, description, channel, template_id, message_content, status)
      VALUES (?, ?, 'Webhook Test Campaign', 'Test campaign for webhook integration', 'whatsapp', NULL, 'Test message', 'sent')
    `).run(campaign.id, tenantId);
  }

  // Upsert a message with the provider_message_id we’ll use in tests
  const providerMessageId = 'wamid.test123';
  const existing = db.prepare(`SELECT id FROM messages WHERE provider_message_id = ?`).get(providerMessageId);
  const messageId = existing?.id || crypto.randomUUID();
  db.prepare(`DELETE FROM messages WHERE provider_message_id = ?`).run(providerMessageId);
  db.prepare(`
    INSERT INTO messages (id, tenant_id, campaign_id, contact_id, channel, provider, provider_message_id, status, content_snapshot)
    VALUES (?, ?, ?, ?, 'whatsapp', 'whatsapp_cloud', ?, 'queued', 'Webhook test content')
  `).run(messageId, tenantId, campaign.id, contact.id, providerMessageId);

  return { contactId: contact.id, campaignId: campaign.id, messageId, providerMessageId };
};

const main = async () => {
  const ch = db.prepare(`
    SELECT tenant_id, credentials_encrypted, webhook_verify_token, webhook_secret
    FROM tenant_channel_settings
    WHERE channel = 'whatsapp'
    LIMIT 1
  `).get();

  if (!ch) {
    throw new Error('No WhatsApp channel row found in tenant_channel_settings');
  }

  const creds = decryptCredentials(ch.credentials_encrypted);
  const phoneNumberId = creds?.phone_number_id;
  if (!phoneNumberId) {
    throw new Error('WhatsApp creds missing phone_number_id');
  }
  if (!ch.webhook_verify_token) {
    throw new Error('Missing webhook_verify_token for WhatsApp channel');
  }
  if (!ch.webhook_secret) {
    throw new Error('Missing webhook_secret for WhatsApp channel');
  }

  console.log('🔍 Using tenant webhook config:');
  console.log('  Phone Number ID:', phoneNumberId);
  console.log('  Verify Token:', ch.webhook_verify_token);
  console.log('  Secret: (hidden)');

  const fixtures = ensureFixtures(ch.tenant_id);
  console.log('🔧 Prepared fixtures for message_id:', fixtures.messageId);

  // 1) GET verification
  const challenge = 'engage-ninja-challenge';
  const verifyUrl = `${BASE_URL}/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=${encodeURIComponent(ch.webhook_verify_token)}&hub_challenge=${encodeURIComponent(challenge)}`;
  const verifyRes = await fetch(verifyUrl);
  const verifyBody = await verifyRes.text();
  if (verifyRes.status !== 200 || verifyBody !== challenge) {
    throw new Error(`Verify failed: status ${verifyRes.status}, body: ${verifyBody}`);
  }
  console.log('✅ GET verify passed');

  // Build webhook payload
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
                  id: 'wamid.test123',
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

  // 2) Signed POST (expect 200)
  const goodSig = signBody(bodyString, ch.webhook_secret);
  const goodRes = await fetch(`${BASE_URL}/webhooks/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': goodSig
    },
    body: bodyString
  });
  if (goodRes.status !== 200) {
    const text = await goodRes.text();
    throw new Error(`Signed POST failed: status ${goodRes.status}, body: ${text}`);
  }
  const goodData = await goodRes.json().catch(() => ({}));
  const messageRow = db.prepare(`SELECT status, sent_at, delivered_at, read_at, failed_at FROM messages WHERE provider_message_id = ?`).get(fixtures.providerMessageId);
  console.log('✅ Signed POST passed', goodData);
  console.log('   Message status after webhook:', messageRow);

  // 3) Bad signature (expect 401)
  const badRes = await fetch(`${BASE_URL}/webhooks/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=deadbeef'
    },
    body: bodyString
  });
  if (badRes.status !== 401) {
    const text = await badRes.text();
    throw new Error(`Bad signature should be 401 but got ${badRes.status}, body: ${text}`);
  }
  console.log('✅ Bad signature correctly rejected (401)');

  console.log('\n🎉 Webhook integration smoke test succeeded');
  process.exit(0);
};

main().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
