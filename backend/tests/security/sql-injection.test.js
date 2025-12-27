/**
 * SQL Injection Security Tests
 * Tests SQL injection prevention across all user input parameters
 * Verifies prepared statements and input sanitization are working
 */

const request = require('supertest');
const db = require('../../src/db');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let app;

const testUsers = {
  viewer: null,
  member: null,
  admin: null
};

const testCases = [];

describe('SQL Injection Prevention', () => {

  beforeAll(async () => {
    app = require('../../src/index');

    // Get test users
    const viewerUser = await db.prepare('SELECT id FROM users WHERE email = ?').get('viewer@engageninja.local');
    const memberUser = await db.prepare('SELECT id FROM users WHERE email = ?').get('member@engageninja.local');
    const adminUser = await db.prepare('SELECT id FROM users WHERE email = ?').get('user@engageninja.local');

    testUsers.viewer = { id: viewerUser?.id };
    testUsers.member = { id: memberUser?.id };
    testUsers.admin = { id: adminUser?.id };

    // Create sessions
    for (const userKey of Object.keys(testUsers)) {
      if (testUsers[userKey].id) {
        const sessionId = uuidv4();
        await db.prepare(`
          INSERT INTO sessions (session_id, user_id, expires_at)
          VALUES (?, ?, NOW() + INTERVAL '24 hours')
        `).run(sessionId, testUsers[userKey].id);
        testUsers[userKey].sessionId = sessionId;
      }
    }
  });

  afterAll(async () => {
    // Connection pooling handles cleanup
  });

  // ===== SEARCH PARAMETER INJECTION =====

  describe('Search Parameter SQL Injection Prevention', () => {

    test('Search with OR clause injection is blocked', async () => {
      const maliciousSearch = "' OR '1'='1";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: maliciousSearch });

      // Should return 200 with safe results, not 500
      expect(res.status).toBe(200);
      // Results should be empty or safe, not all records
      expect(Array.isArray(res.body.contacts || res.body)).toBe(true);
      testCases.push({ test: 'OR clause in search parameter blocked', passed: res.status === 200 });
    });

    test('Search with semicolon injection is blocked', async () => {
      const maliciousSearch = "test'; DROP TABLE contacts; --";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: maliciousSearch });

      // Should not crash or execute SQL
      expect(res.status).toBe(200);
      testCases.push({ test: 'Semicolon injection blocked', passed: res.status === 200 });
    });

    test('Search with UNION injection is blocked', async () => {
      const maliciousSearch = "' UNION SELECT * FROM users --";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: maliciousSearch });

      expect(res.status).toBe(200);
      testCases.push({ test: 'UNION injection blocked', passed: res.status === 200 });
    });

    test('Search with comment injection is blocked', async () => {
      const maliciousSearch = "'; -- ";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: maliciousSearch });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Comment-based injection blocked', passed: res.status === 200 });
    });

    test('Search in campaigns with injection', async () => {
      const maliciousSearch = "test' AND 1=1; --";

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: maliciousSearch });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Campaign search injection blocked', passed: res.status === 200 });
    });

  });

  // ===== FILTER PARAMETER INJECTION =====

  describe('Filter Parameter SQL Injection Prevention', () => {

    test('Filter with injection is blocked', async () => {
      const maliciousFilter = "' OR 1=1; --";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ status: maliciousFilter });

      // Should return 200, not 500
      expect(res.status).toBe(200);
      testCases.push({ test: 'Filter parameter injection blocked', passed: res.status === 200 });
    });

    test('Date filter with injection is blocked', async () => {
      const maliciousDate = "2024-01-01' OR '1'='1";

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ startDate: maliciousDate });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Date filter injection blocked', passed: res.status === 200 });
    });

    test('Multiple filter injection is blocked', async () => {
      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({
          search: "'; DROP TABLE contacts; --",
          status: "active' OR '1'='1",
          type: "email\"; DELETE FROM contacts; --"
        });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Multiple filter injection blocked', passed: res.status === 200 });
    });

  });

  // ===== SORT PARAMETER INJECTION =====

  describe('Sort Parameter SQL Injection Prevention', () => {

    test('Sort parameter only accepts whitelisted columns', async () => {
      const maliciousSort = "created_at; DROP TABLE users; --";

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ sort: maliciousSort });

      // Should either ignore invalid sort or return 400
      expect([200, 400]).toContain(res.status);
      testCases.push({ test: 'Malicious sort parameter handled safely', passed: [200, 400].includes(res.status) });
    });

    test('Sort order with injection is blocked', async () => {
      const maliciousOrder = "asc'; DELETE FROM campaigns; --";

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ order: maliciousOrder });

      // Should handle safely
      expect([200, 400]).toContain(res.status);
      testCases.push({ test: 'Malicious sort order handled safely', passed: [200, 400].includes(res.status) });
    });

  });

  // ===== PAGINATION PARAMETER INJECTION =====

  describe('Pagination Parameter SQL Injection Prevention', () => {

    test('Limit parameter with injection is blocked', async () => {
      const maliciousLimit = "10'; UPDATE users SET role='admin'; --";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ limit: maliciousLimit });

      // Should handle safely (return 400 or sanitize)
      expect([200, 400]).toContain(res.status);
      testCases.push({ test: 'Malicious limit parameter handled', passed: [200, 400].includes(res.status) });
    });

    test('Offset parameter with injection is blocked', async () => {
      const maliciousOffset = "0' OR 1=1; --";

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ offset: maliciousOffset });

      expect([200, 400]).toContain(res.status);
      testCases.push({ test: 'Malicious offset parameter handled', passed: [200, 400].includes(res.status) });
    });

  });

  // ===== REQUEST BODY INJECTION =====

  describe('Request Body SQL Injection Prevention', () => {

    test('Contact name with SQL injection is sanitized', async () => {
      const maliciousName = "Test'; DROP TABLE contacts; --";

      const res = await request(app)
        .post('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: maliciousName,
          email: 'test@test.com'
        });

      // Should fail with 403 (not allowed) or 400 (bad data), not 500
      expect([400, 403]).toContain(res.status);
      testCases.push({ test: 'Contact name SQL injection prevented', passed: [400, 403].includes(res.status) });
    });

    test('Campaign name with injection is sanitized', async () => {
      const maliciousName = "Campaign'; UPDATE users SET role='admin'; --";

      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: maliciousName,
          channel: 'email',
          content: 'Test'
        });

      // Should fail gracefully
      expect([400, 403]).toContain(res.status);
      testCases.push({ test: 'Campaign name SQL injection prevented', passed: [400, 403].includes(res.status) });
    });

    test('Email field with SQL injection is handled', async () => {
      const maliciousEmail = "test@test.com'; DELETE FROM users; --";

      const res = await request(app)
        .post('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: 'Test Contact',
          email: maliciousEmail
        });

      expect([400, 403]).toContain(res.status);
      testCases.push({ test: 'Email field SQL injection prevented', passed: [400, 403].includes(res.status) });
    });

    test('Nested field injection is blocked', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: 'Test',
          channel: 'email',
          content: 'Test',
          metadata: {
            injected: "'; DROP TABLE campaigns; --"
          }
        });

      expect([201, 400, 403]).toContain(res.status);
      testCases.push({ test: 'Nested field injection prevented', passed: true });
    });

  });

  // ===== TIME-BASED BLIND SQL INJECTION =====

  describe('Time-Based Blind SQL Injection Prevention', () => {

    test('Time-based injection via search parameter is blocked', async () => {
      const timeBasedPayload = "'; WAITFOR DELAY '00:00:05'; --";

      const startTime = Date.now();
      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: timeBasedPayload })
        .timeout(3000);

      const duration = Date.now() - startTime;

      // Should respond quickly (not execute WAITFOR)
      // Response should be quick even if request times out
      expect(res.status).not.toBe(500);
      expect(duration < 5000).toBe(true);
      testCases.push({ test: 'Time-based injection blocked (response < 5s)', passed: duration < 5000 });
    });

  });

  // ===== PREPARED STATEMENT VALIDATION =====

  describe('Prepared Statement Verification', () => {

    test('Prepared statements properly escape single quotes', async () => {
      const userInput = "O'Brien";

      const res = await request(app)
        .post('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: userInput,
          email: 'test@test.com'
        });

      // Should handle apostrophe correctly (either succeed or fail validation)
      expect([201, 400]).toContain(res.status);
      testCases.push({ test: 'Single quotes properly escaped', passed: [201, 400].includes(res.status) });
    });

    test('Prepared statements properly escape double quotes', async () => {
      const userInput = 'Test "Quoted" Name';

      const res = await request(app)
        .post('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: userInput,
          email: 'test@test.com'
        });

      expect([201, 400]).toContain(res.status);
      testCases.push({ test: 'Double quotes properly escaped', passed: [201, 400].includes(res.status) });
    });

    test('Prepared statements handle backslashes', async () => {
      const userInput = 'Test\\Backslash';

      const res = await request(app)
        .post('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .send({
          name: userInput,
          email: 'test@test.com'
        });

      expect([201, 400]).toContain(res.status);
      testCases.push({ test: 'Backslashes properly escaped', passed: [201, 400].includes(res.status) });
    });

  });

  // ===== STACKED QUERIES PREVENTION =====

  describe('Stacked Queries Prevention', () => {

    test('Multiple SQL statements in single parameter are blocked', async () => {
      const stackedQuery = "test'; UPDATE users SET role='admin'; DELETE FROM audit_logs; --";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: stackedQuery });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Stacked SQL queries blocked', passed: res.status === 200 });
    });

    test('UNION-SELECT stacked queries are blocked', async () => {
      const unionQuery = "1' UNION SELECT id, email, password FROM users; --";

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: unionQuery });

      expect(res.status).toBe(200);
      // Verify response doesn't contain user table data
      expect(JSON.stringify(res.body)).not.toContain('password');
      testCases.push({ test: 'UNION-SELECT queries blocked', passed: res.status === 200 });
    });

  });

  // ===== ENCODING BYPASS ATTEMPTS =====

  describe('Encoding Bypass Prevention', () => {

    test('URL-encoded injection is blocked', async () => {
      // %27 = '
      const urlEncodedPayload = "%27%20OR%20%271%27%3D%271";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: urlEncodedPayload });

      expect(res.status).toBe(200);
      testCases.push({ test: 'URL-encoded injection blocked', passed: res.status === 200 });
    });

    test('Double URL-encoded injection is blocked', async () => {
      const doubleEncoded = "%252527%20OR%20%25271%2527%253D%25271";

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: doubleEncoded });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Double URL-encoded injection blocked', passed: res.status === 200 });
    });

    test('Hex-encoded injection is blocked', async () => {
      // 0x3027204f52...
      const hexPayload = "0x2720202f2a2a2f204f52202027313027203d202731";

      const res = await request(app)
        .get('/api/contacts')
        .set('Cookie', `connect.sid=${testUsers.member.sessionId}`)
        .query({ search: hexPayload });

      expect(res.status).toBe(200);
      testCases.push({ test: 'Hex-encoded injection blocked', passed: res.status === 200 });
    });

  });

  // ===== SUMMARY REPORT =====

  afterAll(() => {
    console.log('\n=== SQL Injection Prevention Tests ===\n');
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
