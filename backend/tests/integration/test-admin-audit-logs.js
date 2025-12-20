/**
 * Integration test: admin audit logs listing with filters
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5057';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const ADMIN_EMAIL = 'platform.admin@engageninja.local';
const ADMIN_PASSWORD = 'PlatformAdminPassword123';

const makeRequest = (method, pathUrl, body = null, cookies = '') => {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies } : {})
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function run() {
  console.log('🧪 Testing admin audit logs with filters\n');
  const server = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, BACKEND_PORT: TEST_PORT, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 8000);
    server.stdout.on('data', (data) => {
      if (data.toString().includes(`http://localhost:${TEST_PORT}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on('exit', (code) => reject(new Error(`Server exited early with code ${code}`)));
  });

  try {
    const login = await makeRequest('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (login.status !== 200) throw new Error('Login failed');
    const cookies = login.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');

    // Create an audit event via config update
    const key = `test_audit_${Date.now()}`;
    const configRes = await makeRequest('PATCH', `/api/admin/config/${key}`, { value: { enabled: true } }, cookies);
    if (configRes.status !== 200) throw new Error(`Failed to write audit log (${configRes.status}): ${JSON.stringify(configRes.data)}`);

    // Fetch logs filtered by action
    const logsRes = await makeRequest('GET', `/api/admin/audit-logs?action=config.update&limit=10`, null, cookies);
    if (logsRes.status !== 200) throw new Error('Audit log list failed');
    const logs = logsRes.data?.logs || [];
    if (!logs.some(l => l.action === 'config.update')) {
      throw new Error('Filtered audit logs missing expected action');
    }

    console.log('✅ Admin audit logs filters verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
