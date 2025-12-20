const Database = require('better-sqlite3');

const db = new Database('./database.sqlite');
db.pragma('foreign_keys = ON');

// Check users
const users = db.prepare('SELECT id, email FROM users').all();
console.log('Users in DB:', users);

// Check plans
const plans = db.prepare('SELECT id, name FROM plans').all();
console.log('Plans in DB:', plans);

// Check tenants
const tenants = db.prepare('SELECT id, name FROM tenants').all();
console.log('Tenants in DB:', tenants);

db.close();
