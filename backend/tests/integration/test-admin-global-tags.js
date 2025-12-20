/**
 * Integration test: Admin global tags CRUD
 * Requires backend server running on BACKEND_PORT (default 5173)
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5050';
const BASE_URL = process.env.BASE_URL || `http://localhost:${TEST_PORT}`;
const ADMIN_EMAIL = 'platform.admin@engageninja.local';
const ADMIN_PASSWORD = 'PlatformAdminPassword123';

const makeRequest = (method, path, body = null, cookies = '') => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
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
  console.log('🧪 Testing admin global tags endpoints\n');
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
    server.stderr.on('data', (data) => {
      if (data.toString().includes('Error')) {
        clearTimeout(timeout);
        reject(new Error(data.toString()));
      }
    });
    server.on('exit', (code) => reject(new Error(`Server exited early with code ${code}`)));
  });

  try {
    // Login to obtain session cookie
    const login = await makeRequest('POST', '/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    if (login.status !== 200) {
      throw new Error(`Login failed (${login.status}) ${JSON.stringify(login.data)}`);
    }
    const cookies = login.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    if (!cookies) throw new Error('No session cookie received');

    // Create global tag
    const name = `api-tag-${Date.now()}`;
    const create = await makeRequest('POST', '/api/admin/global-tags', { name }, cookies);
    if (create.status !== 201) {
      throw new Error(`Create failed (${create.status}) ${JSON.stringify(create.data)}`);
    }

    // Update status to archived
    const tagId = create.data.id;
    const patch = await makeRequest('PATCH', `/api/admin/global-tags/${tagId}`, { status: 'archived' }, cookies);
    if (patch.status !== 200) {
      throw new Error(`Patch failed (${patch.status}) ${JSON.stringify(patch.data)}`);
    }

    // Verify list contains archived tag
    const list = await makeRequest('GET', '/api/admin/global-tags', null, cookies);
    const found = (list.data.tags || []).find(t => t.id === tagId && t.status === 'archived');
    if (!found) {
      throw new Error('Updated tag not found in list');
    }

    console.log('✅ Admin global tags endpoints verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
