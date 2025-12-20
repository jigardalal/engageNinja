const Database = require('better-sqlite3');

const dbPath = '/Users/jigs/Code/EngageNinja-Coding-Agent-Harness/generations/engageNinja/backend/database.sqlite';
const db = new Database(dbPath);

// Check emails in database
const users = db.prepare('SELECT id, email FROM users').all();

console.log('Emails in database:');
users.forEach(u => {
  console.log(`  ${u.email}`);
  console.log(`    Lowercase: ${u.email.toLowerCase()}`);
  console.log(`    Match with admin@engageninja.local: ${u.email.toLowerCase() === 'admin@engageninja.local'}`);
});

db.close();
