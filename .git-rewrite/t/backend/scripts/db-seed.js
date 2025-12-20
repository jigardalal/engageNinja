#!/usr/bin/env node

/**
 * Database Seeding Script
 * Populates database with test data
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

const db = new Database(path.resolve(DATABASE_PATH));
db.pragma('foreign_keys = ON');

console.log('🌱 EngageNinja Database Seeding');
console.log('================================\n');

const planIds = {
  free: 'free',
  starter: 'starter',
  growth: 'growth',
  pro: 'pro'
};

const userId = {
  admin: uuidv4(),
  user: uuidv4()
};

const tenantId = {
  demo: uuidv4()
};

try {
  // 1. Seed Plans
  console.log('📋 Seeding plans...');
  const plans = [
    {
      id: planIds.free,
      name: 'Free Plan',
      whatsapp_messages_per_month: 1000,
      email_messages_per_month: 0,
      max_users: 1,
      ai_features_enabled: 0,
      api_enabled: 0
    },
    {
      id: planIds.starter,
      name: 'Starter Plan',
      whatsapp_messages_per_month: 10000,
      email_messages_per_month: 0,
      max_users: 3,
      ai_features_enabled: 0,
      api_enabled: 0
    },
    {
      id: planIds.growth,
      name: 'Growth Plan',
      whatsapp_messages_per_month: 100000,
      email_messages_per_month: 100000,
      max_users: 10,
      ai_features_enabled: 1,
      api_enabled: 1
    },
    {
      id: planIds.pro,
      name: 'Pro Plan',
      whatsapp_messages_per_month: 500000,
      email_messages_per_month: 500000,
      max_users: 50,
      ai_features_enabled: 1,
      api_enabled: 1
    }
  ];

  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO plans
    (id, name, whatsapp_messages_per_month, email_messages_per_month, max_users, ai_features_enabled, api_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const plan of plans) {
    insertPlan.run(
      plan.id,
      plan.name,
      plan.whatsapp_messages_per_month,
      plan.email_messages_per_month,
      plan.max_users,
      plan.ai_features_enabled,
      plan.api_enabled
    );
  }
  console.log(`  ✓ ${plans.length} plans seeded`);

  // 2. Seed Users
  console.log('👥 Seeding users...');
  const adminHash = bcrypt.hashSync('AdminPassword123', BCRYPT_ROUNDS);
  const userHash = bcrypt.hashSync('UserPassword123', BCRYPT_ROUNDS);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash)
    VALUES (?, ?, ?)
  `);

  insertUser.run(userId.admin, 'admin@engageninja.local', adminHash);
  insertUser.run(userId.user, 'user@engageninja.local', userHash);
  console.log('  ✓ 2 users seeded (admin + regular user)');

  // 3. Seed Tenants
  console.log('🏢 Seeding tenants...');
  const insertTenant = db.prepare(`
    INSERT OR IGNORE INTO tenants (id, name, plan_id)
    VALUES (?, ?, ?)
  `);

  insertTenant.run(tenantId.demo, 'Demo Tenant', planIds.free);
  console.log('  ✓ 1 tenant seeded (Demo Tenant)');

  // 4. Seed User-Tenant Associations
  console.log('🔗 Seeding user-tenant associations...');
  const insertUserTenant = db.prepare(`
    INSERT OR IGNORE INTO user_tenants (user_id, tenant_id, role)
    VALUES (?, ?, ?)
  `);

  insertUserTenant.run(userId.admin, tenantId.demo, 'admin');
  insertUserTenant.run(userId.user, tenantId.demo, 'admin');
  console.log('  ✓ 2 user-tenant associations seeded');

  // 5. Seed Tags
  console.log('🏷️  Seeding tags...');
  const tagNames = ['vip', 'newsletter', 'active', 'new', 'beta_tester'];
  const tagIds = {};

  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (id, tenant_id, name)
    VALUES (?, ?, ?)
  `);

  for (const tagName of tagNames) {
    const tagId = uuidv4();
    tagIds[tagName] = tagId;
    insertTag.run(tagId, tenantId.demo, tagName);
  }
  console.log(`  ✓ ${tagNames.length} tags seeded`);

  // 6. Seed Contacts (20 realistic contacts)
  console.log('📞 Seeding contacts...');
  const contacts = [
    { name: 'John Doe', phone: '+12155552671', email: 'john.doe@example.com', whatsapp: 1, email_consent: 1, tags: ['vip', 'active'] },
    { name: 'Jane Smith', phone: '+12155552672', email: 'jane.smith@example.com', whatsapp: 1, email_consent: 0, tags: ['newsletter'] },
    { name: 'Michael Johnson', phone: '+12155552673', email: 'michael.johnson@example.com', whatsapp: 0, email_consent: 1, tags: [] },
    { name: 'Sarah Williams', phone: '+12155552674', email: 'sarah.williams@example.com', whatsapp: 1, email_consent: 1, tags: ['vip', 'newsletter'] },
    { name: 'Robert Brown', phone: '+12155552675', email: 'robert.brown@example.com', whatsapp: 1, email_consent: 0, tags: ['active'] },
    { name: 'Emily Davis', phone: '+12155552676', email: 'emily.davis@example.com', whatsapp: 0, email_consent: 1, tags: ['newsletter', 'new'] },
    { name: 'David Miller', phone: '+12155552677', email: 'david.miller@example.com', whatsapp: 1, email_consent: 1, tags: ['vip'] },
    { name: 'Jessica Wilson', phone: '+12155552678', email: 'jessica.wilson@example.com', whatsapp: 1, email_consent: 0, tags: ['active', 'new'] },
    { name: 'James Moore', phone: '+12155552679', email: 'james.moore@example.com', whatsapp: 0, email_consent: 1, tags: ['beta_tester'] },
    { name: 'Jennifer Taylor', phone: '+12155552680', email: 'jennifer.taylor@example.com', whatsapp: 1, email_consent: 1, tags: ['vip', 'newsletter', 'active'] },
    { name: 'William Anderson', phone: '+12155552681', email: 'william.anderson@example.com', whatsapp: 1, email_consent: 0, tags: ['new'] },
    { name: 'Linda Thomas', phone: '+12155552682', email: 'linda.thomas@example.com', whatsapp: 0, email_consent: 1, tags: ['newsletter'] },
    { name: 'Charles Jackson', phone: '+12155552683', email: 'charles.jackson@example.com', whatsapp: 1, email_consent: 1, tags: ['active', 'beta_tester'] },
    { name: 'Barbara White', phone: '+12155552684', email: 'barbara.white@example.com', whatsapp: 1, email_consent: 0, tags: ['vip'] },
    { name: 'Mark Harris', phone: '+12155552685', email: 'mark.harris@example.com', whatsapp: 0, email_consent: 1, tags: ['newsletter', 'active'] },
    { name: 'Susan Martin', phone: '+12155552686', email: 'susan.martin@example.com', whatsapp: 1, email_consent: 1, tags: ['new', 'newsletter'] },
    { name: 'Steven Thompson', phone: '+12155552687', email: 'steven.thompson@example.com', whatsapp: 1, email_consent: 1, tags: ['vip', 'active'] },
    { name: 'Karen Garcia', phone: '+12155552688', email: 'karen.garcia@example.com', whatsapp: 0, email_consent: 1, tags: ['beta_tester', 'newsletter'] },
    { name: 'Paul Martinez', phone: '+12155552689', email: 'paul.martinez@example.com', whatsapp: 1, email_consent: 0, tags: ['active'] },
    { name: 'Nancy Robinson', phone: '+12155552690', email: 'nancy.robinson@example.com', whatsapp: 1, email_consent: 1, tags: ['vip', 'new', 'active'] }
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

  for (const contact of contacts) {
    const contactId = uuidv4();
    insertContact.run(
      contactId,
      tenantId.demo,
      contact.phone,
      contact.email,
      contact.name,
      contact.whatsapp,
      contact.email_consent
    );

    // Add tags to contact
    for (const tagName of contact.tags) {
      if (tagIds[tagName]) {
        insertContactTag.run(contactId, tagIds[tagName]);
      }
    }
  }
  console.log(`  ✓ ${contacts.length} contacts seeded with tags`);

  // 7. Seed Usage Counter
  console.log('📊 Seeding usage counters...');
  const currentDate = new Date();
  const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const insertUsageCounter = db.prepare(`
    INSERT OR IGNORE INTO usage_counters
    (id, tenant_id, year_month, whatsapp_messages_sent, email_messages_sent)
    VALUES (?, ?, ?, 0, 0)
  `);

  insertUsageCounter.run(uuidv4(), tenantId.demo, yearMonth);
  console.log(`  ✓ Usage counter seeded for month: ${yearMonth}`);

  // Summary
  console.log('\n📊 Seed Data Summary:');
  console.log(`  Plans: ${plans.length}`);
  console.log(`  Users: 2 (admin + regular)`);
  console.log(`  Tenants: 1 (Demo Tenant)`);
  console.log(`  User-Tenant Associations: 2`);
  console.log(`  Tags: ${tagNames.length}`);
  console.log(`  Contacts: ${contacts.length}`);
  console.log(`  Usage Counters: 1`);
  console.log(`  Contact-Tag Associations: ${contacts.reduce((sum, c) => sum + c.tags.length, 0)}`);

  console.log('\n✅ Seeding complete!');
  console.log('\n🔐 Test Credentials:');
  console.log('  Admin: admin@engageninja.local / AdminPassword123');
  console.log('  User:  user@engageninja.local / UserPassword123\n');

  db.close();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Seeding failed:');
  console.error(error.message);
  console.error(error.stack);
  db.close();
  process.exit(1);
}
