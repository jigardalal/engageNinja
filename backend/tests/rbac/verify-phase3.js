#!/usr/bin/env node

/**
 * Phase 3 User Management Verification Script
 * Validates that all user management components are properly set up
 */

const db = require('../../src/db');
const path = require('path');
const fs = require('fs');

const checks = [];

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

async function main() {
  console.log('\n=== Phase 3 User Management Verification ===\n');

  try {

    console.log('1. Database Schema Validation\n');

    // Check user_invitations table
    const invitationsCols = await db.prepare(`SELECT column_name FROM information_schema.columns WHERE table_name = 'user_invitations'`).all();
    const invitationsColNames = invitationsCols.map(c => c.column_name);

    check('user_invitations table exists', invitationsCols.length > 0);
    check('user_invitations has email column', invitationsColNames.includes('email'));
    check('user_invitations has token column', invitationsColNames.includes('token'));
    check('user_invitations has role column', invitationsColNames.includes('role'));
    check('user_invitations has tenant_id column', invitationsColNames.includes('tenant_id'));
    check('user_invitations has expires_at column', invitationsColNames.includes('expires_at'));

    // Check user_tenants has role column
    const userTenantsCols = await db.prepare(`SELECT column_name FROM information_schema.columns WHERE table_name = 'user_tenants'`).all();
    const userTenantsColNames = userTenantsCols.map(c => c.column_name);
    check('user_tenants has role column', userTenantsColNames.includes('role'));

    // Check users table has role_global
    const usersCols = await db.prepare(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`).all();
    const usersColNames = usersCols.map(c => c.column_name);
    check('users has role_global column', usersColNames.includes('role_global'));

    console.log('\n2. Test Data Validation\n');

    // Check test users exist
    const owner = await db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@engageninja.local');
    check('Owner user exists (admin@engageninja.local)', owner.count > 0);

    const admin = await db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('user@engageninja.local');
    check('Admin user exists (user@engageninja.local)', admin.count > 0);

    const member = await db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('member@engageninja.local');
    check('Member user exists (member@engageninja.local)', member.count > 0);

    const viewer = await db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('viewer@engageninja.local');
    check('Viewer user exists (viewer@engageninja.local)', viewer.count > 0);

    // Check user-tenant associations with roles
    const demoTenant = await db.prepare('SELECT id FROM tenants WHERE name = ?').get('Demo Tenant');
    if (demoTenant) {
      const ownerMembership = await db.prepare(`
        SELECT COUNT(*) as count FROM user_tenants
        WHERE tenant_id = ? AND role = 'owner'
      `).get(demoTenant.id);
      check('Demo tenant has owner role', ownerMembership.count > 0);

      const adminMembership = await db.prepare(`
        SELECT COUNT(*) as count FROM user_tenants
        WHERE tenant_id = ? AND role = 'admin'
      `).get(demoTenant.id);
      check('Demo tenant has admin role', adminMembership.count > 0);

      const memberMembership = await db.prepare(`
        SELECT COUNT(*) as count FROM user_tenants
        WHERE tenant_id = ? AND role = 'member'
      `).get(demoTenant.id);
      check('Demo tenant has member role', memberMembership.count > 0);

      const viewerMembership = await db.prepare(`
        SELECT COUNT(*) as count FROM user_tenants
        WHERE tenant_id = ? AND role = 'viewer'
      `).get(demoTenant.id);
      check('Demo tenant has viewer role', viewerMembership.count > 0);
    }

  console.log('\n3. Middleware & Route Files\n');

  // Check tenant-users route file
  const tenantUsersPath = path.join(__dirname, '../src/routes/tenant-users.js');
  check('tenant-users.js route file exists', fs.existsSync(tenantUsersPath));

  if (fs.existsSync(tenantUsersPath)) {
    const tenantUsersCode = fs.readFileSync(tenantUsersPath, 'utf8');
    check('tenant-users has GET endpoint', tenantUsersCode.includes("router.get('/'"));
    check('tenant-users has POST invite endpoint', tenantUsersCode.includes("router.post('/invite'"));
    check('tenant-users has PATCH role endpoint', tenantUsersCode.includes("router.patch('/:userId/role'"));
    check('tenant-users has DELETE endpoint', tenantUsersCode.includes("router.delete('/:userId'"));
    check('tenant-users uses requireAdmin', tenantUsersCode.includes('requireAdmin'));
    check('tenant-users uses requireOwner', tenantUsersCode.includes('requireOwner'));
  }

  // Check auth.js has new endpoints
  const authPath = path.join(__dirname, '../src/routes/auth.js');
  if (fs.existsSync(authPath)) {
    const authCode = fs.readFileSync(authPath, 'utf8');
    check('auth.js has accept-invite endpoint', authCode.includes("router.post('/accept-invite'"));
    check('auth.js GET /me includes role_global', authCode.includes('role_global'));
  }

  // Check index.js registers tenant-users routes
  const indexPath = path.join(__dirname, '../src/index.js');
  if (fs.existsSync(indexPath)) {
    const indexCode = fs.readFileSync(indexPath, 'utf8');
    check('index.js registers tenant-users routes', indexCode.includes("'/api/tenant/users'"));
  }

  console.log('\n4. Audit Logging Integration\n');

  // Check audit utility has user-related actions
  const auditPath = path.join(__dirname, '../src/utils/audit.js');
  if (fs.existsSync(auditPath)) {
    const auditCode = fs.readFileSync(auditPath, 'utf8');
    check('Audit has USER_INVITE action', auditCode.includes('USER_INVITE'));
    check('Audit has USER_ROLE_CHANGED action', auditCode.includes('USER_ROLE_CHANGE'));
    check('Audit has USER_REMOVED action', auditCode.includes('USER_REMOVE'));
  }

    console.log('\n5. Invitation System\n');

    // Check if any invitations exist (may be empty)
    const invitationCount = await db.prepare('SELECT COUNT(*) as count FROM user_invitations').get();
    info(`Total invitations in database: ${invitationCount.count}`);

    if (invitationCount.count > 0) {
      const sampleInvitation = await db.prepare('SELECT * FROM user_invitations LIMIT 1').get();
      check('Invitations have email', sampleInvitation.email !== null);
      check('Invitations have token', sampleInvitation.token !== null);
      check('Invitations have role', sampleInvitation.role !== null);
      check('Invitations have tenant_id', sampleInvitation.tenant_id !== null);
      check('Invitations have expires_at', sampleInvitation.expires_at !== null);
    }

    console.log('\n6. Indexes for Performance\n');

    const indexes = await db.prepare(`
      SELECT indexname FROM pg_indexes
      WHERE tablename IN ('user_invitations', 'user_tenants')
    `).all();
    const indexNames = indexes.map(i => i.indexname);

    check('user_invitations has email index', indexNames.some(i => i.includes('invitations') && i.includes('email')));
    check('user_invitations has token index', indexNames.some(i => i.includes('invitations') && i.includes('token')));

    console.log('\n7. User Management Features\n');

    // Check for multi-tenant users
    const multiTenantUsers = await db.prepare(`
      SELECT user_id, COUNT(*) as tenant_count
      FROM user_tenants
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `).all();

    check('Multi-tenant users exist', multiTenantUsers.length > 0, `${multiTenantUsers.length} users in multiple tenants`);

    // Check role distribution
    const roleCounts = await db.prepare(`
      SELECT role, COUNT(*) as count
      FROM user_tenants
      GROUP BY role
    `).all();

    info(`Role distribution:`);
    roleCounts.forEach(r => {
      info(`  ${r.role}: ${r.count} memberships`);
    });

    console.log('\n8. Database Integrity\n');

    // Verify all user_tenants reference valid users
    const orphanedTenants = await db.prepare(`
      SELECT COUNT(*) as count FROM user_tenants ut
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ut.user_id)
    `).get();
    check('No orphaned user_tenants (all reference valid users)', orphanedTenants.count === 0);

    // Verify all user_tenants reference valid tenants
    const orphanedTenants2 = await db.prepare(`
      SELECT COUNT(*) as count FROM user_tenants ut
      WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = ut.tenant_id)
    `).get();
    check('No orphaned tenant references (all reference valid tenants)', orphanedTenants2.count === 0);

    // Check each tenant has at least one owner
    const tenantsWithoutOwner = await db.prepare(`
      SELECT t.id, t.name FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.tenant_id = t.id AND ut.role = 'owner'
      )
    `).all();
    check('All tenants have at least one owner', tenantsWithoutOwner.length === 0);

    console.log('\n=== Summary ===\n');

    const passed = checks.filter(c => c.passed).length;
    const total = checks.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`Passed: ${passed}/${total} (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ Phase 3 User Management system is properly implemented!\n');
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
  }
}

main();
