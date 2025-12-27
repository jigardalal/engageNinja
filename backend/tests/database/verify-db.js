#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../../src/db');

async function main() {
  try {
    console.log('📊 Data Verification:');
    console.log('====================');

    const tables = [
      { name: 'plans', query: 'SELECT COUNT(*) as count FROM plans' },
      { name: 'users', query: 'SELECT COUNT(*) as count FROM users' },
      { name: 'tenants', query: 'SELECT COUNT(*) as count FROM tenants' },
      { name: 'user_tenants', query: 'SELECT COUNT(*) as count FROM user_tenants' },
      { name: 'tags', query: 'SELECT COUNT(*) as count FROM tags' },
      { name: 'contacts', query: 'SELECT COUNT(*) as count FROM contacts' },
      { name: 'contact_tags', query: 'SELECT COUNT(*) as count FROM contact_tags' },
      { name: 'usage_counters', query: 'SELECT COUNT(*) as count FROM usage_counters' }
    ];

    for (const t of tables) {
      const result = await db.prepare(t.query).get();
      console.log(`  ${t.name}: ${result.count}`);
    }

    // Verify password hashing
    const adminUser = await db.prepare('SELECT email, password_hash FROM users WHERE email = ?').get('admin@engageninja.local');
    console.log('\n🔐 Admin Password Hash (first 20 chars): ' + adminUser.password_hash.substring(0, 20) + '...');

    // Sample contacts
    const sampleContacts = await db.prepare('SELECT name, phone, email FROM contacts LIMIT 3').all();
    console.log('\n📞 Sample Contacts:');
    sampleContacts.forEach(c => {
      console.log(`  - ${c.name} (${c.phone})`);
    });

    console.log('\n✅ Data verification complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
