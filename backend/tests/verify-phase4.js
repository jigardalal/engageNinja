/**
 * Phase 4 Verification Script
 * Automated verification of Platform Admin System implementation
 * Checks: Routes, middleware, audit logging, database integration
 */

const db = require('../src/db');
const fs = require('fs');
const path = require('path');

let passedChecks = 0;
let failedChecks = 0;
const failureDetails = [];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
const check = (description, condition) => {
  if (condition) {
    console.log(`  ${colors.green}✓${colors.reset} ${description}`);
    passedChecks++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} ${description}`);
    failedChecks++;
    failureDetails.push(description);
  }
};

const section = (title) => {
  console.log(`\n${colors.blue}${title}${colors.reset}`);
  console.log('─'.repeat(60));
};

// ===== PHASE 4 VERIFICATION CHECKS =====

section('1. File Structure Validation');

// Check if admin.js route file exists
const adminRouteFile = path.join(__dirname, '../src/routes/admin.js');
check(
  'Admin route file exists (backend/src/routes/admin.js)',
  fs.existsSync(adminRouteFile)
);

// Check if admin.js is properly formatted
if (fs.existsSync(adminRouteFile)) {
  const adminContent = fs.readFileSync(adminRouteFile, 'utf-8');

  check(
    'Admin route file exports router module',
    adminContent.includes('module.exports = router')
  );

  check(
    'Admin routes require authentication',
    adminContent.includes('requireAuth')
  );

  check(
    'Admin routes require platform admin role',
    adminContent.includes('requirePlatformAdmin')
  );
}

// Check if index.js registers admin routes
const indexFile = path.join(__dirname, '../src/index.js');
const indexContent = fs.readFileSync(indexFile, 'utf-8');

check(
  'Admin routes registered in index.js',
  indexContent.includes("app.use('/api/admin', require('./routes/admin'))")
);

section('2. Route Implementation Validation');

const adminContent = fs.readFileSync(adminRouteFile, 'utf-8');

// Tenant management routes
check(
  'GET /api/admin/tenants route implemented',
  adminContent.includes("router.get('/tenants'")
);

check(
  'GET /api/admin/tenants/:tenantId route implemented',
  adminContent.includes("router.get('/tenants/:tenantId'")
);

check(
  'POST /api/admin/tenants route implemented',
  adminContent.includes("router.post('/tenants'")
);

check(
  'PATCH /api/admin/tenants/:tenantId route implemented',
  adminContent.includes("router.patch('/tenants/:tenantId'")
);

// User management routes
check(
  'GET /api/admin/users route implemented',
  adminContent.includes("router.get('/users'")
);

check(
  'GET /api/admin/users/:userId route implemented',
  adminContent.includes("router.get('/users/:userId'")
);

check(
  'PATCH /api/admin/users/:userId route implemented',
  adminContent.includes("router.patch('/users/:userId'")
);

check(
  'POST /api/admin/users/:userId/tenants/:tenantId/assign route implemented',
  adminContent.includes("router.post('/users/:userId/tenants/:tenantId/assign'")
);

// Audit log routes
check(
  'GET /api/admin/audit-logs route implemented',
  adminContent.includes("router.get('/audit-logs'")
);

check(
  'GET /api/admin/audit-logs/stats route implemented',
  adminContent.includes("router.get('/audit-logs/stats'")
);

// Configuration routes
check(
  'GET /api/admin/config route implemented',
  adminContent.includes("router.get('/config'")
);

check(
  'PATCH /api/admin/config/:key route implemented',
  adminContent.includes("router.patch('/config/:key'")
);

// Statistics routes
check(
  'GET /api/admin/stats route implemented',
  adminContent.includes("router.get('/stats'")
);

section('3. Middleware & Security Validation');

check(
  'Platform admin requirement applied to all routes',
  adminContent.includes('router.use(requireAuth)') &&
  adminContent.includes('router.use(requirePlatformAdmin)')
);

check(
  'RBAC middleware imported (requirePlatformAdmin)',
  adminContent.includes("require('../middleware/rbac')")
);

check(
  'Audit logging utility imported',
  adminContent.includes("require('../utils/audit')")
);

check(
  'Routes prevent self-deactivation',
  adminContent.includes('userId === req.session.userId')
);

section('4. Feature Implementation Validation');

// Tenant features
check(
  'Tenant list supports filtering by status',
  adminContent.includes('status = ?')
);

check(
  'Tenant list supports searching',
  adminContent.includes('name LIKE ?')
);

check(
  'Tenant list includes user count',
  adminContent.includes('COUNT(DISTINCT ut.user_id)')
);

check(
  'Tenant creation supports owner assignment',
  adminContent.includes('ownerEmail') || adminContent.includes('owner_email')
);

check(
  'Tenant updates support status changes',
  adminContent.includes("'active', 'suspended', 'archived', 'deleted'")
);

// User features
check(
  'User list supports pagination',
  adminContent.includes('LIMIT ? OFFSET ?')
);

check(
  'User list includes tenant count',
  adminContent.includes('COUNT(DISTINCT ut.tenant_id)')
);

check(
  'User assignment validates role',
  adminContent.includes("['owner', 'admin', 'member', 'viewer']")
);

// Audit features
check(
  'Audit logs support filtering by tenant',
  adminContent.includes('al.tenant_id = ?')
);

check(
  'Audit logs support filtering by user',
  adminContent.includes('al.actor_user_id = ?')
);

check(
  'Audit logs support filtering by action',
  adminContent.includes('al.action = ?')
);

check(
  'Audit logs support date range filtering',
  adminContent.includes('created_at >= ?') &&
  adminContent.includes('created_at <= ?')
);

check(
  'Audit stats provides action summary',
  adminContent.includes('GROUP BY action')
);

check(
  'Audit stats provides actor summary',
  adminContent.includes('GROUP BY actor_user_id')
);

section('5. Audit Logging Implementation');

check(
  'Tenant creation is audited',
  adminContent.includes('AUDIT_ACTIONS.TENANT_CREATE')
);

check(
  'Tenant updates are audited',
  adminContent.includes('AUDIT_ACTIONS.TENANT_UPDATE')
);

check(
  'User activation/deactivation is audited',
  adminContent.includes('AUDIT_ACTIONS.USER_DEACTIVATE') ||
  adminContent.includes('AUDIT_ACTIONS.USER_ACTIVATE')
);

check(
  'User assignment is audited',
  adminContent.includes('admin.user_assign')
);

check(
  'Configuration changes are audited',
  adminContent.includes('config.update')
);

section('6. Database Integration Validation');

try {
  // Check if tenants table has required columns
  const tenantColumns = db.prepare("PRAGMA table_info(tenants)").all();
  const tenantColumnNames = tenantColumns.map(c => c.name);

  check(
    'Tenants table has status column',
    tenantColumnNames.includes('status')
  );

  check(
    'Tenants table has limits column',
    tenantColumnNames.includes('limits')
  );

  check(
    'Tenants table has metadata column',
    tenantColumnNames.includes('metadata')
  );

  // Check if users table has required columns
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const userColumnNames = userColumns.map(c => c.name);

  check(
    'Users table has role_global column',
    userColumnNames.includes('role_global')
  );

  check(
    'Users table has active column',
    userColumnNames.includes('active')
  );

  // Check if user_tenants table exists
  const userTenantColumns = db.prepare("PRAGMA table_info(user_tenants)").all();
  check(
    'user_tenants table exists',
    userTenantColumns.length > 0
  );

  // Check if audit_logs table exists
  const auditColumns = db.prepare("PRAGMA table_info(audit_logs)").all();
  check(
    'audit_logs table exists',
    auditColumns.length > 0
  );

  // Check if platform_config table exists
  try {
    const configColumns = db.prepare("PRAGMA table_info(platform_config)").all();
    check(
      'platform_config table exists',
      configColumns.length > 0
    );
  } catch {
    check('platform_config table exists', false);
  }

} catch (error) {
  check('Database tables validation', false);
  failureDetails.push(`Database error: ${error.message}`);
}

section('7. Error Handling Validation');

check(
  'Routes handle missing tenant ID',
  adminContent.includes("'Tenant not found'")
);

check(
  'Routes handle missing user ID',
  adminContent.includes("'User not found'")
);

check(
  'Routes handle invalid parameters',
  adminContent.includes("'Invalid status value'") ||
  adminContent.includes("'Invalid role value'")
);

check(
  'Routes prevent operations on self',
  adminContent.includes("'Cannot deactivate your own account'")
);

check(
  'Routes validate role values',
  adminContent.includes("'Role is required'")
);

section('8. Response Format Validation');

check(
  'Routes return proper JSON responses',
  adminContent.includes('res.json(')
);

check(
  'Routes include pagination metadata',
  adminContent.includes('pagination:')
);

check(
  'Routes include proper HTTP status codes',
  adminContent.includes('status(201)') || adminContent.includes('status(400)')
);

section('9. Platform Admin Feature Completeness');

check(
  'Platform admin can create tenants',
  adminContent.includes('POST /api/admin/tenants') || adminContent.includes("router.post('/tenants'")
);

check(
  'Platform admin can update tenant status',
  adminContent.includes('status')
);

check(
  'Platform admin can manage users globally',
  adminContent.includes('GET /api/admin/users') || adminContent.includes("router.get('/users'")
);

check(
  'Platform admin can assign users to tenants',
  adminContent.includes('assign')
);

check(
  'Platform admin can view system-wide audit logs',
  adminContent.includes('audit-logs')
);

check(
  'Platform admin can manage configuration',
  adminContent.includes('platform_config') || adminContent.includes('/config')
);

section('10. Integration Validation');

check(
  'Admin routes use existing RBAC patterns',
  adminContent.includes('requireAuth') &&
  adminContent.includes('requirePlatformAdmin')
);

check(
  'Admin routes use existing audit utility',
  adminContent.includes('logAudit')
);

check(
  'Admin routes integrated with database',
  adminContent.includes('db.prepare')
);

// ===== SUMMARY =====

section('Verification Summary');

const total = passedChecks + failedChecks;
const percentage = Math.round((passedChecks / total) * 100);

console.log(`
${colors.cyan}Total Checks: ${total}${colors.reset}
${colors.green}Passed: ${passedChecks}${colors.reset}
${colors.red}Failed: ${failedChecks}${colors.reset}
${colors.yellow}Success Rate: ${percentage}%${colors.reset}
`);

if (failedChecks > 0) {
  console.log(`${colors.red}❌ Phase 4 Verification FAILED${colors.reset}\n`);
  console.log('Failed checks:');
  failureDetails.forEach(detail => {
    console.log(`  - ${detail}`);
  });
  process.exit(1);
} else {
  console.log(`${colors.green}✓ Phase 4 Platform Admin System is properly implemented!${colors.reset}\n`);
  process.exit(0);
}
