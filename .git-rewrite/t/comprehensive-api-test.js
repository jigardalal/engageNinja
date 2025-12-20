const http = require('http');

let sessionCookie = '';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    };

    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let data = '';

      // Capture session cookie if present
      if (res.headers['set-cookie']) {
        const cookies = res.headers['set-cookie'];
        const sessionMatch = cookies.find(c => c.includes('connect.sid'));
        if (sessionMatch) {
          sessionCookie = sessionMatch.split(';')[0];
        }
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
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

async function runTests() {
  console.log('🧪 Running Comprehensive API Tests\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  try {
    console.log('1️⃣  Testing Health Check...');
    const res = await makeRequest('GET', '/health');
    if (res.status === 200 && res.data.status === 'ok') {
      console.log('   ✅ PASS: Health check working\n');
      passed++;
    } else {
      console.log('   ❌ FAIL: Health check failed\n');
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
    failed++;
  }

  // Test 2: Login
  try {
    console.log('2️⃣  Testing Login...');
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });
    if (res.status === 200 && res.data.user_id) {
      console.log('   ✅ PASS: Login successful');
      console.log(`   User: ${res.data.email}, Tenant: ${res.data.tenants[0]?.name}\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Login failed (${res.status}): ${res.data.message}\n`);
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
    failed++;
  }

  // Test 3: Get Contacts List
  try {
    console.log('3️⃣  Testing Get Contacts List...');
    const res = await makeRequest('GET', '/api/contacts');
    if (res.status === 200 && Array.isArray(res.data.contacts)) {
      console.log(`   ✅ PASS: Contacts list retrieved (${res.data.contacts.length} contacts)\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Contacts list failed (${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
    failed++;
  }

  // Test 4: Create Contact
  try {
    console.log('4️⃣  Testing Create Contact...');
    const res = await makeRequest('POST', '/api/contacts', {
      name: 'Test User',
      phone: '+14155552671',
      email: 'testapi@example.com',
      consent_whatsapp: true,
      consent_email: true,
      tags: []
    });
    if (res.status === 201 && res.data.contact_id) {
      console.log(`   ✅ PASS: Contact created (${res.data.contact_id})\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Contact creation failed (${res.status}): ${res.data.message}\n`);
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
    failed++;
  }

  // Test 5: Get Tags
  try {
    console.log('5️⃣  Testing Get Tags...');
    const res = await makeRequest('GET', '/api/tags');
    if (res.status === 200 && Array.isArray(res.data.tags)) {
      console.log(`   ✅ PASS: Tags retrieved (${res.data.tags.length} tags)\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Tags retrieval failed (${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
    failed++;
  }

  // Test 6: Get Campaigns List
  try {
    console.log('6️⃣  Testing Get Campaigns List...');
    const res = await makeRequest('GET', '/api/campaigns');
    if (res.status === 200 && Array.isArray(res.data.campaigns)) {
      console.log(`   ✅ PASS: Campaigns list retrieved (${res.data.campaigns.length} campaigns)\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Campaigns list failed (${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
    failed++;
  }

  // Test 7: Get Plans
  try {
    console.log('7️⃣  Testing Get Plans...');
    const res = await makeRequest('GET', '/api/plans');
    if (res.status === 200 && Array.isArray(res.data.plans)) {
      console.log(`   ✅ PASS: Plans retrieved (${res.data.plans.length} plans)\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Plans retrieval failed (${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ ERROR: ${err.message}\n`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
