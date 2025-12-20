/**
 * Integration test: user profile update (name/first/last/phone/timezone)
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = process.env.TEST_PORT || '5052';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const EMAIL = 'user@engageninja.local';
const PASSWORD = 'UserPassword123';

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
  console.log('🧪 Testing auth profile update\n');
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
    const login = await makeRequest('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
    if (login.status !== 200) throw new Error('Login failed');
    const cookies = login.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    const payload = {
      name: 'Updated User',
      first_name: 'Updated',
      last_name: 'User',
      phone: '+19999999999',
      timezone: 'UTC'
    };
    const update = await makeRequest('PUT', '/api/auth/profile', payload, cookies);
    if (update.status !== 200) throw new Error('Update failed');
    const me = await makeRequest('GET', '/api/auth/me', null, cookies);
    if (me.data.name !== payload.name || me.data.first_name !== payload.first_name || me.data.phone !== payload.phone) {
      throw new Error('Profile fields not persisted');
    }
    console.log('✅ Auth profile update verified');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.kill('SIGINT');
  }
}

run();
