#!/usr/bin/env node

/**
 * Database Initialization Script
 * Creates database schema
 * Supports both SQLite and PostgreSQL
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use the same adaptive database layer as the main application
const db = require('../src/db');

console.log('🔧 EngageNinja Database Initialization');
console.log('=====================================\n');

try {
  // For SQLite only: handle file operations
  const USE_POSTGRES = !!process.env.DATABASE_URL;

  if (!USE_POSTGRES) {
    // SQLite setup
    const envDbPath = process.env.DATABASE_PATH;
    const DATABASE_PATH = envDbPath
      ? path.resolve(path.join(__dirname, '..', envDbPath))
      : path.join(__dirname, '../database.sqlite');

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

    console.log(`✓ Database prepared: ${dbPath}`);
  } else {
    console.log('✓ Using PostgreSQL RDS');
  }

  // Enable foreign keys (PostgreSQL ignores this, SQLite respects it)
  db.pragma?.('foreign_keys = ON');
  console.log('✓ Foreign keys enabled');

  // Create migrations tracking table (if not exists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id ${USE_POSTGRES ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
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
    let migrationSql = fs.readFileSync(migrationPath, 'utf8');

    try {
      // Check if already executed
      const executed = db.prepare(
        'SELECT name FROM schema_migrations WHERE name = ?'
      ).get(file);

      if (executed) {
        console.log(`⏭️  ${file} (already executed)`);
        continue;
      }

      // For PostgreSQL, we need to handle migrations differently
      // Split by semicolon and execute each statement
      if (USE_POSTGRES) {
        const statements = migrationSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          db.exec(statement);
        }
      } else {
        db.exec(migrationSql);
      }

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

  // Verify tables were created (check differently for PostgreSQL)
  let tables = [];
  if (USE_POSTGRES) {
    tables = db.prepare(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `).all();
  } else {
    tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all();
  }

  console.log(`✓ Database tables created: ${tables.length}`);
  tables.forEach(t => {
    const tableName = t.table_name || t.name;
    console.log(`  - ${tableName}`);
  });

  console.log('\n✅ Database initialization complete!');

  // Automatically seed after init so the DB is ready to use
  // NOTE: Do NOT close the connection here - db-seed.js will use it and close it
  console.log('\n🌱 Running seed script to populate demo data...\n');
  require('./db-seed.js');
} catch (error) {
  console.error('\n❌ Database initialization failed:');
  console.error(error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
}
