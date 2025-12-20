const Database = require('better-sqlite3');
const db = new Database('./backend/database.sqlite');

console.log('=== EngageNinja Database Verification ===\n');

// Get table count
const tables = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
console.log('✓ Total tables:', tables.count);

// Count records in key tables
const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
const contacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
const campaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
const messages = db.prepare('SELECT COUNT(*) as count FROM messages').get();
const tags = db.prepare('SELECT COUNT(*) as count FROM tags').get();
const plans = db.prepare('SELECT COUNT(*) as count FROM plans').get();
const tenants = db.prepare('SELECT COUNT(*) as count FROM tenants').get();

console.log('\nData Summary:');
console.log('  Users:', users.count);
console.log('  Tenants:', tenants.count);
console.log('  Plans:', plans.count);
console.log('  Contacts:', contacts.count);
console.log('  Campaigns:', campaigns.count);
console.log('  Messages:', messages.count);
console.log('  Tags:', tags.count);

// Get user details
const userList = db.prepare('SELECT email, created_at FROM users LIMIT 5').all();
console.log('\nTest Users:');
userList.forEach(u => {
  console.log('  -', u.email);
});

// Get contact sample
const contactSample = db.prepare('SELECT name, phone, email FROM contacts LIMIT 3').all();
console.log('\nSample Contacts:');
contactSample.forEach(c => {
  console.log('  -', c.name, '(' + c.phone + ')');
});

// Get campaign sample
const campaignSample = db.prepare('SELECT name, channel, status FROM campaigns LIMIT 2').all();
console.log('\nSample Campaigns:');
campaignSample.forEach(c => {
  console.log('  -', c.name, '(' + c.channel + ',', c.status + ')');
});

console.log('\n✅ Database verification complete!');

db.close();
