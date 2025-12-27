/**
 * Seed Twilio SMS credentials for all tenants.
 *
 * Reads the master Twilio account SID/auth token from environment variables,
 * encrypts them, and upserts a row in tenant_channel_settings for each tenant.
 * Each tenant can supply its own phone number via TWILIO_PHONE_MAP or a default number.
 *
 * Usage:
 *   TWILIO_ACCOUNT_SID=AC... \
 *   TWILIO_AUTH_TOKEN=... \
 *   TWILIO_WEBHOOK_URL=https://example.com/webhooks/twilio \
 *   TWILIO_PHONE_NUMBER=+15550001111 \
 *   TWILIO_PHONE_MAP='tenant-uuid:+15550002222,other-tenant:+15550003333' \
 *     node backend/scripts/seed-twilio-sms.js
 */

const db = require('../src/db');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
const masterSid = process.env.TWILIO_ACCOUNT_SID;
const masterToken = process.env.TWILIO_AUTH_TOKEN;
const defaultWebhook = process.env.TWILIO_WEBHOOK_URL || `${process.env.APP_URL || 'http://localhost:5173'}/webhooks/twilio`;
const defaultPhone = process.env.TWILIO_PHONE_NUMBER || null;
const defaultMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null;
const phoneMapRaw = process.env.TWILIO_PHONE_MAP || '';

if (!masterSid || !masterToken) {
  console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in environment');
  process.exit(1);
}

const phoneMap = phoneMapRaw
  .split(',')
  .map((chunk) => chunk.trim())
  .filter(Boolean)
  .reduce((acc, entry) => {
    const [tenantId, phoneNumber] = entry.split(':').map((part) => part.trim());
    if (tenantId && phoneNumber) {
      acc[tenantId] = phoneNumber;
    }
    return acc;
  }, {});

console.log('Using webhook URL:', defaultWebhook);
if (defaultPhone) {
  console.log('Default Twilio phone number:', defaultPhone);
}

const encryptCredentials = (data) => {
  const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const main = async () => {
  try {
    const tenants = await db.prepare('SELECT id FROM tenants').all();

    if (!tenants.length) {
      console.warn('No tenants found - database might be empty.');
      process.exit(0);
    }

    const encryptedCredentials = encryptCredentials({ accountSid: masterSid, authToken: masterToken });

    const upsert = db.prepare(`
      INSERT INTO tenant_channel_settings
        (id, tenant_id, channel, provider, credentials_encrypted, provider_config_json,
         is_connected, is_enabled, is_verified, webhook_url, phone_number, messaging_service_sid,
         created_at, updated_at)
      VALUES (?, ?, 'sms', 'twilio', ?, ?, 0, 1, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, channel) DO UPDATE SET
        provider = excluded.provider,
        credentials_encrypted = excluded.credentials_encrypted,
        provider_config_json = excluded.provider_config_json,
        is_connected = excluded.is_connected,
        is_enabled = excluded.is_enabled,
        is_verified = excluded.is_verified,
        webhook_url = excluded.webhook_url,
        phone_number = excluded.phone_number,
        messaging_service_sid = excluded.messaging_service_sid,
        updated_at = excluded.updated_at
    `);

    const today = new Date().toISOString();

    for (const tenant of tenants) {
      const phoneNumber = phoneMap[tenant.id] || defaultPhone;
      if (!phoneNumber) {
        console.warn(`Skipping tenant ${tenant.id}: no Twilio phone number provided (use TWILIO_PHONE_NUMBER or TWILIO_PHONE_MAP)`);
        continue;
      }

      const config = {
        phone_number: phoneNumber,
        webhook_url: defaultWebhook,
        messaging_service_sid: defaultMessagingServiceSid
      };

      await upsert.run(
        uuidv4(),
        tenant.id,
        encryptedCredentials,
        JSON.stringify(config),
        defaultWebhook,
        phoneNumber,
        defaultMessagingServiceSid,
        today,
        today
      );
      console.log(`Seeded Twilio SMS config for tenant ${tenant.id} (${phoneNumber})`);
    }

    console.log('Twilio SMS seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Twilio SMS:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
};

main();
