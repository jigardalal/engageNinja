const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Quick Verification Tests\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const health = await makeRequest('GET', '/health');
    if (health.status === 200) {
      console.log('   ✅ Health check passed');
    } else {
      console.log(`   ❌ Health check failed: ${health.status}`);
    }

    // Test 2: Login
    console.log('\n2️⃣  Testing login...');
    const login = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });
    if (login.status === 200 && login.data.message === 'Login successful') {
      console.log('   ✅ Login passed');
    } else {
      console.log(`   ❌ Login failed: ${login.status} - ${JSON.stringify(login.data)}`);
    }

    // Test 3: List contacts
    console.log('\n3️⃣  Testing list contacts...');
    const contacts = await makeRequest('GET', '/api/contacts');
    if (contacts.status === 200 && Array.isArray(contacts.data.data)) {
      console.log(`   ✅ List contacts passed (${contacts.data.data.length} contacts)`);
    } else {
      console.log(`   ❌ List contacts failed: ${contacts.status} - ${JSON.stringify(contacts.data)}`);
    }

    // Test 4: List campaigns
    console.log('\n4️⃣  Testing list campaigns...');
    const campaigns = await makeRequest('GET', '/api/campaigns');
    if (campaigns.status === 200 && Array.isArray(campaigns.data.data)) {
      console.log(`   ✅ List campaigns passed (${campaigns.data.data.length} campaigns)`);
    } else {
      console.log(`   ❌ List campaigns failed: ${campaigns.status} - ${JSON.stringify(campaigns.data)}`);
    }

    console.log('\n✅ All basic tests completed!');
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

runTests();
