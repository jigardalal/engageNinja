const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new Database(dbPath);

try {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const contacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
  const campaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
  const tenants = db.prepare('SELECT COUNT(*) as count FROM tenants').get();

  console.log('Database Verification:');
  console.log('===================');
  console.log('Users:', users.count);
  console.log('Contacts:', contacts.count);
  console.log('Campaigns:', campaigns.count);
  console.log('Tenants:', tenants.count);
} finally {
  db.close();
}
