/**
 * Integration test: platform admin can sync global tags into a tenant (non-destructive)
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5055';
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

const login = async () => {
  const res = await makeRequest('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (res.status !== 200) throw new Error('Login failed');
  const cookies = res.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
  return { cookies };
};

async function run() {
  console.log('🧪 Testing admin sync of global tags to tenant\n');
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
    const { cookies } = await login();

    // Create a new global tag to sync
    const tagName = `sync-global-${Date.now()}`;
    const createGlobal = await makeRequest('POST', '/api/admin/global-tags', { name: tagName }, cookies);
    if (createGlobal.status !== 201) throw new Error('Failed to create global tag');

    // Get Demo tenant id
    const tenants = await makeRequest('GET', '/api/admin/tenants?search=Demo', null, cookies);
    const demoTenant = (tenants.data?.tenants || []).find(t => t.name === 'Demo Tenant');
    if (!demoTenant) throw new Error('Demo tenant not found to sync');

    // Sync global tags into tenant
    const syncRes = await makeRequest('POST', `/api/admin/tenants/${demoTenant.id}/sync-global-tags`, null, cookies);
    if (syncRes.status !== 200) throw new Error(`Sync endpoint failed (${syncRes.status})`);
    if (typeof syncRes.data?.added !== 'number' || syncRes.data.added < 1) {
      throw new Error(`Unexpected sync response: ${JSON.stringify(syncRes.data)}`);
    }

    // Switch tenant context and verify tag exists
    const switched = await makeRequest('POST', '/api/auth/switch-tenant', { tenantId: demoTenant.id }, cookies);
    if (switched.status !== 200) throw new Error(`Switch tenant failed (${switched.status}): ${JSON.stringify(switched.data)}`);

    const tenantTags = await makeRequest('GET', `/api/contacts/tags/list?tenant_id=${demoTenant.id}`, null, cookies);
    const names = (tenantTags.data?.data || []).map(t => t.name);
    if (!names.includes(tagName)) {
      throw new Error('Synced tag not found in tenant');
    }

    console.log('✅ Admin global tag sync verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
