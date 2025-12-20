const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

// Check the backend database that the running process uses
const dbPath = '/Users/jigs/Code/EngageNinja-Coding-Agent-Harness/generations/engageNinja/backend/database.sqlite';

console.log('Checking database:', dbPath);

const db = new Database(dbPath);

// Check if table exists
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
console.log(`Tables found: ${tables.length}`);
tables.forEach(t => console.log(`  - ${t.name}`));

// Check users table
const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get('admin@engageninja.local');

if (user) {
  console.log('\nUser found:', user.email);
  console.log('Testing password verification...');
  const isValid = bcrypt.compareSync('AdminPassword123', user.password_hash);
  console.log(`Password valid: ${isValid}`);
} else {
  console.log('\nUser NOT found!');
}

db.close();
