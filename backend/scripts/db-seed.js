#!/usr/bin/env node

/**
 * Database Seeding Script
 * Populates database with test data
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Default DB inside backend dir so running from repo root doesn't create a root-level DB.
// Resolve env path relative to backend dir to avoid cwd surprises.
const envDbPath = process.env.DATABASE_PATH;
const DATABASE_PATH = envDbPath
  ? path.resolve(path.join(__dirname, '..', envDbPath))
  : path.join(__dirname, '../database.sqlite');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

const db = new Database(path.resolve(DATABASE_PATH));
db.pragma('foreign_keys = ON');

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
    INSERT OR IGNORE INTO plans
    (id, name, whatsapp_messages_per_month, email_messages_per_month, max_users, contacts_limit,
      sms_messages_per_month, api_tokens_per_month, ai_features_enabled, api_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    INSERT OR IGNORE INTO users (id, email, name, password_hash, role_global, active, first_name, last_name, phone, timezone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    INSERT OR IGNORE INTO tenants (id, name, plan_id)
    VALUES (?, ?, ?)
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
    INSERT OR IGNORE INTO user_tenants (user_id, tenant_id, role, active)
    VALUES (?, ?, ?, ?)
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
  INSERT OR IGNORE INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 'tenant', 0)
`);

function seedGlobalTags() {
  const globalTags = [
    { id: uuidv4(), name: 'vip' },
    { id: uuidv4(), name: 'newsletter' },
    { id: uuidv4(), name: 'churn_risk' }
  ];

  for (const tag of globalTags) {
    db.prepare(`
      INSERT OR IGNORE INTO global_tags (id, name, status, created_at, updated_at)
      VALUES (?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(tag.id, tag.name);
  }
}

function copyGlobalTagsToTenant(tenantUuid) {
  const activeGlobal = db.prepare(`
    SELECT name FROM global_tags WHERE status = 'active'
  `).all();

  const insertTenantTag = db.prepare(`
    INSERT OR IGNORE INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 'tenant', 1)
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
    INSERT OR IGNORE INTO contacts
    (id, tenant_id, phone, email, name, consent_whatsapp, consent_email, consent_source, consent_updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP)
  `);

  const insertContactTag = db.prepare(`
    INSERT OR IGNORE INTO contact_tags (contact_id, tag_id)
    VALUES (?, ?)
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
    INSERT OR IGNORE INTO usage_counters
    (id, tenant_id, year_month, whatsapp_messages_sent, email_messages_sent)
    VALUES (?, ?, ?, 0, 0)
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
      VALUES (?, ?, 'whatsapp', 'whatsapp_cloud', ?, NULL, 0, NULL, ?, ?, ?, ?)
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
      VALUES (?, ?, 'email', 'ses', ?, 'jigsd0007@gmail.com', 0, NULL, ?, ?)
    `).run(uuidv4(), tenantId.demo, emailCreds, now, now);
    console.log('  ✓ Inserted Email channel for demo tenant');
  }

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
