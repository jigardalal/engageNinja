#!/usr/bin/env node

/**
 * Database Reset Script
 * Clears database and recreates from scratch
 * Supports both SQLite and PostgreSQL
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
    if (USE_POSTGRES) {
      // PostgreSQL: Drop all data
      console.log('✓ Using PostgreSQL RDS');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      try {
        // Get all tables and drop them in reverse order (respecting foreign keys)
        const tablesResult = await pool.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename DESC
        `);

        for (const { tablename } of tablesResult.rows) {
          console.log(`  Dropping table: ${tablename}`);
          await pool.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
        }

        // Drop schema_migrations tracking
        await pool.query(`DROP TABLE IF EXISTS schema_migrations CASCADE`);

        console.log('✓ All data cleared from PostgreSQL\n');
      } finally {
        await pool.end();
      }
    } else {
      // SQLite: Delete database file
      const envDbPath = process.env.DATABASE_PATH;
      const DATABASE_PATH = envDbPath
        ? path.resolve(path.join(__dirname, '..', envDbPath))
        : path.join(__dirname, '../database.sqlite');

      const dbPath = path.resolve(DATABASE_PATH);
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log(`✓ Deleted existing database: ${dbPath}\n`);
      }
    }

    // Run init and seed
    console.log('Initializing fresh database...\n');
    require('./db-init.js');

  } catch (error) {
    console.error('\n❌ Reset failed:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
})();
