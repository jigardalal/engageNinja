const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

// Check which database the backend would use
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');
console.log('Using database:', DATABASE_PATH);

const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');

const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get('admin@engageninja.local');

if (!user) {
  console.log('ERROR: User not found!');
  process.exit(1);
}

console.log('User found:', user.email);
console.log('Password hash:', user.password_hash.substring(0, 30) + '...');

const testPassword = 'AdminPassword123';
const isValid = bcrypt.compareSync(testPassword, user.password_hash);

console.log(`Testing password "${testPassword}": ${isValid ? 'VALID ✓' : 'INVALID ✗'}`);

// Now test the actual HTTP request like the frontend would
console.log('\n--- Now testing via HTTP like frontend does ---');

const http = require('http');

const data = JSON.stringify({
  email: 'admin@engageninja.local',
  password: 'AdminPassword123'
});

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('Response:', json);
    } catch (e) {
      console.log('Body:', body);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

req.write(data);
req.end();

db.close();
