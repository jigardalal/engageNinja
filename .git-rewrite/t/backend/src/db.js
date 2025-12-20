/**
 * Database Connection
 * SQLite database using better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database configuration
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');

// Initialize database connection
const db = new Database(DATABASE_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;
