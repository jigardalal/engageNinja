/**
 * Integration test: tenant tag CRUD and role gating
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5054';
const BASE_URL = `http://localhost:${TEST_PORT}`;

const OWNER_EMAIL = 'admin@engageninja.local';
const OWNER_PASSWORD = 'AdminPassword123';
const MEMBER_EMAIL = 'member@engageninja.local';
const MEMBER_PASSWORD = 'MemberPassword123';
const VIEWER_EMAIL = 'viewer@engageninja.local';
const VIEWER_PASSWORD = 'ViewerPassword123';

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

const login = async (email, password) => {
  const res = await makeRequest('POST', '/api/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}`);
  }
  const cookies = res.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
  return { cookies, body: res.data };
};

async function run() {
  console.log('🧪 Testing tenant tag CRUD and gating\n');
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
    const { cookies: ownerCookies } = await login(OWNER_EMAIL, OWNER_PASSWORD);

    // Create tag
    const name = `tenant-tag-${Date.now()}`;
    const createRes = await makeRequest('POST', '/api/contacts/tags', { name }, ownerCookies);
    if (createRes.status !== 201) {
      throw new Error('Admin/owner could not create tag');
    }
    const tagId = createRes.data.id;

    // Rename tag
    const renamed = `${name}-renamed`;
    const renameRes = await makeRequest('PATCH', `/api/contacts/tags/${tagId}`, { name: renamed }, ownerCookies);
    if (renameRes.status !== 200 || renameRes.data?.name !== renamed) {
      throw new Error('Admin/owner could not rename tag');
    }

    // Archive tag
    const archiveRes = await makeRequest('PATCH', `/api/contacts/tags/${tagId}`, { status: 'archived' }, ownerCookies);
    if (archiveRes.status !== 200 || archiveRes.data?.status !== 'archived') {
      throw new Error('Admin/owner could not archive tag');
    }

    // Active list should exclude archived
    const activeList = await makeRequest('GET', '/api/contacts/tags/list', null, ownerCookies);
    const activeNames = (activeList.data?.data || []).map(t => t.name);
    if (activeNames.includes(renamed)) {
      throw new Error('Archived tag appeared in active list');
    }

    // include_archived should return archived tag
    const allList = await makeRequest('GET', '/api/contacts/tags/list?include_archived=1', null, ownerCookies);
    const archivedTag = (allList.data?.data || []).find(t => t.id === tagId);
    if (!archivedTag || archivedTag.status !== 'archived') {
      throw new Error('Archived tag missing from include_archived list');
    }

    // Member cannot create
    const { cookies: memberCookies } = await login(MEMBER_EMAIL, MEMBER_PASSWORD);
    const memberCreate = await makeRequest('POST', '/api/contacts/tags', { name: 'member-blocked' }, memberCookies);
    if (memberCreate.status !== 403) {
      throw new Error('Member should not be able to manage tags');
    }

    // Viewer cannot update
    const { cookies: viewerCookies } = await login(VIEWER_EMAIL, VIEWER_PASSWORD);
    const viewerUpdate = await makeRequest('PATCH', `/api/contacts/tags/${tagId}`, { status: 'active' }, viewerCookies);
    if (viewerUpdate.status !== 403) {
      throw new Error('Viewer should not be able to manage tags');
    }

    console.log('✅ Tenant tag CRUD + gating verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
