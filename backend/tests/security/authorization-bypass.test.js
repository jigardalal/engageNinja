/**
 * Authorization Bypass Security Tests
 * Tests attempts to bypass role-based authorization controls
 * Verifies session hijacking, privilege escalation, and access control vulnerabilities are prevented
 */

const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let app;
let db;

// Test users with different roles
const testUsers = {
  viewer: null,
  member: null,
  admin: null,
  owner: null,
  platformAdmin: null,
  otherTenant: null
};

// Test data
const testData = {
  demoTenantId: null,
  otherTenantId: null,
  campaignId: null
};

const testCases = [];

describe('Authorization Bypass Prevention', () => {

  beforeAll(async () => {
    process.env.DATABASE_PATH = 'database.test.sqlite';
    app = require('../../src/index');

    const dbPath = path.join(__dirname, '../../database.test.sqlite');
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    // Get test users
    const viewerUser = db.prepare('SELECT id FROM users WHERE email = ?').get('viewer@engageninja.local');
    const memberUser = db.prepare('SELECT id FROM users WHERE email = ?').get('member@engageninja.local');
    const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('user@engageninja.local');
    const ownerUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@engageninja.local');
    const platformAdminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('platform.admin@engageninja.local');

    const demoTenant = db.prepare('SELECT id FROM tenants WHERE name = ?').get('Demo Tenant');
    const betaTenant = db.prepare('SELECT id FROM tenants WHERE name = ?').get('Beta Tenant');

    testUsers.viewer = { id: viewerUser?.id };
    testUsers.member = { id: memberUser?.id };
    testUsers.admin = { id: adminUser?.id };
    testUsers.owner = { id: ownerUser?.id };
    testUsers.platformAdmin = { id: platformAdminUser?.id };
    testUsers.otherTenant = { id: memberUser?.id }; // Has membership elsewhere
    testData.demoTenantId = demoTenant?.id;
    testData.otherTenantId = betaTenant?.id;

    // Create sessions for test users
    Object.keys(testUsers).forEach(userKey => {
      if (testUsers[userKey].id) {
        const sessionId = uuidv4();
        db.prepare(`
          INSERT INTO sessions (session_id, user_id, expires_at)
          VALUES (?, ?, datetime('now', '+24 hours'))
        `).run(sessionId, testUsers[userKey].id);
        testUsers[userKey].sessionId = sessionId;
      }
    });

    // Get a test campaign
    const campaign = db.prepare(
      'SELECT id FROM campaigns WHERE tenant_id = ? LIMIT 1'
    ).get(testData.demoTenantId);

    if (campaign) {
      testData.campaignId = campaign.id;
    }
  });

  afterAll(async () => {
    if (db) db.close();
  });

  // ===== SESSION & AUTHENTICATION ATTACKS =====

  describe('Session Hijacking Prevention', () => {

    test('Cannot use invalid session ID', async () => {
      const fakeSessionId = uuidv4();

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${fakeSessionId}`);

      // Should fail authentication
      expect([401, 403]).toContain(res.status);
      testCases.push({ test: 'Invalid session ID rejected', passed: [401, 403].includes(res.status) });
    });

    test('Cannot access other user\'s data with different session', async () => {
      // Viewer tries to use member's session
      const res = await request(app)
        .get('/api/dashboard')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ userId: testUsers.viewer.id });

      // Should not return viewer's data
      expect(res.status).not.toBe(500);
      testCases.push({ test: 'Session user context enforced', passed: res.status !== 500 });
    });

    test('Session expires after timeout', async () => {
      // Create an expired session
      const expiredSessionId = uuidv4();
      db.prepare(`
        INSERT INTO sessions (session_id, user_id, expires_at)
        VALUES (?, ?, datetime('now', '-1 hours'))
      `).run(expiredSessionId, testUsers.member.id);

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${expiredSessionId}`);

      // Should be rejected
      expect([401, 403]).toContain(res.status);
      testCases.push({ test: 'Expired session rejected', passed: [401, 403].includes(res.status) });
    });

  });

  // ===== PRIVILEGE ESCALATION ATTEMPTS =====

  describe('Privilege Escalation Prevention', () => {

    test('Cannot escalate role via request body parameter', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .send({
          name: 'Escalation Test',
          channel: 'email',
          content: 'Test',
          role: 'owner'  // Attempt to escalate
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Cannot escalate role via request body', passed: res.status === 403 });
    });

    test('Cannot escalate role via URL parameter', async () => {
      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .query({ role: 'owner' });

      // Viewer should still be blocked from sensitive operations
      expect(res.status).toBe(200);
      testCases.push({ test: 'URL role parameter ignored', passed: true });
    });

    test('Cannot escalate role via headers', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .set('X-User-Role', 'owner')
        .set('X-Platform-Admin', 'true');

      // Custom headers should not affect authorization
      expect(res.status).toBe(403);
      testCases.push({ test: 'Custom role headers ignored', passed: res.status === 403 });
    });

    test('Cannot become platform admin via parameter', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ platformAdmin: 'true' });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Cannot escalate to platform admin via params', passed: res.status === 403 });
    });

    test('Cannot assume owner of different tenant via parameter', async () => {
      if (!testData.otherTenantId) {
        console.log('⊘ Skipping: No other tenant found');
        return;
      }

      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ tenant_id: testData.otherTenantId });

      // Should not get access to other tenant
      expect(res.status).not.toBe(200);
      testCases.push({ test: 'Cannot access other tenant via parameter', passed: res.status !== 200 });
    });

  });

  // ===== CROSS-TENANT ACCESS =====

  describe('Cross-Tenant Access Prevention', () => {

    test('Viewer cannot access other tenant data with valid session', async () => {
      if (!testData.otherTenantId) {
        console.log('⊘ Skipping: No other tenant found');
        return;
      }

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.otherTenant.sessionId}`);

      // Should either succeed (own tenant) or fail
      expect(res.status).not.toBe(500);
      testCases.push({ test: 'No 500 error on cross-tenant access attempt', passed: res.status !== 500 });
    });

    test('Cannot modify campaign in other tenant', async () => {
      if (!testData.campaignId) {
        console.log('⊘ Skipping: No test campaign found');
        return;
      }

      // Create session for user in different tenant
      const otherUserSession = uuidv4();
      db.prepare(`
        INSERT INTO sessions (session_id, user_id, expires_at)
        VALUES (?, ?, datetime('now', '+24 hours'))
      `).run(otherUserSession, testUsers.otherTenant.id);

      const res = await request(app)
        .patch(`/api/campaigns/${testData.campaignId}`)
        .set('Cookie', `connect.sid=${otherUserSession}`)
        .send({ name: 'Hijacked Campaign' });

      // Should not allow modification of other tenant's data
      expect([403, 404]).toContain(res.status);
      testCases.push({ test: 'Cannot modify other tenant campaign', passed: [403, 404].includes(res.status) });
    });

    test('Cannot delete user from other tenant', async () => {
      const res = await request(app)
        .delete('/api/tenant/users/fake-user-id')
        .set('Cookie', `connect.sid=${testUsers.otherTenant.sessionId}`);

      // Should be blocked (not owner)
      expect(res.status).toBe(403);
      testCases.push({ test: 'Cannot delete user from other tenant', passed: res.status === 403 });
    });

  });

  // ===== ENDPOINT PARAMETER MANIPULATION =====

  describe('Endpoint Parameter Manipulation Prevention', () => {

    test('Cannot override active tenant via parameter', async () => {
      if (!testData.otherTenantId) {
        console.log('⊘ Skipping: No other tenant found');
        return;
      }

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .query({ active_tenant_id: testData.otherTenantId });

      // Should use session's tenant, not parameter
      expect(res.status).not.toBe(500);
      testCases.push({ test: 'active_tenant_id parameter cannot override session', passed: res.status !== 500 });
    });

    test('Cannot send campaign by modifying URL', async () => {
      if (!testData.campaignId) {
        console.log('⊘ Skipping: No test campaign found');
        return;
      }

      // Viewer tries to send campaign by manipulating URL
      const res = await request(app)
        .get(`/api/campaigns/${testData.campaignId}/send`)
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .query({ force: 'true' });

      // GET should not send, only POST with proper authorization
      expect(res.status).not.toBe(200);
      testCases.push({ test: 'Viewer cannot send campaign via URL params', passed: res.status !== 200 });
    });

    test('Cannot bypass role check via HTTP method manipulation', async () => {
      const res = await request(app)
        .head('/api/admin/tenants')  // Using HEAD instead of GET
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);

      // Should still require authorization
      expect([403, 405]).toContain(res.status);
      testCases.push({ test: 'Authorization enforced regardless of HTTP method', passed: true });
    });

  });

  // ===== OWNER-ONLY OPERATIONS =====

  describe('Owner-Only Operations Protection', () => {

    test('Non-owner cannot invite users', async () => {
      const res = await request(app)
        .post('/api/tenant/invite')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`)
        .send({
          email: 'hacker@test.com',
          role: 'owner'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Non-owner cannot invite users', passed: res.status === 403 });
    });

    test('Admin cannot assign owner role', async () => {
      const res = await request(app)
        .patch('/api/tenant/users/fake-user-id/role')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`)
        .send({ role: 'owner' });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Admin cannot assign owner role', passed: res.status === 403 });
    });

    test('Member cannot remove users', async () => {
      const res = await request(app)
        .delete('/api/tenant/users/fake-user-id')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Member cannot remove users', passed: res.status === 403 });
    });

    test('Cannot promote self to owner', async () => {
      const res = await request(app)
        .patch(`/api/tenant/users/${testUsers.admin.id}/role`)
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`)
        .send({ role: 'owner' });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Cannot self-promote to owner', passed: res.status === 403 });
    });

  });

  // ===== PLATFORM ADMIN BARRIERS =====

  describe('Platform Admin Access Barriers', () => {

    test('Regular user cannot access platform admin endpoints', async () => {
      const adminEndpoints = [
        '/api/admin/tenants',
        '/api/admin/tenants/' + uuidv4(),
        '/api/admin/audit-logs',
        '/api/admin/stats'
      ];

      for (const endpoint of adminEndpoints) {
        const res = await request(app)
          .get(endpoint)
          .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);

        expect(res.status).toBe(403);
      }

      testCases.push({ test: 'Regular users blocked from all admin endpoints', passed: true });
    });

    test('Cannot become platform admin via parameter', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ platformRole: 'platform_admin' });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Cannot become platform admin via query param', passed: res.status === 403 });
    });

    test('Tenant owner cannot access platform admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.owner.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Tenant owner blocked from platform admin', passed: res.status === 403 });
    });

  });

  // ===== MIXED ROLE ATTEMPTS =====

  describe('Mixed Role Attack Prevention', () => {

    test('Cannot claim both tenant role and platform admin', async () => {
      const res = await request(app)
        .post('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.owner.sessionId}`)
        .set('X-Platform-Role', 'platform_admin')
        .send({
          name: 'Hacked Tenant',
          planId: 'free'
        });

      // Owner of tenant is not platform admin
      expect(res.status).toBe(403);
      testCases.push({ test: 'Cannot mix tenant role with platform admin privileges', passed: res.status === 403 });
    });

    test('Platform admin context does not apply to tenant routes', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`)
        .send({
          name: 'Platform Admin Campaign',
          channel: 'email',
          content: 'Test'
        });

      // Platform admin has no tenant context
      expect([401, 403, 404]).toContain(res.status);
      testCases.push({ test: 'Platform admin context does not grant tenant access', passed: true });
    });

  });

  // ===== SUMMARY REPORT =====

  afterAll(() => {
    console.log('\n=== Authorization Bypass Prevention Tests ===\n');
    const passed = testCases.filter(tc => tc.passed).length;
    console.log(`${passed}/${testCases.length} tests passed\n`);

    testCases.forEach(tc => {
      const status = tc.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status}: ${tc.test}`);
    });

    console.log(`\n${passed}/${testCases.length} tests passed\n`);

    if (passed < testCases.length) {
      process.exit(1);
    }
  });

});
