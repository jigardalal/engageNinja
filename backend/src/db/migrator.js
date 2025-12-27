/**
 * Database Migration Runner - Async/Await Version
 * Applies pending migrations to the database
 * Called on application startup
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');

/**
 * Initialize migrations tracking table
 */
async function initMigrationsTable() {
  try {
    // PostgreSQL only (no SQLite support)
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.exec(createTableSql);
  } catch (error) {
    console.error('Error creating schema_migrations table:', error);
    throw error;
  }
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations() {
  try {
    const result = await db.prepare(
      'SELECT name FROM schema_migrations ORDER BY executed_at'
    ).all();
    return result.map(r => r.name);
  } catch (error) {
    // Table might not exist yet, return empty array
    return [];
  }
}

/**
 * Get list of pending migration files (synchronous file operations)
 */
function getPendingMigrations(executed) {
  const migrationsDir = path.join(__dirname, '../../db/migrations');

  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.filter(f => !executed.includes(f));
}

/**
 * Execute a single migration file
 */
async function executeMigration(filename) {
  const migrationsDir = path.join(__dirname, '../../db/migrations');
  const filePath = path.join(migrationsDir, filename);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Execute migration; ignore benign duplicate column errors for idempotency
    const statements = sql.split(';').map(stmt => stmt.trim()).filter(Boolean);
    for (const statement of statements) {
      try {
        await db.exec(statement);
      } catch (error) {
        // Handle both SQLite ("duplicate column name") and PostgreSQL ("already exists") errors
        if (error.message && (error.message.includes('duplicate column name') || error.message.includes('already exists'))) {
          console.warn(`  ⚠️  Skipping duplicate/existing item in ${filename}: ${error.message}`);
          continue;
        }
        throw error;
      }
    }

    // Record migration
    await db.prepare(
      'INSERT INTO schema_migrations (name) VALUES (?)'
    ).run(filename);

    return { success: true, filename };
  } catch (error) {
    console.error(`Failed to execute migration ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Apply all pending migrations
 */
async function runMigrations() {
  console.log('\n🔄 Checking for pending database migrations...');

  try {
    // Initialize migrations table
    await initMigrationsTable();

    // Get already executed migrations
    const executed = await getExecutedMigrations();
    if (executed.length > 0) {
      console.log(`  Already executed: ${executed.join(', ')}`);
    }

    // Get pending migrations
    const pending = getPendingMigrations(executed);

    if (pending.length === 0) {
      console.log('✓ Database is up to date (no pending migrations)\n');
      return { success: true, applied: 0, pending: 0 };
    }

    console.log(`📋 Found ${pending.length} pending migration(s):\n`);

    const applied = [];
    for (const migrationFile of pending) {
      try {
        console.log(`  Running: ${migrationFile}...`);
        await executeMigration(migrationFile);
        applied.push(migrationFile);
        console.log(`  ✓ ${migrationFile} applied\n`);
      } catch (error) {
        console.error(`\n❌ Migration failed: ${migrationFile}`);
        console.error(`   Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log(`✅ Successfully applied ${applied.length} migration(s)\n`);
    return { success: true, applied: applied.length, pending: pending.length };
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    throw error;
  }
}

/**
 * Migrate existing template data to components_schema JSON
 */
async function migrateTemplateData() {
  try {
    console.log('🔄 Checking for template data migration...');

    // Try to query with components_schema - if it fails, column doesn't exist
    let hasComponentsSchema = true;
    try {
      await db.prepare(`SELECT COUNT(*) FROM whatsapp_templates WHERE components_schema IS NOT NULL`).all();
    } catch (e) {
      // Column doesn't exist
      hasComponentsSchema = false;
    }

    if (!hasComponentsSchema) {
      console.log('⚠️  components_schema column not found - skipping data migration');
      return;
    }

    // Get all templates that don't have components_schema yet
    const templates = await db.prepare(`
      SELECT id, body_template, header_type, header_text, footer_text,
             buttons_json, body_variables, header_variables
      FROM whatsapp_templates
      WHERE components_schema IS NULL
    `).all();

    if (templates.length === 0) {
      console.log('✓ No template data migration needed\n');
      return;
    }

    console.log(`📋 Migrating ${templates.length} template(s) to new schema...\n`);

    let migratedCount = 0;
    for (const template of templates) {
      try {
        const componentsSchema = buildComponentsSchema(template);
        await db.prepare(`
          UPDATE whatsapp_templates
          SET components_schema = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(componentsSchema), template.id);

        migratedCount++;
        console.log(`  ✓ Template ${template.id} migrated`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate template ${template.id}:`, error.message);
        throw error;
      }
    }

    console.log(`\n✅ Successfully migrated ${migratedCount} template(s)\n`);
  } catch (error) {
    console.error('❌ Template data migration failed:', error.message);
    throw error;
  }
}

/**
 * Build components schema from legacy columns
 */
function buildComponentsSchema(template) {
  const schema = {};

  // Header component
  if (template.header_type && template.header_text) {
    schema.HEADER = {
      type: template.header_type,
      format: template.header_type === 'TEXT' ? 'TEXT' : template.header_type,
      text: template.header_text,
      example: template.header_variables ? {
        header_text: JSON.parse(template.header_variables)
      } : { header_text: [] }
    };
  }

  // Body component (required)
  schema.BODY = {
    type: 'BODY',
    text: template.body_template || '',
    example: template.body_variables ? {
      body_text: [JSON.parse(template.body_variables)]
    } : { body_text: [[]] }
  };

  // Footer component
  if (template.footer_text) {
    schema.FOOTER = {
      type: 'FOOTER',
      text: template.footer_text
    };
  }

  // Buttons component
  if (template.buttons_json) {
    try {
      const buttons = JSON.parse(template.buttons_json);
      if (Array.isArray(buttons) && buttons.length > 0) {
        schema.BUTTONS = {
          type: 'BUTTONS',
          buttons: buttons.map(btn => ({
            type: btn.type || 'QUICK_REPLY',
            text: btn.text || '',
            url: btn.url || null,
            phone_number: btn.phone_number || null,
            example: btn.example || null
          }))
        };
      }
    } catch (error) {
      console.warn(`Failed to parse buttons_json for template: ${error.message}`);
    }
  }

  return schema;
}

/**
 * Run all migrations on startup
 */
async function initialize() {
  try {
    // Run schema migrations
    const migrationResult = await runMigrations();

    // Run data migrations if needed
    if (migrationResult.applied > 0) {
      await migrateTemplateData();
    }

    return { success: true, ...migrationResult };
  } catch (error) {
    console.error('\n❌ Database migration failed:');
    console.error(`   ${error.message}\n`);
    throw error;
  }
}

module.exports = {
  initialize,
  runMigrations,
  migrateTemplateData,
  getPendingMigrations,
  getExecutedMigrations
};
