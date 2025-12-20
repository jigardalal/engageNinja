#!/usr/bin/env node

/**
 * Database Initialization Script
 * Creates database schema
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Default DB inside backend dir so running from repo root doesn't create a root-level DB.
// Resolve env path relative to backend dir to avoid cwd surprises.
const envDbPath = process.env.DATABASE_PATH;
const DATABASE_PATH = envDbPath
  ? path.resolve(path.join(__dirname, '..', envDbPath))
  : path.join(__dirname, '../database.sqlite');

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

  // Create migrations tracking table (if not exists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ Migrations table ready');

  // Execute migrations in order
  const migrationsDir = path.join(__dirname, '../db/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n📋 Running ${migrationFiles.length} migration(s):\n`);

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    try {
      // Check if already executed
      const executed = db.prepare(
        'SELECT name FROM schema_migrations WHERE name = ?'
      ).get(file);

      if (executed) {
        console.log(`⏭️  ${file} (already executed)`);
        continue;
      }

      // Execute migration
      db.exec(migrationSql);
      db.prepare(
        'INSERT INTO schema_migrations (name) VALUES (?)'
      ).run(file);

      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`\n❌ Error executing migration ${file}:`, err.message);
      throw err;
    }
  }

  console.log('\n✓ All migrations executed successfully');

  // Verify tables were created
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
  `).all();

  console.log(`✓ Database tables created: ${tables.length}`);
  tables.forEach(t => console.log(`  - ${t.name}`));

  console.log('\n✅ Database initialization complete!');
  db.close();

  // Automatically seed after init so the DB is ready to use
  console.log('\n🌱 Running seed script to populate demo data...\n');
  require('./db-seed.js');
} catch (error) {
  console.error('\n❌ Database initialization failed:');
  console.error(error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
}
