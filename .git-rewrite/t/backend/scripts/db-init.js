#!/usr/bin/env node

/**
 * Database Initialization Script
 * Creates database schema
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';

console.log('🔧 EngageNinja Database Initialization');
console.log('=====================================\n');

try {
  // Create database
  const dbPath = path.resolve(DATABASE_PATH);
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✓ Created database directory: ${dbDir}`);
  }

  // Check if database exists and delete if it does
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`✓ Removed existing database file`);
  }

  const db = new Database(dbPath);
  console.log(`✓ Database created: ${dbPath}`);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  console.log('✓ Foreign keys enabled');

  // Read schema file
  const schemaPath = path.join(__dirname, '../db/migrations/001_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute entire schema
  try {
    db.exec(schemaSql);
    console.log('✓ Schema executed successfully');
  } catch (err) {
    console.error('Error executing schema:', err.message);
    throw err;
  }

  // Verify tables were created
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
  `).all();

  console.log(`✓ Database tables created: ${tables.length}`);
  tables.forEach(t => console.log(`  - ${t.name}`));

  console.log('\n✅ Database initialization complete!');
  console.log('💡 Run "npm run db:seed" to populate seed data\n');

  db.close();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Database initialization failed:');
  console.error(error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
}
