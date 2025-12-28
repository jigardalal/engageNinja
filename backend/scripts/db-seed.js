#!/usr/bin/env node

/**
 * Comprehensive Database Seeding Script
 * Populates PostgreSQL database with:
 * - Plans, Users, Tenants, User-Tenant associations
 * - Tags, Contacts
 * - (Optional) Twilio SMS credentials for all tenants
 *
 * Usage:
 *   node backend/scripts/db-seed.js
 *
 * To seed Twilio SMS credentials:
 *   TWILIO_ACCOUNT_SID=AC... \
 *   TWILIO_AUTH_TOKEN=... \
 *   TWILIO_WEBHOOK_URL=https://example.com/webhooks/twilio \
 *   TWILIO_PHONE_NUMBER=+15550001111 \
 *   TWILIO_PHONE_MAP='tenant-uuid:+15550002222' \
 *     node backend/scripts/db-seed.js
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');
const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';

// Twilio SMS configuration (optional)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WEBHOOK_URL = process.env.TWILIO_WEBHOOK_URL || `${process.env.APP_URL || 'http://localhost:5173'}/webhooks/twilio`;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || null;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || null;

const TWILIO_PHONE_MAP = (process.env.TWILIO_PHONE_MAP || '')
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

const encryptCredentials = (data) => {
  const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

async function seed() {
  let pool = null;

  try {
    console.log('🌱 EngageNinja Database Seeding');
    console.log('================================\n');

    // PostgreSQL connection only (SQLite no longer supported)
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    const query = async (sql, params = []) => {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
      const result = await pool.query(pgSql, params);
      return result;
    };

    // Clear existing data in reverse dependency order
    console.log('🧹 Clearing existing data...');
    const tablesToClear = [
      'contacts',
      'contact_tags',
      'messages',
      'campaigns',
      'tenant_channel_settings',
      'tags',
      'email_templates',
      'whatsapp_templates',
      'user_tenants',
      'tenants',
      'users',
      'plans'
    ];

    for (const table of tablesToClear) {
      try {
        await pool.query(`DELETE FROM ${table}`);
      } catch (err) {
        // Table might not exist yet, that's ok
      }
    }
    console.log('✓ Data cleared\n');

    // 1. Seed Plans
    console.log('📋 Seeding plans...');
    const plans = [
      { id: 'free', name: 'Free Plan', whatsapp: 50, email: 500, users: 1, contacts: 50, sms: 25, api: 10000, ai: false, api_enabled: false, price: 0 },
      { id: 'starter', name: 'Starter Plan', whatsapp: 250, email: 10000, users: 3, contacts: 500, sms: 500, api: 100000, ai: false, api_enabled: false, price: 19.99 },
      { id: 'growth', name: 'Growth Plan', whatsapp: 1000, email: 50000, users: 10, contacts: 5000, sms: 2000, api: 500000, ai: true, api_enabled: true, price: 59.99 },
      { id: 'pro', name: 'Pro Plan', whatsapp: 5000, email: 100000, users: 20, contacts: 25000, sms: 10000, api: 1000000, ai: true, api_enabled: true, price: 149.99 },
      { id: 'enterprise', name: 'Enterprise Plan', whatsapp: 50000, email: 500000, users: 100, contacts: 250000, sms: 50000, api: 5000000, ai: true, api_enabled: true, price: 299.99 }
    ];

    for (const plan of plans) {
      await query(
        `INSERT INTO plans (id, name, whatsapp_messages_per_month, email_messages_per_month, max_users, contacts_limit, sms_messages_per_month, api_tokens_per_month, ai_features_enabled, api_enabled, default_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plan.id, plan.name, plan.whatsapp, plan.email, plan.users, plan.contacts, plan.sms, plan.api, plan.ai, plan.api_enabled, plan.price]
      );
    }
    console.log(`  ✓ ${plans.length} plans seeded\n`);

    // 2. Seed Users
    console.log('👥 Seeding users...');
    const users = [
      { email: 'platform.admin@engageninja.local', password: 'PlatformAdminPassword123', name: 'Platform Admin', role: 'platform_admin' },
      { email: 'admin@engageninja.local', password: 'AdminPassword123', name: 'Admin User', role: null },
      { email: 'member@engageninja.local', password: 'MemberPassword123', name: 'Team Member', role: null },
      { email: 'user@engageninja.local', password: 'UserPassword123', name: 'Regular User', role: null },
      { email: 'switcher@engageninja.local', password: 'UserPassword123', name: 'Switcher User', role: null },
      { email: 'system+demo@engageninja.local', password: uuidv4(), name: 'System', role: null },
      { email: 'system+support@engageninja.local', password: uuidv4(), name: 'Support', role: null },
      { email: 'system+audit@engageninja.local', password: uuidv4(), name: 'Audit', role: null }
    ];

    const hashedUsers = [];
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
      hashedUsers.push({
        id: uuidv4(),
        ...user,
        passwordHash
      });
    }

    for (const user of hashedUsers) {
      await query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, active, role_global)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.id, user.email, user.passwordHash, user.name.split(' ')[0], user.name.split(' ')[1] || '', true, user.role || 'none']
      );
    }
    console.log(`  ✓ ${hashedUsers.length} users seeded\n`);

    // 3. Seed Tenants
    console.log('🏢 Seeding tenants...');
    const tenantDemo = uuidv4();
    const tenantBeta = uuidv4();
    const tenants = [
      { id: tenantDemo, name: 'Demo Tenant', billing_email: 'demo@example.com', plan: 'growth' },
      { id: tenantBeta, name: 'Beta Tenant', billing_email: 'beta@example.com', plan: 'starter' }
    ];

    for (const tenant of tenants) {
      await query(
        `INSERT INTO tenants (id, name, plan_id, billing_email)
         VALUES (?, ?, ?, ?)`,
        [tenant.id, tenant.name, tenant.plan, tenant.billing_email]
      );
    }
    console.log(`  ✓ ${tenants.length} tenants seeded\n`);

    // 4. Seed User-Tenant associations
    console.log('🔗 Seeding user-tenant associations...');
    const associations = [
      // platform.admin@engageninja.local - Platform admin (no tenant associations needed)
      // admin@engageninja.local - Tenant admin
      { userId: hashedUsers[1].id, tenantId: tenantDemo, role: 'owner' },
      { userId: hashedUsers[1].id, tenantId: tenantBeta, role: 'admin' },
      // member@engageninja.local - Team member
      { userId: hashedUsers[2].id, tenantId: tenantDemo, role: 'member' },
      { userId: hashedUsers[2].id, tenantId: tenantBeta, role: 'member' },
      // user@engageninja.local - Regular user
      { userId: hashedUsers[3].id, tenantId: tenantDemo, role: 'member' },
      { userId: hashedUsers[3].id, tenantId: tenantBeta, role: 'member' },
      // switcher@engageninja.local - Switcher user
      { userId: hashedUsers[4].id, tenantId: tenantDemo, role: 'viewer' },
      { userId: hashedUsers[4].id, tenantId: tenantBeta, role: 'viewer' }
    ];

    for (const assoc of associations) {
      await query(
        `INSERT INTO user_tenants (user_id, tenant_id, role)
         VALUES (?, ?, ?)`,
        [assoc.userId, assoc.tenantId, assoc.role]
      );
    }
    console.log(`  ✓ ${associations.length} associations seeded\n`);

    // 5. Seed Tags
    console.log('🏷️  Seeding tags...');
    const tags = [
      { id: uuidv4(), tenant: tenantDemo, name: 'VIP' },
      { id: uuidv4(), tenant: tenantDemo, name: 'New Lead' },
      { id: uuidv4(), tenant: tenantBeta, name: 'Active User' },
      { id: uuidv4(), tenant: tenantBeta, name: 'Inactive' }
    ];

    for (const tag of tags) {
      await query(
        `INSERT INTO tags (id, tenant_id, name)
         VALUES (?, ?, ?)`,
        [tag.id, tag.tenant, tag.name]
      );
    }
    console.log(`  ✓ ${tags.length} tags seeded\n`);

    // 6. Seed Contacts
    console.log('📞 Seeding contacts...');
    const contacts = [
      { name: 'Jigs D', phone: '+16306700007', email: 'jigsd0007@gmail.com', wa: 1, em: 1 },
      { name: 'Jigar D', phone: '+919076002007', email: 'jigar@example.com', wa: 1, em: 1 },
      { name: 'John Smith', phone: '+12242088470', email: 'john@example.com', wa: 0, em: 1 }
    ];

    for (const tenant of [tenantDemo, tenantBeta]) {
      for (const contact of contacts) {
        const contactId = uuidv4();
        await query(
          `INSERT INTO contacts (id, tenant_id, phone, email, name, consent_whatsapp, consent_email, consent_source, consent_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP)`,
          [contactId, tenant, contact.phone, contact.email, contact.name, contact.wa, contact.em]
        );
      }
    }
    console.log(`  ✓ ${contacts.length * 2} contacts seeded\n`);

    // 7. (Optional) Seed Twilio SMS credentials
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      console.log('📱 Seeding Twilio SMS credentials...');
      console.log(`  Webhook URL: ${TWILIO_WEBHOOK_URL}`);
      if (TWILIO_PHONE_NUMBER) {
        console.log(`  Default phone: ${TWILIO_PHONE_NUMBER}`);
      }

      const encryptedCredentials = encryptCredentials({ accountSid: TWILIO_ACCOUNT_SID, authToken: TWILIO_AUTH_TOKEN });
      const today = new Date().toISOString();
      let twilioCount = 0;

      for (const tenant of [tenantDemo, tenantBeta]) {
        const phoneNumber = TWILIO_PHONE_MAP[tenant] || TWILIO_PHONE_NUMBER;
        if (!phoneNumber) {
          console.warn(`  ⚠️  Skipping ${tenant}: no Twilio phone number (use TWILIO_PHONE_NUMBER or TWILIO_PHONE_MAP)`);
          continue;
        }

        const config = {
          phone_number: phoneNumber,
          webhook_url: TWILIO_WEBHOOK_URL,
          messaging_service_sid: TWILIO_MESSAGING_SERVICE_SID
        };

        await query(
          `INSERT INTO tenant_channel_settings (id, tenant_id, channel, provider, credentials_encrypted, provider_config_json, is_connected, is_enabled, is_verified, webhook_url, phone_number, messaging_service_sid, created_at, updated_at)
           VALUES (?, ?, 'sms', 'twilio', ?, ?, false, true, true, ?, ?, ?, ?, ?)
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
             updated_at = excluded.updated_at`,
          [
            uuidv4(),
            tenant,
            encryptedCredentials,
            JSON.stringify(config),
            TWILIO_WEBHOOK_URL,
            phoneNumber,
            TWILIO_MESSAGING_SERVICE_SID,
            today,
            today
          ]
        );
        twilioCount++;
      }
      console.log(`  ✓ Twilio SMS seeded for ${twilioCount} tenant(s)\n`);
    } else if (process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_AUTH_TOKEN) {
      console.log('⚠️  Twilio SMS: Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN - skipping\n');
    }

    // 8. Seed Subscriptions (CRITICAL for Demo Tenant)
    console.log('💳 Seeding subscriptions...');
    const subscriptions = [
      { tenant: tenantDemo, planKey: 'growth', providerId: 'sub_demo_growth_1' },
      { tenant: tenantBeta, planKey: 'starter', providerId: 'sub_beta_starter_1' }
    ];

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    for (const sub of subscriptions) {
      await query(
        `INSERT INTO subscriptions (id, tenant_id, provider, provider_subscription_id, plan_key, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
         VALUES (?, ?, 'stripe', ?, ?, 'active', ?, ?, 0, ?, ?)`,
        [uuidv4(), sub.tenant, sub.providerId, sub.planKey, now.toISOString(), periodEnd.toISOString(), now.toISOString(), now.toISOString()]
      );
    }
    console.log(`  ✓ ${subscriptions.length} subscriptions seeded\n`);

    console.log('✅ Seeding complete!');
    console.log('\n🔐 Test Credentials:');
    console.log('  platform.admin@engageninja.local / PlatformAdminPassword123 (Platform Admin)');
    console.log('  admin@engageninja.local / AdminPassword123 (Tenant Admin)');
    console.log('  member@engageninja.local / MemberPassword123 (Team Member)');
    console.log('  user@engageninja.local / UserPassword123 (Regular User)\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up database connections
    if (pool) {
      await pool.end();
    }
  }
}

seed();
