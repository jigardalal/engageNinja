#!/usr/bin/env node

/**
 * Database Reset Script
 * Clears database and recreates from scratch
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Keep behavior consistent with db-init/db-seed (resolve env path relative to backend dir).
const envDbPath = process.env.DATABASE_PATH;
const DATABASE_PATH = envDbPath
  ? path.resolve(path.join(__dirname, '..', envDbPath))
  : path.join(__dirname, '../database.sqlite');

console.log('🔄 EngageNinja Database Reset');
console.log('=============================\n');

try {
  const dbPath = path.resolve(DATABASE_PATH);

  // Delete existing database
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`✓ Deleted existing database: ${dbPath}`);
  }

  // Run init and seed
  console.log('\nInitializing fresh database...\n');
  const initScript = require('./db-init.js');

} catch (error) {
  console.error('\n❌ Reset failed:');
  console.error(error.message);
  process.exit(1);
}
