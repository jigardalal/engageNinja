#!/usr/bin/env node

/**
 * Database Seeding Script
 * Populates database with test data
 * Supports both SQLite and PostgreSQL
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use the same database adapter as the main application
// This supports both SQLite and PostgreSQL
const db = require('../src/db');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

// Ensure global_tags table exists even if migration has not run yet
db.exec(`
  CREATE TABLE IF NOT EXISTS global_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_global_tags_status ON global_tags(status);
`);

const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
const encryptCredentials = (data) => {
  const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

function ensureWhatsAppWebhookColumns() {
  const cols = db.prepare('PRAGMA table_info(tenant_channel_settings)').all();
  const names = cols.map(c => c.name);
  const addCol = (name) => {
    if (!names.includes(name)) {
      db.prepare(`ALTER TABLE tenant_channel_settings ADD COLUMN ${name} TEXT`).run();
    }
  };
  addCol('webhook_verify_token');
  addCol('webhook_secret');
}

function ensureUserProfileColumns() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  const addCol = (name, type = 'TEXT') => {
    if (!cols.includes(name)) {
      db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${type}`).run();
    }
  };
  addCol('first_name');
  addCol('last_name');
  addCol('phone');
  addCol('timezone');
  addCol('locale');
}

console.log('🌱 EngageNinja Database Seeding');
console.log('================================\n');

const planIds = {
  free: 'free',
  starter: 'starter',
  growth: 'growth',
  pro: 'pro',
  enterprise: 'enterprise'
};

let userId = {
  admin: uuidv4(),
  user: uuidv4(),
  switcher: uuidv4(),
  platformAdmin: uuidv4(),
  member: uuidv4(),
  viewer: uuidv4()
};

let tenantId = {
  demo: uuidv4(),
  beta: uuidv4()
};

try {
  // 1. Seed Plans
  console.log('📋 Seeding plans...');
  const plans = [
    {
      id: planIds.free,
      name: 'Free Plan',
      whatsapp_messages_per_month: 50,
      email_messages_per_month: 500,
      max_users: 1,
      contacts_limit: 50,
      sms_messages_per_month: 25,
      api_tokens_per_month: 10000,
      ai_features_enabled: 0,
      api_enabled: 0,
      default_price: 0
    },
    {
      id: planIds.starter,
      name: 'Starter Plan',
      whatsapp_messages_per_month: 250,
      email_messages_per_month: 10000,
      max_users: 3,
      contacts_limit: 500,
      sms_messages_per_month: 500,
      api_tokens_per_month: 100000,
      ai_features_enabled: 0,
      api_enabled: 0,
      default_price: 49
    },
    {
      id: planIds.growth,
      name: 'Growth Plan',
      whatsapp_messages_per_month: 1000,
      email_messages_per_month: 50000,
      max_users: 10,
      contacts_limit: 5000,
      sms_messages_per_month: 2000,
      api_tokens_per_month: 500000,
      ai_features_enabled: 1,
      api_enabled: 1,
      default_price: 129
    },
    {
      id: planIds.pro,
      name: 'Pro Plan',
      whatsapp_messages_per_month: 5000,
      email_messages_per_month: 200000,
      max_users: 25,
      contacts_limit: 10000,
      sms_messages_per_month: 10000,
      api_tokens_per_month: 1000000,
      ai_features_enabled: 1,
      api_enabled: 1,
      default_price: 299
    },
    {
      id: planIds.enterprise,
      name: 'Enterprise Plan',
      whatsapp_messages_per_month: 20000,
      email_messages_per_month: 500000,
      max_users: 50,
      contacts_limit: 25000,
      sms_messages_per_month: 25000,
      api_tokens_per_month: 2000000,
      ai_features_enabled: 1,
      api_enabled: 1,
      default_price: 999
    }
  ];

  const insertPlan = db.prepare(`
    INSERT INTO plans
    (id, name, whatsapp_messages_per_month, email_messages_per_month, max_users, contacts_limit,
      sms_messages_per_month, api_tokens_per_month, ai_features_enabled, api_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
  `);

  const updatePlan = db.prepare(`
    UPDATE plans SET
      name = ?,
      whatsapp_messages_per_month = ?,
      email_messages_per_month = ?,
      max_users = ?,
      contacts_limit = ?,
      sms_messages_per_month = ?,
      api_tokens_per_month = ?,
      ai_features_enabled = ?,
      api_enabled = ?,
      default_price = ?
    WHERE id = ?
  `);

  for (const plan of plans) {
    insertPlan.run(
      plan.id,
      plan.name,
      plan.whatsapp_messages_per_month,
      plan.email_messages_per_month,
      plan.max_users,
      plan.contacts_limit,
      plan.sms_messages_per_month,
      plan.api_tokens_per_month,
      plan.ai_features_enabled,
      plan.api_enabled
    );
    updatePlan.run(
      plan.name,
      plan.whatsapp_messages_per_month,
      plan.email_messages_per_month,
      plan.max_users,
      plan.contacts_limit,
      plan.sms_messages_per_month,
      plan.api_tokens_per_month,
      plan.ai_features_enabled,
      plan.api_enabled,
      plan.default_price,
      plan.id
    );
  }
  console.log(`  ✓ ${plans.length} plans seeded`);

  // 2. Seed Users
console.log('👥 Seeding users with RBAC roles...');
ensureUserProfileColumns();
const adminHash = bcrypt.hashSync('AdminPassword123', BCRYPT_ROUNDS);
  const userHash = bcrypt.hashSync('UserPassword123', BCRYPT_ROUNDS);
  const switcherHash = bcrypt.hashSync('SwitcherPassword123', BCRYPT_ROUNDS);
  const platformAdminHash = bcrypt.hashSync('PlatformAdminPassword123', BCRYPT_ROUNDS);
  const memberHash = bcrypt.hashSync('MemberPassword123', BCRYPT_ROUNDS);
  const viewerHash = bcrypt.hashSync('ViewerPassword123', BCRYPT_ROUNDS);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role_global, active, first_name, last_name, phone, timezone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
  `);

  const existingAdmin = db.prepare(`SELECT id FROM users WHERE email = ?`).get('admin@engageninja.local');
  if (existingAdmin) userId.admin = existingAdmin.id;
  const existingUser = db.prepare(`SELECT id FROM users WHERE email = ?`).get('user@engageninja.local');
  if (existingUser) userId.user = existingUser.id;
  const existingSwitcher = db.prepare(`SELECT id FROM users WHERE email = ?`).get('switcher@engageninja.local');
  if (existingSwitcher) userId.switcher = existingSwitcher.id;
  const existingPlatformAdmin = db.prepare(`SELECT id FROM users WHERE email = ?`).get('platform.admin@engageninja.local');
  if (existingPlatformAdmin) userId.platformAdmin = existingPlatformAdmin.id;
  const existingMember = db.prepare(`SELECT id FROM users WHERE email = ?`).get('member@engageninja.local');
  if (existingMember) userId.member = existingMember.id;
  const existingViewer = db.prepare(`SELECT id FROM users WHERE email = ?`).get('viewer@engageninja.local');
  if (existingViewer) userId.viewer = existingViewer.id;

  if (!existingAdmin) insertUser.run(userId.admin, 'admin@engageninja.local', 'Admin User', adminHash, 'none', 1, 'Admin', 'User', '+10000000001', 'America/New_York');
  if (!existingUser) insertUser.run(userId.user, 'user@engageninja.local', 'Regular User', userHash, 'none', 1, 'User', 'Admin', '+10000000002', 'America/Chicago');
  if (!existingSwitcher) insertUser.run(userId.switcher, 'switcher@engageninja.local', 'Switcher User', switcherHash, 'none', 1, 'Switcher', 'User', '+10000000003', 'America/Denver');
  if (!existingPlatformAdmin) insertUser.run(userId.platformAdmin, 'platform.admin@engageninja.local', 'Platform Admin', platformAdminHash, 'platform_admin', 1, 'Platform', 'Admin', '+10000000004', 'America/Los_Angeles');
  if (!existingMember) insertUser.run(userId.member, 'member@engageninja.local', 'Member User', memberHash, 'none', 1, 'Member', 'User', '+10000000005', 'America/New_York');
  if (!existingViewer) insertUser.run(userId.viewer, 'viewer@engageninja.local', 'Viewer User', viewerHash, 'none', 1, 'Viewer', 'User', '+10000000006', 'America/New_York');
  console.log('  ✓ Users seeded/resolved (3 original + platform admin + member + viewer)');

  // 3. Seed Tenants
  console.log('🏢 Seeding tenants...');
  const insertTenant = db.prepare(`
    INSERT INTO tenants (id, name, plan_id)
    VALUES (?, ?, ?) ON CONFLICT DO NOTHING
  `);

  const existingTenant = db.prepare(`SELECT id FROM tenants WHERE name = ?`).get('Demo Tenant');
  if (existingTenant) {
    tenantId.demo = existingTenant.id;
    db.prepare(`UPDATE tenants SET plan_id = ? WHERE id = ?`).run(planIds.growth, tenantId.demo);
  } else {
    insertTenant.run(tenantId.demo, 'Demo Tenant', planIds.growth);
  }

  const existingBetaTenant = db.prepare(`SELECT id FROM tenants WHERE name = ?`).get('Beta Tenant');
  if (existingBetaTenant) {
    tenantId.beta = existingBetaTenant.id;
    db.prepare(`UPDATE tenants SET plan_id = ? WHERE id = ?`).run(planIds.starter, tenantId.beta);
  } else {
    insertTenant.run(tenantId.beta, 'Beta Tenant', planIds.starter);
  }
  console.log('  ✓ Demo tenant present (Growth plan) & Beta tenant present (Starter plan)');

  const seededTenantIds = [tenantId.demo, tenantId.beta];

  // 4. Seed User-Tenant Associations with diverse roles
  console.log('🔗 Seeding user-tenant associations with RBAC roles...');
  const insertUserTenant = db.prepare(`
    INSERT INTO user_tenants (user_id, tenant_id, role, active)
    VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING
  `);

  // Demo Tenant: owner (auto-upgraded from previous 'admin'), admin, member, viewer
  insertUserTenant.run(userId.admin, tenantId.demo, 'owner', 1);
  insertUserTenant.run(userId.user, tenantId.demo, 'admin', 1);
  insertUserTenant.run(userId.member, tenantId.demo, 'member', 1);
  insertUserTenant.run(userId.viewer, tenantId.demo, 'viewer', 1);

  // Beta Tenant: multi-tenant users with different roles
  insertUserTenant.run(userId.user, tenantId.beta, 'owner', 1);
  insertUserTenant.run(userId.switcher, tenantId.demo, 'member', 1);
  insertUserTenant.run(userId.switcher, tenantId.beta, 'member', 1);

  // Platform admin can optionally access tenants (for support purposes)
  insertUserTenant.run(userId.platformAdmin, tenantId.demo, 'admin', 1);

  console.log('  ✓ User-tenant associations seeded with diverse roles');
  console.log('    - Demo Tenant: owner (admin), admin (user), member (member), viewer (viewer)');
  console.log('    - Beta Tenant: owner (user), member (switcher)');

  // 5. Seed Global Tags then Tenant Tags
  console.log('🏷️  Seeding tags...');
  seedGlobalTags();
  const tagNames = ['vip', 'newsletter', 'active', 'new', 'beta_tester'];

const insertTag = db.prepare(`
  INSERT INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 'tenant', 0) ON CONFLICT DO NOTHING
`);

function seedGlobalTags() {
  const globalTags = [
    { id: uuidv4(), name: 'vip' },
    { id: uuidv4(), name: 'newsletter' },
    { id: uuidv4(), name: 'churn_risk' }
  ];

  for (const tag of globalTags) {
    db.prepare(`
      INSERT INTO global_tags (id, name, status, created_at, updated_at)
      VALUES (?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING
    `).run(tag.id, tag.name);
  }
}

function copyGlobalTagsToTenant(tenantUuid) {
  const activeGlobal = db.prepare(`
    SELECT name FROM global_tags WHERE status = 'active'
  `).all();

  const insertTenantTag = db.prepare(`
    INSERT INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 'tenant', 1) ON CONFLICT DO NOTHING
  `);

  for (const g of activeGlobal) {
    insertTenantTag.run(uuidv4(), tenantUuid, g.name);
  }
}

  const seedTagsForTenant = (tenantUuid) => {
    const tagIds = {};
    for (const tagName of tagNames) {
      const existingTag = db.prepare(`SELECT id FROM tags WHERE tenant_id = ? AND name = ?`).get(tenantUuid, tagName);
      const tagId = existingTag ? existingTag.id : uuidv4();
      tagIds[tagName] = tagId;
      if (!existingTag) {
        insertTag.run(tagId, tenantUuid, tagName);
      }
    }
    return tagIds;
  };

  const tagIdsByTenant = {
    [tenantId.demo]: seedTagsForTenant(tenantId.demo),
    [tenantId.beta]: seedTagsForTenant(tenantId.beta)
  };
  // Ensure active global tags copied to tenants
  seededTenantIds.forEach(copyGlobalTagsToTenant);
  console.log(`  ✓ ${tagNames.length * seededTenantIds.length} tags seeded/resolved across tenants`);

  // 6. Seed Contacts (shared across tenants)
  console.log('📞 Seeding contacts...');
  const contacts = [
    { name: 'Jigs D', phone: '+16306700007', email: 'Jigsd0007@gmail.com', whatsapp: 1, email_consent: 1, tags: ['vip', 'active'] },
    { name: 'Jigar D', phone: '+919076002007', email: 'jigar_dalal@xlnctechnologies.us', whatsapp: 1, email_consent: 1, tags: ['vip', 'active'] },
    { name: 'Jigar D', phone: '+12242088470', email: 'djigs0007@gmail.com', whatsapp: 0, email_consent: 1, tags: ['vip', 'active'] },
  ];

  const insertContact = db.prepare(`
    INSERT INTO contacts
    (id, tenant_id, phone, email, name, consent_whatsapp, consent_email, consent_source, consent_updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING
  `);

  const insertContactTag = db.prepare(`
    INSERT INTO contact_tags (contact_id, tag_id)
    VALUES (?, ?) ON CONFLICT DO NOTHING
  `);

  const seedContactsForTenant = (tenantUuid, tagIds) => {
    let created = 0;
    for (const contact of contacts) {
      const existingContact = db.prepare(`SELECT id FROM contacts WHERE tenant_id = ? AND phone = ?`).get(tenantUuid, contact.phone);
      const contactId = existingContact ? existingContact.id : uuidv4();

      if (!existingContact) {
        insertContact.run(
          contactId,
          tenantUuid,
          contact.phone,
          contact.email,
          contact.name,
          contact.whatsapp,
          contact.email_consent
        );
        created += 1;
      }

      for (const tagName of contact.tags) {
        if (tagIds[tagName]) {
          insertContactTag.run(contactId, tagIds[tagName]);
        }
      }
    }
    return created;
  };

  const demoContacts = seedContactsForTenant(tenantId.demo, tagIdsByTenant[tenantId.demo]);
  const betaContacts = seedContactsForTenant(tenantId.beta, tagIdsByTenant[tenantId.beta]);
  console.log(`  ✓ Contacts seeded with tags (Demo: ${demoContacts}, Beta: ${betaContacts})`);

  // 7. Seed Usage Counter
  console.log('📊 Seeding usage counters...');
  const currentDate = new Date();
  const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const insertUsageCounter = db.prepare(`
    INSERT INTO usage_counters
    (id, tenant_id, year_month, whatsapp_messages_sent, email_messages_sent)
    VALUES (?, ?, ?, 0, 0) ON CONFLICT DO NOTHING
  `);

  for (const tId of seededTenantIds) {
    insertUsageCounter.run(uuidv4(), tId, yearMonth);
  }
  console.log(`  ✓ Usage counters seeded for month: ${yearMonth} (per tenant)`);

  // 8. Seed Tenant Channel Settings (WhatsApp demo defaults)
  console.log('📡 Seeding tenant channel settings (WhatsApp)...');
  ensureWhatsAppWebhookColumns();
  ensureUserProfileColumns();

  const existingChannel = db.prepare(`
    SELECT id FROM tenant_channel_settings WHERE tenant_id = ? AND channel = 'whatsapp'
  `).get(tenantId.demo);

  const whatsappCreds = encryptCredentials({
    access_token: '',
    phone_number_id: '895775443623675',
    business_account_id: '1593332971664754'
  });

  const now = new Date().toISOString();
  const webhookVerifyToken = 'engage-ninja';
  // Use the real Meta app secret so webhook signatures verify in dev
  const webhookSecret = '92c421067e2f12a3b9afbc25dd109103';

  if (existingChannel) {
    db.prepare(`
      UPDATE tenant_channel_settings
      SET credentials_encrypted = ?, provider = 'whatsapp_cloud', is_connected = 0, connected_at = NULL,
          updated_at = ?, webhook_verify_token = ?, webhook_secret = ?
      WHERE tenant_id = ? AND channel = 'whatsapp'
    `).run(whatsappCreds, now, webhookVerifyToken, webhookSecret, tenantId.demo);
    console.log('  ✓ Updated existing WhatsApp channel for demo tenant');
  } else {
    db.prepare(`
      INSERT INTO tenant_channel_settings
      (id, tenant_id, channel, provider, credentials_encrypted, verified_sender_email, is_connected, connected_at, created_at, updated_at, webhook_verify_token, webhook_secret)
      VALUES (?, ?, 'whatsapp', 'whatsapp_cloud', ?, NULL, 0, NULL, ?, ?, ?, ?) ON CONFLICT DO NOTHING
    `).run(uuidv4(), tenantId.demo, whatsappCreds, now, now, webhookVerifyToken, webhookSecret);
    console.log('  ✓ Inserted WhatsApp channel for demo tenant');
  }

  // 9. Seed Tenant Channel Settings (Email SES defaults)
  console.log('📧 Seeding tenant channel settings (Email SES)...');
  const emailCreds = encryptCredentials({
    provider: 'ses',
    accessKeyId: process.env.SEED_AWS_ACCESS_KEY_ID || '[REDACTED]',
    secretAccessKey: process.env.SEED_AWS_SECRET_ACCESS_KEY || '[REDACTED]',
    region: process.env.SEED_AWS_REGION || 'us-east-2',
    verifiedSenderEmail: process.env.SEED_SES_VERIFIED_EMAIL || 'jigsd0007@gmail.com'
  });

  const existingEmail = db.prepare(`
    SELECT id FROM tenant_channel_settings WHERE tenant_id = ? AND channel = 'email'
  `).get(tenantId.demo);

  if (existingEmail) {
    db.prepare(`
      UPDATE tenant_channel_settings
      SET credentials_encrypted = ?, provider = 'ses', verified_sender_email = 'jigsd0007@gmail.com',
          is_connected = 0, connected_at = NULL, updated_at = ?
      WHERE tenant_id = ? AND channel = 'email'
    `).run(emailCreds, now, tenantId.demo);
    console.log('  ✓ Updated existing Email channel for demo tenant');
  } else {
    db.prepare(`
      INSERT INTO tenant_channel_settings
      (id, tenant_id, channel, provider, credentials_encrypted, verified_sender_email, is_connected, connected_at, created_at, updated_at)
      VALUES (?, ?, 'email', 'ses', ?, 'jigsd0007@gmail.com', 0, NULL, ?, ?) ON CONFLICT DO NOTHING
    `).run(uuidv4(), tenantId.demo, emailCreds, now, now);
    console.log('  ✓ Inserted Email channel for demo tenant');
  }

  // 10. Seed Tenant Business Info (for 10DLC)
  console.log('\n🏢 Seeding tenant business info (for 10DLC)...');

  const businessInfo = [
    {
      tenant_id: tenantId.demo,
      legal_business_name: 'EngageNinja Demo Corp',
      dba_name: 'EngageNinja',
      business_website: 'https://engageninja.local',
      business_type: 'corporation',
      industry_vertical: 'software',
      business_registration_number: '12-3456789',
      country: 'US',
      business_address: '123 Tech Boulevard',
      business_city: 'San Francisco',
      business_state: 'CA',
      business_zip: '94103',
      owner_name: 'John Doe',
      owner_title: 'CEO',
      owner_email: 'owner@engageninja.local',
      owner_phone: '+14155555555',
      business_contact_name: 'Support Team',
      business_contact_email: 'support@engageninja.local',
      business_contact_phone: '+14155555556',
      monthly_sms_volume_estimate: 10000,
      use_case_description: 'Customer engagement and transactional messages',
      sms_opt_in_language: 'By replying to this message with any text, you consent to receive recurring SMS messages from EngageNinja.',
      gdpr_compliant: 0,
      tcpa_compliant: 1,
      verification_status: 'verified',
      verified_by_admin: userId.platformAdmin,
      verified_at: now
    },
    {
      tenant_id: tenantId.beta,
      legal_business_name: 'Beta Test LLC',
      dba_name: 'Beta Test',
      business_website: 'https://beta.engageninja.local',
      business_type: 'llc',
      industry_vertical: 'consulting',
      business_registration_number: '98-7654321',
      country: 'US',
      business_address: '456 Enterprise Way',
      business_city: 'New York',
      business_state: 'NY',
      business_zip: '10001',
      owner_name: 'Jane Smith',
      owner_title: 'Founder',
      owner_email: 'owner@beta.local',
      owner_phone: '+12125555555',
      business_contact_name: null,
      business_contact_email: null,
      business_contact_phone: null,
      monthly_sms_volume_estimate: 5000,
      use_case_description: 'Marketing campaigns and customer notifications',
      sms_opt_in_language: 'Standard SMS consent language',
      gdpr_compliant: 0,
      tcpa_compliant: 1,
      verification_status: 'pending',
      verified_by_admin: null,
      verified_at: null
    }
  ];

  for (const biz of businessInfo) {
    const existing = db.prepare('SELECT id FROM tenant_business_info WHERE tenant_id = ?').get(biz.tenant_id);
    if (!existing) {
      db.prepare(`
        INSERT INTO tenant_business_info
        (id, tenant_id, legal_business_name, dba_name, business_website, business_type, industry_vertical,
         business_registration_number, country, business_address, business_city, business_state, business_zip,
         owner_name, owner_title, owner_email, owner_phone, business_contact_name, business_contact_email, business_contact_phone,
         monthly_sms_volume_estimate, use_case_description, sms_opt_in_language, gdpr_compliant, tcpa_compliant,
         verification_status, verified_by_admin, verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
      `).run(
        uuidv4(), biz.tenant_id, biz.legal_business_name, biz.dba_name, biz.business_website, biz.business_type, biz.industry_vertical,
        biz.business_registration_number, biz.country, biz.business_address, biz.business_city, biz.business_state, biz.business_zip,
        biz.owner_name, biz.owner_title, biz.owner_email, biz.owner_phone, biz.business_contact_name, biz.business_contact_email, biz.business_contact_phone,
        biz.monthly_sms_volume_estimate, biz.use_case_description, biz.sms_opt_in_language, biz.gdpr_compliant, biz.tcpa_compliant,
        biz.verification_status, biz.verified_by_admin, biz.verified_at, now, now
      );
    }
  }
  console.log('  ✓ Business info seeded for demo and beta tenants');

  // 11. Seed 10DLC Brands (demo tenant has approved, beta is pending)
  console.log('🔏 Seeding 10DLC brand registrations...');
  const brands = [
    {
      tenant_id: tenantId.demo,
      legal_business_name: 'EngageNinja Demo Corp',
      dba_name: 'EngageNinja',
      business_type: 'corporation',
      industry_vertical: 'software',
      business_registration_number: '12-3456789',
      country: 'US',
      business_address: '123 Tech Boulevard',
      business_city: 'San Francisco',
      business_state: 'CA',
      business_zip: '94103',
      owner_name: 'John Doe',
      owner_title: 'CEO',
      owner_email: 'owner@engageninja.local',
      owner_phone: '+14155555555',
      provider: 'twilio',
      provider_brand_id: 'BRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      provider_status: 'approved',
      phone_number: '+1415555DEMO',
      provider_phone_id: 'PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      phone_status: 'active',
      campaign_type: 'marketing',
      is_active: 1,
      provider_config_json: JSON.stringify({ accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }),
      provider_verified_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      provider_approved_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    }
  ];

  for (const brand of brands) {
    const existing = db.prepare('SELECT id FROM tenant_10dlc_brands WHERE tenant_id = ? AND is_active = 1').get(brand.tenant_id);
    if (!existing) {
      db.prepare(`
        INSERT INTO tenant_10dlc_brands
        (id, tenant_id, legal_business_name, dba_name, business_type, industry_vertical, business_registration_number, country,
         business_address, business_city, business_state, business_zip, owner_name, owner_title, owner_email, owner_phone,
         provider, provider_brand_id, provider_status, phone_number, provider_phone_id, phone_status,
         campaign_type, is_active, provider_config_json, provider_verified_at, provider_approved_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
      `).run(
        uuidv4(), brand.tenant_id, brand.legal_business_name, brand.dba_name, brand.business_type, brand.industry_vertical,
        brand.business_registration_number, brand.country, brand.business_address, brand.business_city, brand.business_state, brand.business_zip,
        brand.owner_name, brand.owner_title, brand.owner_email, brand.owner_phone,
        brand.provider, brand.provider_brand_id, brand.provider_status, brand.phone_number, brand.provider_phone_id, brand.phone_status,
        brand.campaign_type, brand.is_active, brand.provider_config_json, brand.provider_verified_at, brand.provider_approved_at, now, now
      );
    }
  }
  console.log('  ✓ 10DLC brands seeded (demo: approved, beta: pending)');

  // 12. Seed Tenant Channel Credentials V2 (SMS & Email - provider-agnostic)
  console.log('🔐 Seeding tenant channel credentials (SMS & Email)...');

  // Encrypt credentials as JSON (works for any provider)
  const twilioSmsCreds = encryptCredentials(JSON.stringify({
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'auth_token_here'
  }));

  const awsSesCreds = encryptCredentials(JSON.stringify({
    accessKeyId: process.env.SEED_AWS_ACCESS_KEY_ID || '[REDACTED]',
    secretAccessKey: process.env.SEED_AWS_SECRET_ACCESS_KEY || '[REDACTED]',
    region: process.env.SEED_AWS_REGION || 'us-east-2'
  }));

  const credentialsList = [
    {
      tenant_id: tenantId.demo,
      channel: 'sms',
      provider: 'twilio',
      credentials_encrypted: twilioSmsCreds,
      is_enabled: 1,
      is_verified: 1,
      webhook_secret: 'twilio-demo-secret'
    },
    {
      tenant_id: tenantId.demo,
      channel: 'email',
      provider: 'aws_ses',
      credentials_encrypted: awsSesCreds,
      is_enabled: 1,
      is_verified: 1,
      webhook_secret: 'aws-sns-secret'
    }
  ];

  for (const cred of credentialsList) {
    const existing = db.prepare('SELECT id FROM tenant_channel_settings WHERE tenant_id = ? AND channel = ?').get(cred.tenant_id, cred.channel);
    if (!existing) {
      const webhookSecretEncrypted = encryptCredentials(cred.webhook_secret);

      db.prepare(`
        INSERT INTO tenant_channel_settings
        (id, tenant_id, channel, provider, credentials_encrypted, is_enabled, is_verified, verified_at,
         webhook_secret_encrypted, webhook_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
      `).run(
        uuidv4(),
        cred.tenant_id,
        cred.channel,
        cred.provider,
        cred.credentials_encrypted,
        cred.is_enabled,
        cred.is_verified,
        cred.is_verified ? now : null,
        webhookSecretEncrypted,
        `https://engageninja.local/api/webhooks/${cred.provider}/${cred.channel}`,
        now,
        now
      );
    }
  }
  console.log('  ✓ Channel credentials seeded (SMS + Email)');

  // 13. Update tenants table with demo flag
  console.log('🎭 Seeding demo flag on tenants...');
  db.prepare('UPDATE tenants SET is_demo = 1, demo_created_at = ?, demo_created_by = ? WHERE id = ?').run(now, userId.platformAdmin, tenantId.demo);
  db.prepare('UPDATE tenants SET is_demo = 0 WHERE id = ?').run(tenantId.beta);
  console.log('  ✓ Demo flag set (demo=true, beta=false)');

  // Summary
  console.log('\n📊 Seed Data Summary:');
  console.log(`  Plans: ${plans.length}`);
  console.log('  Global Tags: seeded & copied to tenants');
  console.log(`  Users: 6 (3 original + platform admin + member + viewer)`);
  console.log(`  Tenants: 2 (Demo Tenant on Growth plan, Beta Tenant on Starter plan)`);
  console.log(`  User-Tenant Associations: 8 (diverse roles: owner, admin, member, viewer)`);
  console.log(`  Tags: ${tagNames.length * seededTenantIds.length}`);
  console.log(`  Contacts: ${contacts.length * seededTenantIds.length}`);
  console.log(`  Usage Counters: ${seededTenantIds.length}`);
  console.log(`  Channel Settings: 2 (WhatsApp + Email demo defaults)`);
  console.log(`  Contact-Tag Associations: ${contacts.reduce((sum, c) => sum + c.tags.length, 0) * seededTenantIds.length}`);
  console.log(`  Business Info: 2 (demo verified, beta pending)`);
  console.log(`  10DLC Brands: 1 (demo approved with phone number)`);
  console.log(`  Channel Credentials V2: 2 (SMS + Email for demo)`);
  console.log(`  Demo Flags: Demo Tenant is_demo=1, Beta Tenant is_demo=0`);

  console.log('\n✅ Seeding complete!');
  console.log('\n🔐 Test Credentials (with RBAC roles):');
  console.log('  Owner/Admin: admin@engageninja.local / AdminPassword123 (owner of Demo Tenant)');
  console.log('  Admin/Owner: user@engageninja.local / UserPassword123 (admin of Demo, owner of Beta)');
  console.log('  Member: switcher@engageninja.local / SwitcherPassword123 (member in both tenants)');
  console.log('  Member: member@engageninja.local / MemberPassword123 (member of Demo Tenant)');
  console.log('  Viewer: viewer@engageninja.local / ViewerPassword123 (viewer of Demo Tenant)');
  console.log('  Platform Admin: platform.admin@engageninja.local / PlatformAdminPassword123\n');

  db.close();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Seeding failed:');
  console.error(error.message);
  console.error(error.stack);
  db.close();
  process.exit(1);
}
