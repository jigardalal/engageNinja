/**
 * Integration test: platform admin can switch into any tenant (membership auto-added)
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5058';
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
  console.log('🧪 Testing platform admin tenant switch\n');
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
    const currentTenantIds = new Set((login.data?.tenants || []).map(t => t.tenant_id));

    // Find a tenant the admin is not explicitly a member of
    const tenantsRes = await makeRequest('GET', '/api/admin/tenants?limit=50', null, cookies);
    const target = (tenantsRes.data?.tenants || []).find(t => !currentTenantIds.has(t.id));
    if (!target) throw new Error('No unassigned tenant found for switch test');

    // Switch tenant
    const switchRes = await makeRequest('POST', '/api/auth/switch-tenant', { tenantId: target.id }, cookies);
    if (switchRes.status !== 200) throw new Error(`Switch failed (${switchRes.status})`);
    if (switchRes.data?.active_tenant_id !== target.id) {
      throw new Error('Active tenant not set after switch');
    }

    const tenantEntry = (switchRes.data?.tenants || []).find(t => t.tenant_id === target.id);
    if (!tenantEntry || tenantEntry.role !== 'admin') {
      throw new Error('Tenant membership not created for platform admin');
    }

    console.log('✅ Platform admin tenant switch verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
