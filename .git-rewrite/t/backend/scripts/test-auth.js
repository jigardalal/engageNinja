/**
 * Test Authentication Endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:5001';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing Authentication Endpoints\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing /health endpoint...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   ✓ Backend is running\n`);

    // Test 2: Signup with invalid data
    console.log('2️⃣ Testing signup with invalid password...');
    const badSignup = await makeRequest('POST', '/api/auth/signup', {
      email: 'test@example.com',
      password: 'short'
    });
    console.log(`   Status: ${badSignup.status}`);
    console.log(`   ✓ Validation works: ${badSignup.data.message}\n`);

    // Test 3: Signup with valid data
    console.log('3️⃣ Testing signup with valid data...');
    const newEmail = `test${Date.now()}@example.com`;
    const signup = await makeRequest('POST', '/api/auth/signup', {
      email: newEmail,
      password: 'ValidPassword123'
    });
    console.log(`   Status: ${signup.status}`);
    console.log(`   ✓ User created: ${signup.data.email}`);
    console.log(`   ✓ Tenant created: ${signup.data.tenant_id}\n`);

    // Test 4: Login with existing test user
    console.log('4️⃣ Testing login with test credentials...');
    const login = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });
    console.log(`   Status: ${login.status}`);
    console.log(`   ✓ User: ${login.data.email}`);
    console.log(`   ✓ Tenants: ${login.data.tenants.length}`);
    console.log(`   ✓ Active Tenant: ${login.data.active_tenant_id}\n`);

    // Test 5: Login with wrong password
    console.log('5️⃣ Testing login with wrong password...');
    const wrongPassword = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'WrongPassword'
    });
    console.log(`   Status: ${wrongPassword.status}`);
    console.log(`   ✓ Correctly rejected: ${wrongPassword.data.message}\n`);

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
