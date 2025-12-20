const Database = require('./backend/node_modules/better-sqlite3');
const bcrypt = require('./backend/node_modules/bcrypt');

const db = new Database('./database.sqlite');
db.pragma('foreign_keys = ON');

const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get('admin@engageninja.local');

if (user) {
  console.log('✓ User found:', user.email);
  const isValid = bcrypt.compareSync('AdminPassword123', user.password_hash);
  console.log('✓ Password valid:', isValid);
  console.log('✓ Hash prefix:', user.password_hash.substring(0, 20) + '...');
} else {
  console.log('✗ User not found');
  const allUsers = db.prepare('SELECT email FROM users').all();
  console.log('All users:', allUsers);
}

db.close();
