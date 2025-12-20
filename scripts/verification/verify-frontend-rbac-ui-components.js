#!/usr/bin/env node

/**
 * Phase 5 RBAC Implementation Verification
 * Verifies all frontend UI components and integrations for role-based access control
 */

const fs = require('fs');
const path = require('path');

const checks = [];

function check(condition, message) {
  checks.push({ passed: condition, message });
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  check(exists, `${description} exists at ${filePath}`);
  return exists;
}

function checkFileContent(filePath, pattern, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    check(false, `${description} - file not found: ${filePath}`);
    return false;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const found = typeof pattern === 'string'
    ? content.includes(pattern)
    : pattern.test(content);
  check(found, `${description}`);
  return found;
}

console.log('\n🔍 Phase 5: Frontend RBAC UI Implementation Verification\n');

// ===== PART 1: AUTH CONTEXT UPDATES =====
console.log('📋 Part 1: AuthContext Role Integration');

checkFileContent(
  'frontend/src/context/AuthContext.jsx',
  'const [userRole, setUserRole]',
  '✓ AuthContext has userRole state'
);

checkFileContent(
  'frontend/src/context/AuthContext.jsx',
  'const [platformRole, setPlatformRole]',
  '✓ AuthContext has platformRole state'
);

checkFileContent(
  'frontend/src/context/AuthContext.jsx',
  /const hasRole\s*=\s*useCallback/,
  '✓ AuthContext exports hasRole() method'
);

checkFileContent(
  'frontend/src/context/AuthContext.jsx',
  /const isPlatformAdmin\s*=\s*useCallback/,
  '✓ AuthContext exports isPlatformAdmin() method'
);

checkFileContent(
  'frontend/src/context/AuthContext.jsx',
  /const canManageTeam\s*=\s*useCallback/,
  '✓ AuthContext exports canManageTeam() method'
);

// ===== PART 2: PROTECTED ROUTE UPDATES =====
console.log('\n📋 Part 2: ProtectedRoute Enhancement');

checkFileContent(
  'frontend/src/components/ProtectedRoute.jsx',
  'requiredRole',
  '✓ ProtectedRoute accepts requiredRole parameter'
);

checkFileContent(
  'frontend/src/components/ProtectedRoute.jsx',
  'requirePlatformAdmin',
  '✓ ProtectedRoute accepts requirePlatformAdmin parameter'
);

// ===== PART 3: NEW UI COMPONENTS =====
console.log('\n📋 Part 3: New UI Components');

checkFileExists(
  'frontend/src/pages/TeamPage.jsx',
  'TeamPage'
);

checkFileContent(
  'frontend/src/pages/TeamPage.jsx',
  'const isAdmin = hasRole(\'admin\')',
  '✓ TeamPage checks for admin role'
);

checkFileContent(
  'frontend/src/pages/TeamPage.jsx',
  '/api/tenant/users',
  '✓ TeamPage uses tenant users API'
);

checkFileExists(
  'frontend/src/pages/AcceptInvitePage.jsx',
  'AcceptInvitePage'
);

checkFileContent(
  'frontend/src/pages/AcceptInvitePage.jsx',
  '/api/auth/accept-invite',
  '✓ AcceptInvitePage uses accept-invite API'
);

checkFileContent(
  'frontend/src/pages/AcceptInvitePage.jsx',
  'showSignup',
  '✓ AcceptInvitePage handles new user signup'
);

checkFileExists(
  'frontend/src/pages/admin/AdminDashboard.jsx',
  'AdminDashboard'
);

checkFileContent(
  'frontend/src/pages/admin/AdminDashboard.jsx',
  'isPlatformAdmin()',
  '✓ AdminDashboard checks for platform admin'
);

checkFileContent(
  'frontend/src/pages/admin/AdminDashboard.jsx',
  '/api/admin/tenants',
  '✓ AdminDashboard uses admin tenants API'
);

checkFileExists(
  'frontend/src/pages/admin/TenantDetailPage.jsx',
  'TenantDetailPage'
);

checkFileContent(
  'frontend/src/pages/admin/TenantDetailPage.jsx',
  '/api/admin/tenants/${tenantId}',
  '✓ TenantDetailPage uses tenant detail API'
);

checkFileContent(
  'frontend/src/pages/admin/TenantDetailPage.jsx',
  'handleStatusChange',
  '✓ TenantDetailPage allows status changes'
);

checkFileExists(
  'frontend/src/pages/admin/AuditLogPage.jsx',
  'AuditLogPage'
);

checkFileContent(
  'frontend/src/pages/admin/AuditLogPage.jsx',
  '/api/admin/audit-logs',
  '✓ AuditLogPage uses audit logs API'
);

