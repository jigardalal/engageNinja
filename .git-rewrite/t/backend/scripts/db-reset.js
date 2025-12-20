#!/usr/bin/env node

/**
 * Database Reset Script
 * Clears database and recreates from scratch
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';

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
