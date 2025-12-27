const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * Copy active global tags into the given tenant as default tags.
 * PostgreSQL with async/await
 * @param {string} tenantId
 */
async function copyActiveGlobalTagsToTenant(tenantId) {
  const globalTags = await db.prepare(`SELECT name FROM global_tags WHERE status = 'active'`).all();

  for (const tag of globalTags) {
    await db.prepare(`
      INSERT INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 'tenant', true)
      ON CONFLICT (tenant_id, name) DO NOTHING
    `).run(uuidv4(), tenantId, tag.name);
  }
}

module.exports = {
  copyActiveGlobalTagsToTenant
};
