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
        console.log('\n🧹 Dropping all tables from PostgreSQL...');

        // Drop all tables in reverse order (respecting foreign keys)
        const tablesResult = await pool.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename DESC
        `);

        for (const { tablename } of tablesResult.rows) {
          try {
            await pool.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
          } catch (err) {
            console.warn(`  ⚠️  Could not drop table ${tablename}: ${err.message}`);
          }
        }

        console.log('✓ All tables dropped from PostgreSQL');

        // Create schema_migrations table and run migrations
        console.log('\n📋 Running migrations to recreate schema...\n');

        // Create migrations tracking table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
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
            const executed = await pool.query(
              'SELECT name FROM schema_migrations WHERE name = $1',
              [file]
            );

            if (executed.rows.length > 0) {
              console.log(`⏭️  ${file} (already executed)`);
              continue;
            }

            // Split and execute statements properly (handle DO $$ blocks)
            const statements = [];
            let current = '';
            let inDoBlock = false;
            let i = 0;

            while (i < migrationSql.length) {
              const char = migrationSql[i];
              if (!inDoBlock && migrationSql.substring(i, i + 5).toUpperCase() === 'DO $$') {
                inDoBlock = true;
                current += migrationSql.substring(i, i + 5);
                i += 5;
              } else if (inDoBlock && migrationSql.substring(i, i + 4) === 'END $$') {
                current += migrationSql.substring(i, i + 6);
                i += 7;
                inDoBlock = false;
                statements.push(current.trim());
                current = '';
              } else if (!inDoBlock && char === ';') {
                if (current.trim()) {
                  statements.push(current.trim());
                }
                current = '';
                i++;
              } else {
                current += char;
                i++;
              }
            }
            if (current.trim()) {
              statements.push(current.trim());
            }

            // Execute each statement
            for (const stmt of statements) {
              const cleanedStmt = stmt
                .replace(/--.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .trim();

              if (cleanedStmt && !/^\s*PRAGMA\s/i.test(cleanedStmt)) {
                try {
                  await pool.query(cleanedStmt);
                } catch (err) {
                  if (err.message && err.message.includes('already exists')) {
                    // Idempotent migration - column/index might already exist
                    continue;
                  }
                  throw err;
                }
              }
            }

            await pool.query(
              'INSERT INTO schema_migrations (name) VALUES ($1)',
              [file]
            );

            console.log(`✓ ${file}`);
          } catch (err) {
            console.error(`\n❌ Error executing migration ${file}:`, err.message);
            throw err;
          }
        }

        console.log('\n✓ All migrations executed successfully\n');
      } finally {
        await pool.end();
      }
    } else {
      console.error('❌ DATABASE_URL not configured. PostgreSQL is required.');
      console.error('Set DATABASE_URL in backend/.env (e.g., postgresql://user:pass@localhost:5432/engageninja)');
      process.exit(1);
    }

    // Run seed script
    console.log('Seeding database with demo data...\n');
    await import('./db-seed.js');

  } catch (error) {
    console.error('\n❌ Reset failed:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
})();
