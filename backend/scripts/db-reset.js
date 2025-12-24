#!/usr/bin/env node

/**
 * Database Reset Script
 * Clears database and populates with demo data
 * For PostgreSQL: assumes schema already exists (created by db-init on server startup)
 * For SQLite: recreates schema from migrations
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const USE_POSTGRES = !!process.env.DATABASE_URL;

console.log('🔄 EngageNinja Database Reset');
console.log('=============================\n');

(async () => {
  try {
    console.log('✓ Using ' + (USE_POSTGRES ? 'PostgreSQL RDS' : 'SQLite'));

    if (USE_POSTGRES) {
      // PostgreSQL: Just clear all data (schema must already exist)
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      try {
        console.log('\n🧹 Clearing all data from PostgreSQL...');

        // Get all tables and clear them in reverse order (respecting foreign keys)
        const tablesResult = await pool.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public' AND tablename != 'schema_migrations'
          ORDER BY tablename DESC
        `);

        for (const { tablename } of tablesResult.rows) {
          try {
            await pool.query(`DELETE FROM "${tablename}"`);
          } catch (err) {
            // Table might have FK constraints, that's ok
          }
        }

        console.log('✓ All data cleared from PostgreSQL\n');
      } finally {
        await pool.end();
      }
    } else {
      // SQLite: Delete and recreate database
      const envDbPath = process.env.DATABASE_PATH;
      const DATABASE_PATH = envDbPath
        ? path.resolve(path.join(__dirname, '..', envDbPath))
        : path.join(__dirname, '../database.sqlite');

      const dbPath = path.resolve(DATABASE_PATH);
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log(`\n✓ Deleted existing database: ${dbPath}\n`);
      }

      // For SQLite, need to reinitialize with migrations
      console.log('Running migrations to recreate schema...\n');

      const db = new Database(DATABASE_PATH);
      db.pragma('foreign_keys = ON');

      // Create migrations tracking table
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Run migrations
      const migrationsDir = path.join(__dirname, '../db/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      console.log(`📋 Running ${migrationFiles.length} migration(s):\n`);

      for (const file of migrationFiles) {
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        try {
          const executed = db.prepare(
            'SELECT name FROM schema_migrations WHERE name = ?'
          ).get(file);

          if (executed) {
            console.log(`⏭️  ${file} (already executed)`);
            continue;
          }

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

      console.log('\n✓ All migrations executed successfully\n');
      db.close();
    }

    // Run seed script
    console.log('Seeding database with demo data...\n');
    require('./db-seed-async.js');

  } catch (error) {
    console.error('\n❌ Reset failed:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
})();
