#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';
const db = new Database(path.resolve(DATABASE_PATH));

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
  const result = db.prepare(t.query).get();
  console.log(`  ${t.name}: ${result.count}`);
}

// Verify password hashing
const adminUser = db.prepare('SELECT email, password_hash FROM users WHERE email = ?').get('admin@engageninja.local');
console.log('\n🔐 Admin Password Hash (first 20 chars): ' + adminUser.password_hash.substring(0, 20) + '...');

// Sample contacts
const sampleContacts = db.prepare('SELECT name, phone, email FROM contacts LIMIT 3').all();
console.log('\n📞 Sample Contacts:');
sampleContacts.forEach(c => {
  console.log(`  - ${c.name} (${c.phone})`);
});

console.log('\n✅ Data verification complete!');
db.close();
