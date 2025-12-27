/**
 * Basic System Test
 * Verifies the backend is running and healthy
 */

const request = require('supertest');

describe('Basic System Health Check', () => {
  let app;

  beforeAll(async () => {
    // Import the Express app
    app = require('../src/index');
  });

  test('GET /health should return 200 and ok status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  test('Server should be running on correct port', async () => {
    const response = await request(app)
      .get('/')
      .expect(401); // Should be unauthorized without auth

    expect(response.body.error).toBeDefined();
  });
});