/**
 * Integration test: admin stats endpoint returns summary metrics
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5056';
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
  console.log('🧪 Testing admin stats endpoint\n');
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

    const statsRes = await makeRequest('GET', '/api/admin/stats', null, cookies);
    if (statsRes.status !== 200) throw new Error('Stats endpoint failed');

    const required = ['tenants', 'active_tenants', 'users', 'active_users', 'platform_admins', 'campaigns', 'contacts', 'whatsapp_messages_sent', 'email_messages_sent'];
    for (const key of required) {
      if (typeof statsRes.data?.[key] !== 'number') {
        throw new Error(`Missing or invalid stat: ${key}`);
      }
    }

    console.log('✅ Admin stats verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
