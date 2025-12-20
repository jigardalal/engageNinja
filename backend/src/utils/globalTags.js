const { v4: uuidv4 } = require('uuid');

/**
 * Copy active global tags into the given tenant as default tags.
 * @param {import('better-sqlite3').Database} db
 * @param {string} tenantId
 */
function copyActiveGlobalTagsToTenant(db, tenantId) {
  const globalTags = db.prepare(`SELECT name FROM global_tags WHERE status = 'active'`).all();
  const insertTenantTag = db.prepare(`
    INSERT OR IGNORE INTO tags (id, tenant_id, name, created_at, updated_at, status, scope, is_default)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 'tenant', 1)
  `);
  for (const tag of globalTags) {
    insertTenantTag.run(uuidv4(), tenantId, tag.name);
  }
}

module.exports = {
  copyActiveGlobalTagsToTenant
};
