/**
 * Integration test: tenant creation copies active global tags
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5053';
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
  console.log('🧪 Testing tenant tag inheritance\n');
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
    // Login as platform admin
    const login = await makeRequest('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (login.status !== 200) throw new Error('Login failed');
    const cookies = login.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');

    // Create a unique global tag
    const tagName = `inherit-${Date.now()}`;
    const createTag = await makeRequest('POST', '/api/admin/global-tags', { name: tagName }, cookies);
    if (createTag.status !== 201) throw new Error('Failed to create global tag for test');

    // Create tenant
    const tenantName = `InheritanceTenant-${Date.now()}`;
    const createTenant = await makeRequest('POST', '/api/admin/tenants', { name: tenantName }, cookies);
    if (createTenant.status !== 201) throw new Error('Tenant creation failed');
    const tenantId = createTenant.data.tenantId;

    // Fetch tenant tags via contacts tags list endpoint (requires active tenant)
    // Switch tenant session
    await makeRequest('POST', '/api/auth/switch-tenant', { tenantId }, cookies);
    const tags = await makeRequest('GET', '/api/contacts/tags/list', null, cookies);
    const names = (tags.data?.data || []).map(t => t.name);
    if (!names.includes(tagName)) {
      throw new Error('Inherited global tag not found in tenant tags');
    }
    console.log('✅ Tenant tag inheritance verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
