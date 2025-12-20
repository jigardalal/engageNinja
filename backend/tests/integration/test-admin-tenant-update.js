/**
 * Integration test: Admin tenant update (name + address/contact)
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5051';
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
      res.on('data', chunk => { data += chunk; });
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
  console.log('🧪 Testing admin tenant update\n');
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

    const tenants = await makeRequest('GET', '/api/admin/tenants?limit=1', null, cookies);
    const tenantId = tenants.data.tenants?.[0]?.id;
    if (!tenantId) throw new Error('No tenant found');

    const payload = {
      name: 'Demo Tenant Updated',
      legal_name: 'Demo Legal Inc.',
      address_line1: '123 Main',
      city: 'Metropolis',
      country: 'US',
      timezone: 'America/New_York',
      billing_email: 'billing@example.com',
      support_email: 'support@example.com'
    };
    const patch = await makeRequest('PATCH', `/api/admin/tenants/${tenantId}`, payload, cookies);
    if (patch.status !== 200) throw new Error(`Patch failed ${patch.status}`);

    const detail = await makeRequest('GET', `/api/admin/tenants/${tenantId}`, null, cookies);
    const t = detail.data.tenant;
    if (t.name !== payload.name || t.city !== payload.city || t.billing_email !== payload.billing_email) {
      throw new Error('Updated tenant fields did not persist');
    }
    console.log('✅ Admin tenant update verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
