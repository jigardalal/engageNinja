const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 5000
    });
  }
  return pool;
}

module.exports = {
  getPool
};
