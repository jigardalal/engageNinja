/**
 * Database Connection
 * SQLite database using better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database configuration (default to backend/database.sqlite)
// Resolve env path relative to backend directory to avoid cwd surprises
const envDbPath = process.env.DATABASE_PATH;
const DATABASE_PATH = envDbPath
  ? path.resolve(path.join(__dirname, '..'), envDbPath)
  : path.join(__dirname, '../database.sqlite');

// Initialize database connection
const db = new Database(DATABASE_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;
