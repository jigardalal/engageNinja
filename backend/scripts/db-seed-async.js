#!/usr/bin/env node

/**
 * Async Database Seeding Script
 * Works with both SQLite and PostgreSQL
 * Uses async/await instead of deasync
 *
 * Clears existing data before seeding to avoid duplicate key errors
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');
const USE_POSTGRES = !!process.env.DATABASE_URL;

async function seed() {
  let pool = null;
  let sqliteDb = null;

  try {
    console.log('🌱 EngageNinja Database Seeding');
    console.log('================================\n');

    let query;

    if (USE_POSTGRES) {
      // PostgreSQL connection
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      query = async (sql, params = []) => {
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
        'messages',
        'campaigns',
        'tags',
        'template_variables',
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
    } else {
      // SQLite connection
      const envDbPath = process.env.DATABASE_PATH;
      const DATABASE_PATH = envDbPath
        ? path.resolve(path.join(__dirname, '..', envDbPath))
        : path.join(__dirname, '../database.sqlite');

      sqliteDb = new Database(DATABASE_PATH);

      query = async (sql, params = []) => {
        // For SQLite, just wrap in async
        const stmt = sqliteDb.prepare(sql);
        if (params && params.length > 0) {
          return stmt.run(...params);
        }
        return stmt.all();
      };

      // Clear existing data in reverse dependency order for SQLite
      console.log('🧹 Clearing existing data...');
      const tablesToClear = [
        'contacts',
        'messages',
        'campaigns',
        'tags',
        'template_variables',
        'email_templates',
        'whatsapp_templates',
        'user_tenants',
        'tenants',
        'users',
        'plans'
      ];

      for (const table of tablesToClear) {
        try {
          sqliteDb.exec(`DELETE FROM ${table}`);
        } catch (err) {
          // Table might not exist yet, that's ok
        }
      }
      console.log('✓ Data cleared\n');
    }

    // 1. Seed Plans
    console.log('📋 Seeding plans...');
    const plans = [
      { id: 'free', name: 'Free Plan', whatsapp: 50, email: 500, users: 1, contacts: 50, sms: 25, api: 10000, ai: false, api_enabled: false },
      { id: 'starter', name: 'Starter Plan', whatsapp: 250, email: 10000, users: 3, contacts: 500, sms: 500, api: 100000, ai: false, api_enabled: false },
      { id: 'growth', name: 'Growth Plan', whatsapp: 1000, email: 50000, users: 10, contacts: 5000, sms: 2000, api: 500000, ai: true, api_enabled: true },
      { id: 'pro', name: 'Pro Plan', whatsapp: 5000, email: 200000, users: 25, contacts: 10000, sms: 10000, api: 1000000, ai: true, api_enabled: true },
      { id: 'enterprise', name: 'Enterprise Plan', whatsapp: 20000, email: 500000, users: 50, contacts: 25000, sms: 25000, api: 2000000, ai: true, api_enabled: true }
    ];

    for (const plan of plans) {
      await query(`
        INSERT INTO plans (id, name, whatsapp_messages_per_month, email_messages_per_month, max_users, contacts_limit, sms_messages_per_month, api_tokens_per_month, ai_features_enabled, api_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [plan.id, plan.name, plan.whatsapp, plan.email, plan.users, plan.contacts, plan.sms, plan.api, plan.ai, plan.api_enabled]);
    }
    console.log(`  ✓ ${plans.length} plans seeded\n`);

    // 2. Seed Users
    console.log('👥 Seeding users...');
    const users = [
      { id: '11111111-1111-1111-1111-111111111111', email: 'admin@engageninja.local', password: 'AdminPassword123', name: 'Admin User', role: 'none' },
      { id: '22222222-2222-2222-2222-222222222222', email: 'user@engageninja.local', password: 'UserPassword123', name: 'Regular User', role: 'none' },
      { id: '33333333-3333-3333-3333-333333333333', email: 'switcher@engageninja.local', password: 'SwitcherPassword123', name: 'Switcher User', role: 'none' },
      { id: '44444444-4444-4444-4444-444444444444', email: 'platform.admin@engageninja.local', password: 'PlatformAdminPassword123', name: 'Platform Admin', role: 'platform_admin' },
      { id: '55555555-5555-5555-5555-555555555555', email: 'member@engageninja.local', password: 'MemberPassword123', name: 'Member User', role: 'none' },
      { id: '66666666-6666-6666-6666-666666666666', email: 'viewer@engageninja.local', password: 'ViewerPassword123', name: 'Viewer User', role: 'none' }
    ];

    for (const user of users) {
      const hash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
      await query(`
        INSERT INTO users (id, email, name, password_hash, role_global)
        VALUES (?, ?, ?, ?, ?)

      `, [user.id, user.email, user.name, hash, user.role]);
    }
    console.log(`  ✓ ${users.length} users seeded\n`);

    // 3. Seed Tenants
    console.log('🏢 Seeding tenants...');
    const tenantDemo = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const tenantBeta = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await query(`INSERT INTO tenants (id, name, plan_id) VALUES (?, ?, ?) `, [tenantDemo, 'Demo Tenant', 'growth']);
    await query(`INSERT INTO tenants (id, name, plan_id) VALUES (?, ?, ?) `, [tenantBeta, 'Beta Tenant', 'starter']);
    console.log('  ✓ Tenants seeded\n');

    // 4. Seed User-Tenant Associations
    console.log('🔗 Seeding user-tenant associations...');
    const associations = [
      ['11111111-1111-1111-1111-111111111111', tenantDemo, 'owner'],
      ['22222222-2222-2222-2222-222222222222', tenantDemo, 'admin'],
      ['55555555-5555-5555-5555-555555555555', tenantDemo, 'member'],
      ['66666666-6666-6666-6666-666666666666', tenantDemo, 'viewer'],
      ['22222222-2222-2222-2222-222222222222', tenantBeta, 'owner'],
      ['33333333-3333-3333-3333-333333333333', tenantDemo, 'member'],
      ['33333333-3333-3333-3333-333333333333', tenantBeta, 'member'],
      ['44444444-4444-4444-4444-444444444444', tenantDemo, 'admin']
    ];

    for (const [userId, tenantId, role] of associations) {
      await query(`
        INSERT INTO user_tenants (user_id, tenant_id, role)
        VALUES (?, ?, ?)
        
      `, [userId, tenantId, role]);
    }
    console.log(`  ✓ ${associations.length} associations seeded\n`);

    // 5. Seed Tags
    console.log('🏷️  Seeding tags...');
    const tags = [
      { id: 'dd111111-dddd-dddd-dddd-dddddddddddd', tenant: tenantDemo, name: 'vip' },
      { id: 'dd333333-dddd-dddd-dddd-dddddddddddd', tenant: tenantDemo, name: 'active' },
      { id: 'ee111111-eeee-eeee-eeee-eeeeeeeeeeee', tenant: tenantBeta, name: 'vip' },
      { id: 'ee333333-eeee-eeee-eeee-eeeeeeeeeeee', tenant: tenantBeta, name: 'active' }
    ];

    for (const tag of tags) {
      await query(`
        INSERT INTO tags (id, tenant_id, name)
        VALUES (?, ?, ?)

      `, [tag.id, tag.tenant, tag.name]);
    }
    console.log(`  ✓ ${tags.length} tags seeded\n`);

    // 6. Seed Contacts
    console.log('📞 Seeding contacts...');
    const contacts = [
      { name: 'Jigs D', phone: '+16306700007', email: 'Jigsd0007@gmail.com', wa: true, em: true },
      { name: 'Jigar D', phone: '+919076002007', email: 'jigar_dalal@xlnctechnologies.us', wa: true, em: true },
      { name: 'Jigar D', phone: '+12242088470', email: 'djigs0007@gmail.com', wa: false, em: true }
    ];

    for (const tenant of [tenantDemo, tenantBeta]) {
      for (const contact of contacts) {
        const contactId = uuidv4();
        await query(`
          INSERT INTO contacts (id, tenant_id, phone, email, name, consent_whatsapp, consent_email, consent_source, consent_updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP)
          
        `, [contactId, tenant, contact.phone, contact.email, contact.name, contact.wa, contact.em]);
      }
    }
    console.log(`  ✓ ${contacts.length * 2} contacts seeded\n`);

    console.log('✅ Seeding complete!');
    console.log('\n🔐 Test Credentials:');
    console.log('  admin@engageninja.local / AdminPassword123');
    console.log('  user@engageninja.local / UserPassword123\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    // Clean up database connections
    if (pool) {
      await pool.end();
    }
    if (sqliteDb) {
      sqliteDb.close();
    }
  }
}

seed();
