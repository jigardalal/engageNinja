#!/usr/bin/env node

/**
 * Phase 2 RBAC Verification Script
 * Validates that all RBAC components are properly set up
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const checks = [];
let db;

function check(name, condition, details = '') {
  const passed = condition === true;
  checks.push({ name, passed, details });
  console.log(`${passed ? '✓' : '✗'} ${name}${details ? ` - ${details}` : ''}`);
}

function info(msg) {
  console.log(`ℹ ${msg}`);
}

function error(msg) {
  console.error(`✗ ERROR: ${msg}`);
}

console.log('\n=== Phase 2 RBAC Verification ===\n');

try {
  // Connect to database
  const dbPath = path.join(__dirname, '../database.sqlite');
  if (!fs.existsSync(dbPath)) {
    error(`Database not found at ${dbPath}`);
    process.exit(1);
  }

  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  console.log('1. Database Schema Validation\n');

  // Check users table modifications
  const userCols = db.prepare(`PRAGMA table_info(users)`).all();
  const userColNames = userCols.map(c => c.name);

  check('Users table has role_global column', userColNames.includes('role_global'));
  check('Users table has active column', userColNames.includes('active'));

  // Check user_tenants table migration
  const utCols = db.prepare(`PRAGMA table_info(user_tenants)`).all();
  const utColNames = utCols.map(c => c.name);

  check('user_tenants table has active column', utColNames.includes('active'));

  // Verify role enum values
  const roles = db.prepare(`SELECT DISTINCT role FROM user_tenants`).all();
  const roleValues = roles.map(r => r.role);
  check('user_tenants has owner role', roleValues.includes('owner'));
  check('user_tenants has admin role', roleValues.includes('admin'));
  check('user_tenants has member role', roleValues.includes('member'));
  check('user_tenants has viewer role', roleValues.includes('viewer'));

  // Check audit_logs table
  check('audit_logs table exists',
    db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'`).get() !== undefined
  );

  if (db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'`).get()) {
    const auditCols = db.prepare(`PRAGMA table_info(audit_logs)`).all();
    const auditColNames = auditCols.map(c => c.name);

    check('audit_logs has actor_user_id', auditColNames.includes('actor_user_id'));
    check('audit_logs has actor_type', auditColNames.includes('actor_type'));
    check('audit_logs has tenant_id', auditColNames.includes('tenant_id'));
    check('audit_logs has action', auditColNames.includes('action'));
    check('audit_logs has target_type', auditColNames.includes('target_type'));
    check('audit_logs has target_id', auditColNames.includes('target_id'));
    check('audit_logs has metadata', auditColNames.includes('metadata'));
    check('audit_logs has ip_address', auditColNames.includes('ip_address'));
    check('audit_logs has created_at', auditColNames.includes('created_at'));
  }

  // Check user_invitations table
  check('user_invitations table exists',
    db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='user_invitations'`).get() !== undefined
  );

  // Check platform_config table
  check('platform_config table exists',
    db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='platform_config'`).get() !== undefined
  );

  console.log('\n2. Indexes Verification\n');

  const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('audit_logs', 'user_invitations')`).all();
  const indexNames = indexes.map(i => i.name);

  check('audit_logs has tenant index', indexNames.some(i => i.includes('audit') && i.includes('tenant')));
  check('audit_logs has actor index', indexNames.some(i => i.includes('audit') && i.includes('actor')));
  check('audit_logs has action index', indexNames.some(i => i.includes('audit') && i.includes('action')));
  check('user_invitations has email index', indexNames.some(i => i.includes('invitations') && i.includes('email')));
  check('user_invitations has token index', indexNames.some(i => i.includes('invitations') && i.includes('token')));

  console.log('\n3. Test Data Validation\n');

  // Check test users exist with different roles
  const users = db.prepare(`SELECT u.email, ut.role FROM users u JOIN user_tenants ut ON u.id = ut.user_id`).all();
  const userRoles = users.map(u => ({ email: u.email, role: u.role }));

  info(`Found ${users.length} users in tenant relationships`);

  const hasViewer = userRoles.some(u => u.role === 'viewer');
  const hasMember = userRoles.some(u => u.role === 'member');
  const hasAdmin = userRoles.some(u => u.role === 'admin');
  const hasOwner = userRoles.some(u => u.role === 'owner');

  check('Has test viewer user', hasViewer);
  check('Has test member user', hasMember);
  check('Has test admin user', hasAdmin);
  check('Has test owner user', hasOwner);

  // Check platform admin user
  const platformAdmins = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role_global = 'platform_admin'`).get();
  check('Platform admin user exists', platformAdmins.count > 0, `${platformAdmins.count} found`);

  console.log('\n4. Middleware Verification\n');

  // Check that middleware files exist
  const rbacPath = path.join(__dirname, '../src/middleware/rbac.js');
  check('RBAC middleware file exists', fs.existsSync(rbacPath));

  if (fs.existsSync(rbacPath)) {
    const rbacCode = fs.readFileSync(rbacPath, 'utf8');
    check('RBAC has requireTenantRole function', rbacCode.includes('requireTenantRole'));
    check('RBAC has requirePlatformRole function', rbacCode.includes('requirePlatformRole'));
    check('RBAC has role hierarchy', rbacCode.includes('roleHierarchy'));
    check('RBAC has requireViewer export', rbacCode.includes('requireViewer'));
    check('RBAC has requireMember export', rbacCode.includes('requireMember'));
    check('RBAC has requireAdmin export', rbacCode.includes('requireAdmin'));
    check('RBAC has requireOwner export', rbacCode.includes('requireOwner'));
  }

  console.log('\n5. Audit Logging Verification\n');

  const auditPath = path.join(__dirname, '../src/utils/audit.js');
  check('Audit utility file exists', fs.existsSync(auditPath));

  if (fs.existsSync(auditPath)) {
    const auditCode = fs.readFileSync(auditPath, 'utf8');
    check('Audit has logAudit function', auditCode.includes('logAudit'));
    check('Audit has AUDIT_ACTIONS constants', auditCode.includes('AUDIT_ACTIONS'));
    check('Audit has USER_LOGIN action', auditCode.includes('USER_LOGIN'));
    check('Audit has CAMPAIGN_SEND action', auditCode.includes('CAMPAIGN_SEND'));
    check('Audit has CONTACT_IMPORT action', auditCode.includes('CONTACT_IMPORT'));
    check('Audit has CHANNEL_CONNECT action', auditCode.includes('CHANNEL_CONNECT'));
    check('Audit has TEMPLATE_SYNC action', auditCode.includes('TEMPLATE_SYNC'));
  }

  console.log('\n6. Route Protection Verification\n');

  // Check settings routes
  const settingsPath = path.join(__dirname, '../src/routes/settings.js');
  if (fs.existsSync(settingsPath)) {
    const settingsCode = fs.readFileSync(settingsPath, 'utf8');
    check('Settings imports RBAC middleware', settingsCode.includes("require('../middleware/rbac')"));
    check('Settings imports audit utility', settingsCode.includes("require('../utils/audit')"));
    check('Settings routes use requireAdmin', settingsCode.match(/requireAdmin/g)?.length > 0);
    check('Settings routes call logAudit', settingsCode.includes('logAudit'));
  }

  // Check campaigns routes
  const campaignsPath = path.join(__dirname, '../src/routes/campaigns.js');
  if (fs.existsSync(campaignsPath)) {
    const campaignsCode = fs.readFileSync(campaignsPath, 'utf8');
    check('Campaigns imports RBAC middleware', campaignsCode.includes("require('../middleware/rbac')"));
    check('Campaigns imports audit utility', campaignsCode.includes("require('../utils/audit')"));
    check('Campaigns uses requireMember', campaignsCode.includes('requireMember'));
    check('Campaigns uses requireAdmin', campaignsCode.includes('requireAdmin'));
  }

  // Check contacts routes
  const contactsPath = path.join(__dirname, '../src/routes/contacts.js');
  if (fs.existsSync(contactsPath)) {
    const contactsCode = fs.readFileSync(contactsPath, 'utf8');
    check('Contacts imports RBAC middleware', contactsCode.includes("require('../middleware/rbac')"));
    check('Contacts imports audit utility', contactsCode.includes("require('../utils/audit')"));
    check('Contacts uses requireMember', contactsCode.includes('requireMember'));
  }

  // Check templates routes
  const templatesPath = path.join(__dirname, '../src/routes/templates.js');
  if (fs.existsSync(templatesPath)) {
    const templatesCode = fs.readFileSync(templatesPath, 'utf8');
    check('Templates imports RBAC middleware', templatesCode.includes("require('../middleware/rbac')"));
    check('Templates imports audit utility', templatesCode.includes("require('../utils/audit')"));
    check('Templates uses requireAdmin', templatesCode.includes('requireAdmin'));
  }

  console.log('\n7. Audit Log Content Verification\n');

  const auditCount = db.prepare(`SELECT COUNT(*) as count FROM audit_logs`).get();
  info(`Total audit logs: ${auditCount.count}`);

  const actions = db.prepare(`SELECT DISTINCT action FROM audit_logs ORDER BY action`).all();
  info(`Distinct actions logged: ${actions.length}`);
  actions.slice(0, 10).forEach(a => {
    info(`  - ${a.action}`);
  });

  // Check audit log structure
  if (auditCount.count > 0) {
    const sample = db.prepare(`SELECT * FROM audit_logs LIMIT 1`).get();
    check('Audit logs have actor_user_id', sample.actor_user_id !== null);
    check('Audit logs have tenant_id', sample.tenant_id !== null);
    check('Audit logs have action', sample.action !== null);
    check('Audit logs have metadata', sample.metadata !== null);
    check('Audit logs have created_at', sample.created_at !== null);
  }

  console.log('\n=== Summary ===\n');

  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`Passed: ${passed}/${total} (${percentage}%)\n`);

  if (passed === total) {
    console.log('✓ Phase 2 RBAC system is properly implemented!\n');
    process.exit(0);
  } else {
    const failed = checks.filter(c => !c.passed);
    console.log('✗ The following checks failed:\n');
    failed.forEach(c => {
      console.log(`  - ${c.name}${c.details ? ` (${c.details})` : ''}`);
    });
    console.log();
    process.exit(1);
  }

} catch (err) {
  error(err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  if (db) db.close();
}
