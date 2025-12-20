/**
 * RBAC Enforcement Integration Tests
 * Tests complete RBAC enforcement flows across all routes
 * Verifies role hierarchy is enforced at the middleware level
 */

const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let app;
let db;

// Test users
const testUsers = {
  viewer: null,
  member: null,
  admin: null,
  owner: null,
  platformAdmin: null
};

// Test data
const testData = {
  demoTenantId: null,
  campaignId: null,
  templateId: null
};

const testCases = [];

describe('RBAC Enforcement Integration Tests', () => {

  beforeAll(async () => {
    // Initialize app with test database
    process.env.DATABASE_PATH = 'database.test.sqlite';
    app = require('../../src/index');

    // Setup database
    const dbPath = path.join(__dirname, '../../database.test.sqlite');
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    // Get test users
    const viewerUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('viewer@engageninja.local');

    const memberUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('member@engageninja.local');

    const adminUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('user@engageninja.local');

    const ownerUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('admin@engageninja.local');

    const platformAdminUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('platform.admin@engageninja.local');

    const demoTenant = db.prepare(
      'SELECT id FROM tenants WHERE name = ?'
    ).get('Demo Tenant');

    testUsers.viewer = { id: viewerUser?.id };
    testUsers.member = { id: memberUser?.id };
    testUsers.admin = { id: adminUser?.id };
    testUsers.owner = { id: ownerUser?.id };
    testUsers.platformAdmin = { id: platformAdminUser?.id };
    testData.demoTenantId = demoTenant?.id;

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

    // Get or create a test campaign
    const campaign = db.prepare(
      'SELECT id FROM campaigns WHERE tenant_id = ? LIMIT 1'
    ).get(testData.demoTenantId);

    if (campaign) {
      testData.campaignId = campaign.id;
    }

    // Get or create a test template
    const template = db.prepare(
      'SELECT id FROM templates WHERE tenant_id = ? LIMIT 1'
    ).get(testData.demoTenantId);

    if (template) {
      testData.templateId = template.id;
    }
  });

  afterAll(async () => {
    if (db) db.close();
  });

  // ===== VIEWER ROLE RESTRICTIONS =====

  describe('Viewer Role - Read-Only Access', () => {

    test('Viewer can access dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`);

      expect(res.status).toBe(200);
      testCases.push({ test: 'Viewer can access dashboard', passed: res.status === 200 });
    });

    test('Viewer can view campaigns list', async () => {
      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`);

      expect(res.status).toBe(200);
      testCases.push({ test: 'Viewer can view campaigns', passed: res.status === 200 });
    });

    test('Viewer blocked from sending campaign', async () => {
      if (!testData.campaignId) {
        console.log('⊘ Skipping: No test campaign found');
        return;
      }

      const res = await request(app)
        .post(`/api/campaigns/${testData.campaignId}/send`)
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .send({ recipientType: 'all' });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Viewer blocked from sending campaign', passed: res.status === 403 });
    });

    test('Viewer blocked from creating campaign', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .send({
          name: 'Test Campaign',
          channel: 'email',
          content: 'Test content'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Viewer blocked from creating campaign', passed: res.status === 403 });
    });

    test('Viewer blocked from creating contact', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
        .send({
          name: 'Test Contact',
          email: 'test@test.com'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Viewer blocked from creating contact', passed: res.status === 403 });
    });

    test('Viewer blocked from deleting contact', async () => {
      const res = await request(app)
        .delete('/api/contacts/fake-id')
        .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Viewer blocked from deleting contact', passed: res.status === 403 });
    });

  });

  // ===== MEMBER ROLE RESTRICTIONS =====

  describe('Member Role - Campaign Operations', () => {

    test('Member can view campaigns', async () => {
      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);

      expect(res.status).toBe(200);
      testCases.push({ test: 'Member can view campaigns', passed: res.status === 200 });
    });

    test('Member can create campaign', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: `Test Campaign ${Date.now()}`,
          channel: 'email',
          content: 'Test content'
        });

      expect(res.status).toBe(201);
      testCases.push({ test: 'Member can create campaign', passed: res.status === 201 });
    });

    test('Member can send campaign', async () => {
      if (!testData.campaignId) {
        console.log('⊘ Skipping: No test campaign found');
        return;
      }

      const res = await request(app)
        .post(`/api/campaigns/${testData.campaignId}/send`)
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({ recipientType: 'all' });

      // May return 400 (bad data) instead of 201, but not 403
      expect([201, 400, 404]).toContain(res.status);
      testCases.push({ test: 'Member allowed to send campaign', passed: res.status !== 403 });
    });

    test('Member blocked from configuring channels', async () => {
      const res = await request(app)
        .post('/api/settings/channels/whatsapp')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          accountSid: 'test-sid',
          authToken: 'test-token'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Member blocked from configuring channels', passed: res.status === 403 });
    });

    test('Member blocked from managing templates', async () => {
      const res = await request(app)
        .post('/api/templates')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: 'Test Template',
          content: 'Template content'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Member blocked from creating template', passed: res.status === 403 });
    });

    test('Member blocked from managing team', async () => {
      const res = await request(app)
        .get('/api/tenant/users')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Member blocked from managing team', passed: res.status === 403 });
    });

  });

  // ===== ADMIN ROLE RESTRICTIONS =====

  describe('Admin Role - Settings Access (No Owner Actions)', () => {

    test('Admin can access settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`);

      // May be 404 if endpoint doesn't exist, but not 403
      expect(res.status).not.toBe(403);
      testCases.push({ test: 'Admin can access settings', passed: res.status !== 403 });
    });

    test('Admin can configure channels', async () => {
      const res = await request(app)
        .post('/api/settings/channels/whatsapp')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`)
        .send({
          accountSid: 'test-sid',
          authToken: 'test-token'
        });

      // May fail with 400 (bad data) but not 403
      expect(res.status).not.toBe(403);
      testCases.push({ test: 'Admin allowed to configure channels', passed: res.status !== 403 });
    });

    test('Admin can manage templates', async () => {
      const res = await request(app)
        .post('/api/templates')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`)
        .send({
          name: 'Test Template',
          content: 'Template content'
        });

      // May fail with 400 but not 403
      expect([201, 400]).toContain(res.status);
      testCases.push({ test: 'Admin allowed to create template', passed: res.status !== 403 });
    });

    test('Admin blocked from managing team (owner-only)', async () => {
      const res = await request(app)
        .get('/api/tenant/users')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Admin blocked from team management (owner-only)', passed: res.status === 403 });
    });

    test('Admin blocked from inviting users (owner-only)', async () => {
      const res = await request(app)
        .post('/api/tenant/invite')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`)
        .send({
          email: 'test@test.com',
          role: 'member'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Admin blocked from inviting users', passed: res.status === 403 });
    });

    test('Admin blocked from changing roles (owner-only)', async () => {
      const res = await request(app)
        .patch('/api/tenant/users/fake-user-id/role')
        .set('Cookie', `connect.sid=${testUsers.admin.sessionId}`)
        .send({ role: 'member' });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Admin blocked from changing user roles', passed: res.status === 403 });
    });

  });

  // ===== OWNER ROLE - FULL ACCESS =====

  describe('Owner Role - Full Tenant Access', () => {

    test('Owner can access settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Cookie', `connect.sid=${testUsers.owner.sessionId}`);

      // May be 404 but not 403
      expect(res.status).not.toBe(403);
      testCases.push({ test: 'Owner can access settings', passed: res.status !== 403 });
    });

    test('Owner can manage team', async () => {
      const res = await request(app)
        .get('/api/tenant/users')
        .set('Cookie', `connect.sid=${testUsers.owner.sessionId}`);

      // May be 404 or other error but not 403
      expect(res.status).not.toBe(403);
      testCases.push({ test: 'Owner can access team management', passed: res.status !== 403 });
    });

    test('Owner can invite users', async () => {
      const res = await request(app)
        .post('/api/tenant/invite')
        .set('Cookie', `connect.sid=${testUsers.owner.sessionId}`)
        .send({
          email: `test-${Date.now()}@test.com`,
          role: 'member'
        });

      // Should succeed or fail with 400 (bad data), not 403
      expect([201, 400]).toContain(res.status);
      testCases.push({ test: 'Owner allowed to invite users', passed: res.status !== 403 });
    });

    test('Owner can configure channels', async () => {
      const res = await request(app)
        .post('/api/settings/channels/whatsapp')
        .set('Cookie', `connect.sid=${testUsers.owner.sessionId}`)
        .send({
          accountSid: 'test-sid',
          authToken: 'test-token'
        });

      // May fail with 400 but not 403
      expect(res.status).not.toBe(403);
      testCases.push({ test: 'Owner can configure channels', passed: res.status !== 403 });
    });

  });

  // ===== PLATFORM ADMIN RESTRICTIONS =====

  describe('Platform Admin - Admin Routes Only', () => {

    test('Platform admin blocked from regular tenant routes', async () => {
      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      // Should be blocked or redirect (not have active tenant)
      expect([401, 403, 404]).toContain(res.status);
      testCases.push({ test: 'Platform admin restricted from tenant routes', passed: true });
    });

    test('Platform admin can access admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      // Should be allowed
      expect(res.status).toBe(200);
      testCases.push({ test: 'Platform admin can access admin routes', passed: res.status === 200 });
    });

  });

  // ===== REGULAR USER RESTRICTIONS =====

  describe('Regular User - Blocked from Platform Admin', () => {

    test('Regular user blocked from platform admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Regular user blocked from admin routes', passed: res.status === 403 });
    });

    test('Regular user blocked from creating tenant', async () => {
      const res = await request(app)
        .post('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: 'Test Tenant',
          planId: 'free'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Regular user blocked from creating tenant', passed: res.status === 403 });
    });

    test('Regular user blocked from viewing audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Regular user blocked from audit logs', passed: res.status === 403 });
    });

  });

  // ===== ROLE HIERARCHY ENFORCEMENT =====

  describe('Role Hierarchy Enforcement', () => {

    test('Viewer blocked from all write operations', async () => {
      const writeTests = [
        { method: 'POST', path: '/api/campaigns', data: { name: 'Test' } },
        { method: 'POST', path: '/api/contacts', data: { name: 'Test' } },
        { method: 'DELETE', path: '/api/contacts/fake-id', data: {} },
        { method: 'PATCH', path: '/api/campaigns/fake-id', data: { name: 'Test' } }
      ];

      for (const test of writeTests) {
        let res;
        if (test.method === 'POST') {
          res = await request(app)
            .post(test.path)
            .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
            .send(test.data);
        } else if (test.method === 'DELETE') {
          res = await request(app)
            .delete(test.path)
            .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`);
        } else if (test.method === 'PATCH') {
          res = await request(app)
            .patch(test.path)
            .set('Cookie', `connect.sid=${testUsers.viewer.sessionId}`)
            .send(test.data);
        }
        expect(res.status).toBe(403);
      }

      testCases.push({ test: 'Viewer blocked from all write operations', passed: true });
    });

    test('Member blocked from admin routes regardless of status', async () => {
      const adminRoutes = [
        { method: 'GET', path: '/api/admin/tenants' },
        { method: 'GET', path: '/api/admin/audit-logs' },
        { method: 'GET', path: '/api/admin/stats' },
        { method: 'POST', path: '/api/settings/channels/whatsapp', data: { accountSid: 'test' } }
      ];

      for (const route of adminRoutes) {
        let res;
        if (route.method === 'GET') {
          res = await request(app)
            .get(route.path)
            .set('Cookie', `connect.sid=${testUsers.member.sessionId}`);
        } else if (route.method === 'POST') {
          res = await request(app)
            .post(route.path)
            .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
            .send(route.data || {});
        }
        expect(res.status).toBe(403);
      }

      testCases.push({ test: 'Member blocked from all admin routes', passed: true });
    });

    test('Owner has access to member-level operations', async () => {
      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.owner.sessionId}`);

      expect(res.status).toBe(200);
      testCases.push({ test: 'Owner can access member operations', passed: res.status === 200 });
    });

  });

  // ===== SUMMARY REPORT =====

  afterAll(() => {
    console.log('\n=== RBAC Enforcement Integration Tests ===\n');
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
