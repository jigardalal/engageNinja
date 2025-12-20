/**
 * Phase 4: Platform Admin System Testing
 * Tests all platform admin routes and access controls
 * Verifies platform admins can manage tenants, users, and view audit logs
 */

const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let app;
let db;

// Test users
const testUsers = {
  platformAdmin: null,
  regularUser: null,
  tenant1Owner: null
};

// Test data
const testData = {
  demoTenantId: null,
  newTenantId: null
};

const testCases = [];

describe('Phase 4: Platform Admin System', () => {

  beforeAll(async () => {
    // Initialize app with test database
    process.env.DATABASE_PATH = 'database.test.sqlite';
    app = require('../../src/index');

    // Setup database
    const dbPath = path.join(__dirname, '../../database.test.sqlite');
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    // Get test user IDs and session setup
    const platformAdminUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('platform.admin@engageninja.local');

    const regularUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('member@engageninja.local');

    const ownerUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get('admin@engageninja.local');

    const demoTenant = db.prepare(
      'SELECT id FROM tenants WHERE name = ?'
    ).get('Demo Tenant');

    testUsers.platformAdmin = { id: platformAdminUser?.id };
    testUsers.regularUser = { id: regularUser?.id };
    testUsers.tenant1Owner = { id: ownerUser?.id };
    testData.demoTenantId = demoTenant?.id;

    // Create sessions for test users
    if (testUsers.platformAdmin.id) {
      testUsers.platformAdmin.sessionId = uuidv4();
      db.prepare(`
        INSERT INTO sessions (session_id, user_id, expires_at)
        VALUES (?, ?, datetime('now', '+24 hours'))
      `).run(testUsers.platformAdmin.sessionId, testUsers.platformAdmin.id);
    }

    if (testUsers.regularUser.id) {
      testUsers.regularUser.sessionId = uuidv4();
      db.prepare(`
        INSERT INTO sessions (session_id, user_id, expires_at)
        VALUES (?, ?, datetime('now', '+24 hours'))
      `).run(testUsers.regularUser.sessionId, testUsers.regularUser.id);
    }

    if (testUsers.tenant1Owner.id) {
      testUsers.tenant1Owner.sessionId = uuidv4();
      db.prepare(`
        INSERT INTO sessions (session_id, user_id, expires_at)
        VALUES (?, ?, datetime('now', '+24 hours'))
      `).run(testUsers.tenant1Owner.sessionId, testUsers.tenant1Owner.id);
    }
  });

  afterAll(async () => {
    if (db) db.close();
  });

  // ===== TENANT LISTING & VIEWING =====

  describe('Tenant Management - Listing & Viewing', () => {

    test('Platform admin can view all tenants', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeDefined();
      expect(Array.isArray(res.body.tenants)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      testCases.push({ test: 'Platform admin can view all tenants', passed: res.status === 200 });
    });

    test('Regular user cannot view all tenants', async () => {
      const res = await request(app)
        .get('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.regularUser.sessionId}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      testCases.push({ test: 'Regular user blocked from tenant list', passed: res.status === 403 });
    });

    test('Platform admin can filter tenants by status', async () => {
      const res = await request(app)
        .get('/api/admin/tenants?status=active')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeDefined();
      testCases.push({ test: 'Tenant filtering by status works', passed: res.status === 200 });
    });

    test('Platform admin can search tenants', async () => {
      const res = await request(app)
        .get('/api/admin/tenants?search=Demo')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeDefined();
      testCases.push({ test: 'Tenant search works', passed: res.status === 200 });
    });

    test('Platform admin can paginate tenants', async () => {
      const res = await request(app)
        .get('/api/admin/tenants?limit=10&offset=0')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(10);
      testCases.push({ test: 'Tenant pagination works', passed: res.status === 200 });
    });

    test('Platform admin can view tenant details', async () => {
      if (!testData.demoTenantId) {
        console.log('⊘ Skipping: No demo tenant found');
        return;
      }

      const res = await request(app)
        .get(`/api/admin/tenants/${testData.demoTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.tenant).toBeDefined();
      expect(res.body.tenant.id).toBe(testData.demoTenantId);
      testCases.push({ test: 'Platform admin can view tenant details', passed: res.status === 200 });
    });

    test('Platform admin gets 404 for non-existent tenant', async () => {
      const res = await request(app)
        .get(`/api/admin/tenants/${uuidv4()}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(404);
      testCases.push({ test: 'Non-existent tenant returns 404', passed: res.status === 404 });
    });

  });

  // ===== TENANT CREATION =====

  describe('Tenant Management - Creation', () => {

    test('Platform admin can create tenant', async () => {
      const res = await request(app)
        .post('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`)
        .send({
          name: `Test Tenant ${Date.now()}`,
          planId: 'free'
        });

      expect(res.status).toBe(201);
      expect(res.body.tenant).toBeDefined();
      expect(res.body.tenant.id).toBeDefined();
      testData.newTenantId = res.body.tenant.id;
      testCases.push({ test: 'Platform admin can create tenant', passed: res.status === 201 });
    });

    test('Regular user cannot create tenant', async () => {
      const res = await request(app)
        .post('/api/admin/tenants')
        .set('Cookie', `connect.sid=${testUsers.regularUser.sessionId}`)
        .send({
          name: `Test Tenant ${Date.now()}`,
          planId: 'free'
        });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Regular user blocked from creating tenant', passed: res.status === 403 });
    });

    test('Tenant created with correct default status', async () => {
      if (!testData.newTenantId) {
        console.log('⊘ Skipping: No new tenant to check');
        return;
      }

      const res = await request(app)
        .get(`/api/admin/tenants/${testData.newTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.tenant.status).toBe('active');
      testCases.push({ test: 'New tenant created with active status', passed: res.body.tenant.status === 'active' });
    });

  });

  // ===== TENANT STATUS UPDATES =====

  describe('Tenant Management - Status Updates', () => {

    test('Platform admin can suspend tenant', async () => {
      if (!testData.demoTenantId) {
        console.log('⊘ Skipping: No demo tenant found');
        return;
      }

      const res = await request(app)
        .patch(`/api/admin/tenants/${testData.demoTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Platform admin can suspend tenant', passed: res.status === 200 });

      // Verify status changed
      const checkRes = await request(app)
        .get(`/api/admin/tenants/${testData.demoTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(checkRes.body.tenant.status).toBe('suspended');
    });

    test('Platform admin can reactivate suspended tenant', async () => {
      if (!testData.demoTenantId) {
        console.log('⊘ Skipping: No demo tenant found');
        return;
      }

      const res = await request(app)
        .patch(`/api/admin/tenants/${testData.demoTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`)
        .send({ status: 'active' });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Platform admin can reactivate tenant', passed: res.status === 200 });
    });

    test('Platform admin can archive tenant', async () => {
      if (!testData.newTenantId) {
        console.log('⊘ Skipping: No new tenant to archive');
        return;
      }

      const res = await request(app)
        .patch(`/api/admin/tenants/${testData.newTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`)
        .send({ status: 'archived' });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Platform admin can archive tenant', passed: res.status === 200 });
    });

    test('Regular user cannot update tenant status', async () => {
      if (!testData.demoTenantId) {
        console.log('⊘ Skipping: No demo tenant found');
        return;
      }

      const res = await request(app)
        .patch(`/api/admin/tenants/${testData.demoTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.regularUser.sessionId}`)
        .send({ status: 'suspended' });

      expect(res.status).toBe(403);
      testCases.push({ test: 'Regular user blocked from updating tenant status', passed: res.status === 403 });
    });

  });

  // ===== AUDIT LOG VIEWING =====

  describe('Audit Log Management', () => {

    test('Platform admin can view audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      testCases.push({ test: 'Platform admin can view audit logs', passed: res.status === 200 });
    });

    test('Regular user cannot view audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', `connect.sid=${testUsers.regularUser.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Regular user blocked from audit logs', passed: res.status === 403 });
    });

    test('Platform admin can filter audit logs by action', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs?action=tenant.create')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      testCases.push({ test: 'Audit log filtering by action works', passed: res.status === 200 });
    });

    test('Platform admin can filter audit logs by tenant', async () => {
      if (!testData.demoTenantId) {
        console.log('⊘ Skipping: No demo tenant found');
        return;
      }

      const res = await request(app)
        .get(`/api/admin/audit-logs?tenantId=${testData.demoTenantId}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      testCases.push({ test: 'Audit log filtering by tenant works', passed: res.status === 200 });
    });

    test('Platform admin can filter audit logs by user', async () => {
      if (!testUsers.platformAdmin.id) {
        console.log('⊘ Skipping: No platform admin user');
        return;
      }

      const res = await request(app)
        .get(`/api/admin/audit-logs?userId=${testUsers.platformAdmin.id}`)
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      testCases.push({ test: 'Audit log filtering by user works', passed: res.status === 200 });
    });

    test('Platform admin can paginate audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs?limit=20&offset=0')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      testCases.push({ test: 'Audit log pagination works', passed: res.status === 200 });
    });

  });

  // ===== AUDIT LOG STATISTICS =====

  describe('Audit Log Statistics', () => {

    test('Platform admin can view audit statistics', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs/stats')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      testCases.push({ test: 'Platform admin can view audit stats', passed: res.status === 200 });
    });

    test('Audit stats include required fields', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs/stats')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      if (res.status === 200 && res.body.summary) {
        expect(res.body.summary.total_logs).toBeDefined();
        expect(res.body.summary.platform_actions).toBeDefined();
        expect(res.body.summary.tenant_actions).toBeDefined();
        testCases.push({ test: 'Audit stats have required fields', passed: true });
      }
    });

  });

  // ===== STATS & METRICS =====

  describe('Platform Stats & Metrics', () => {

    test('Platform admin can view platform stats', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', `connect.sid=${testUsers.platformAdmin.sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeDefined();
      expect(res.body.users).toBeDefined();
      testCases.push({ test: 'Platform admin can view platform stats', passed: res.status === 200 });
    });

    test('Regular user cannot view platform stats', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', `connect.sid=${testUsers.regularUser.sessionId}`);

      expect(res.status).toBe(403);
      testCases.push({ test: 'Regular user blocked from platform stats', passed: res.status === 403 });
    });

  });

  // ===== SUMMARY REPORT =====

  afterAll(() => {
    console.log('\n=== Phase 4: Platform Admin System Tests ===\n');
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