checkFileContent(
  'frontend/src/pages/admin/AuditLogPage.jsx',
  'filterAction',
  '✓ AuditLogPage supports filtering by action'
);

// ===== PART 4: APP.JSX ROUTING =====
console.log('\n📋 Part 4: App.jsx Route Registration');

checkFileContent(
  'frontend/src/App.jsx',
  'import { TeamPage }',
  '✓ App.jsx imports TeamPage'
);

checkFileContent(
  'frontend/src/App.jsx',
  'import { AcceptInvitePage }',
  '✓ App.jsx imports AcceptInvitePage'
);

checkFileContent(
  'frontend/src/App.jsx',
  'import { AdminDashboard }',
  '✓ App.jsx imports AdminDashboard'
);

checkFileContent(
  'frontend/src/App.jsx',
  'import { TenantDetailPage }',
  '✓ App.jsx imports TenantDetailPage'
);

checkFileContent(
  'frontend/src/App.jsx',
  'import { AuditLogPage }',
  '✓ App.jsx imports AuditLogPage'
);

checkFileContent(
  'frontend/src/App.jsx',
  'path="/team"',
  '✓ App.jsx has /team route'
);

checkFileContent(
  'frontend/src/App.jsx',
  'path="/accept-invite"',
  '✓ App.jsx has /accept-invite route'
);

checkFileContent(
  'frontend/src/App.jsx',
  'path="/admin"',
  '✓ App.jsx has /admin route'
);

checkFileContent(
  'frontend/src/App.jsx',
  'path="/admin/tenants/:tenantId"',
  '✓ App.jsx has /admin/tenants/:tenantId route'
);

checkFileContent(
  'frontend/src/App.jsx',
  'path="/admin/audit-logs"',
  '✓ App.jsx has /admin/audit-logs route'
);

checkFileContent(
  'frontend/src/App.jsx',
  'requiredRole="admin"',
  '✓ App.jsx uses role-based protection for team route'
);

checkFileContent(
  'frontend/src/App.jsx',
  'requirePlatformAdmin',
  '✓ App.jsx uses platform admin protection for admin routes'
);

// ===== PART 5: APP SHELL NAVIGATION =====
console.log('\n📋 Part 5: AppShell Navigation Updates');

checkFileContent(
  'frontend/src/components/layout/AppShell.jsx',
  'const getNavItems = (userRole, isPlatformAdmin)',
  '✓ AppShell has getNavItems function for role-based navigation'
);

checkFileContent(
  'frontend/src/components/layout/AppShell.jsx',
  "{ label: 'Team', to: '/team' }",
  '✓ AppShell adds Team link for admin+ roles'
);

checkFileContent(
  'frontend/src/components/layout/AppShell.jsx',
  "{ label: 'Admin', to: '/admin' }",
  '✓ AppShell adds Admin link for platform admins'
);

checkFileContent(
  'frontend/src/components/layout/AppShell.jsx',
  'Team Management',
  '✓ AppShell user menu includes Team Management option'
);

checkFileContent(
  'frontend/src/components/layout/AppShell.jsx',
  'Platform Admin',
  '✓ AppShell user menu includes Platform Admin option'
);

// ===== PART 6: SETTINGS PAGE =====
console.log('\n📋 Part 6: SettingsPage Team Tab');

checkFileContent(
  'frontend/src/pages/SettingsPage.jsx',
  'import { useAuth }',
  '✓ SettingsPage imports useAuth'
);

checkFileContent(
  'frontend/src/pages/SettingsPage.jsx',
  "activeTab === 'team'",
  '✓ SettingsPage has team tab'
);

checkFileContent(
  'frontend/src/pages/SettingsPage.jsx',
  "['admin', 'owner'].includes(userRole)",
  '✓ SettingsPage checks for admin/owner role for team tab'
);

checkFileContent(
  'frontend/src/pages/SettingsPage.jsx',
  'Open Team Management',
  '✓ SettingsPage team tab links to TeamPage'
);

// ===== SUMMARY =====
console.log('\n' + '='.repeat(60));

const passed = checks.filter(c => c.passed).length;
const total = checks.length;
const percentage = Math.round((passed / total) * 100);

console.log(`\n✅ Phase 5 Verification Results: ${passed}/${total} checks passed (${percentage}%)\n`);

if (passed === total) {
  console.log('🎉 All Phase 5 checks passed! Frontend RBAC UI is complete.\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed:\n');
  checks
    .filter(c => !c.passed)
    .forEach(c => {
      console.log(`   ✗ ${c.message}`);
    });
  console.log('');
  process.exit(1);
}
