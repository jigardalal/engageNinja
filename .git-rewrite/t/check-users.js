const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
console.log('Database path:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Check users table
const users = db.prepare('SELECT id, email, password_hash FROM users').all();
console.log('\n=== Users in database ===');
users.forEach(user => {
  console.log(`Email: ${user.email}`);
  console.log(`ID: ${user.id}`);
  console.log(`Password hash: ${user.password_hash?.substring(0, 30)}...`);
  console.log('---');
});

// Test password hashing
const bcrypt = require('bcrypt');
console.log('\n=== Testing password verification ===');
users.forEach(user => {
  const testPassword = user.email === 'admin@engageninja.local' ? 'AdminPassword123' : 'UserPassword123';
  const isValid = bcrypt.compareSync(testPassword, user.password_hash);
  console.log(`${user.email} with password "${testPassword}": ${isValid ? 'VALID' : 'INVALID'}`);
});

db.close();
