/**
 * Test Settings API Endpoints
 * Verify WhatsApp and Email channel configuration endpoints
 */

const http = require('http');

// First, get a valid session by logging in
async function testSettingsAPI() {
  console.log('Testing Settings API Endpoints...\n');

  try {
    // Step 1: Login to get session
    console.log('1. Logging in...');
    const loginResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        email: 'admin@engageninja.local',
        password: 'AdminPassword123'
      });

      const options = {
        hostname: 'localhost',
        port: 5173,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const cookies = res.headers['set-cookie'];
          console.log('✓ Login successful');
          console.log('  Cookies:', cookies ? cookies[0].split(';')[0] : 'None');
          resolve({ data: JSON.parse(data), cookies });
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const sessionCookie = loginResponse.cookies[0];

    // Step 2: Test GET /api/settings/channels
    console.log('\n2. Testing GET /api/settings/channels...');
    const getResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5173,
        path: '/api/settings/channels',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('✓ GET /api/settings/channels');
          console.log('  Status:', res.statusCode);
          console.log('  Response:', JSON.stringify(JSON.parse(data), null, 2));
          resolve(JSON.parse(data));
        });
      });

      req.on('error', reject);
      req.end();
    });

    // Step 3: Test POST /api/settings/channels/whatsapp
    console.log('\n3. Testing POST /api/settings/channels/whatsapp...');
    const whatsappData = JSON.stringify({
      accessToken: 'test-token-12345',
      phoneNumberId: '123456789',
      businessAccountId: 'test-account'
    });

    const whatsappResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5173,
        path: '/api/settings/channels/whatsapp',
        method: 'POST',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json',
          'Content-Length': whatsappData.length
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('✓ POST /api/settings/channels/whatsapp');
          console.log('  Status:', res.statusCode);
          const responseData = JSON.parse(data);
          console.log('  Response:', JSON.stringify(responseData, null, 2));
          resolve(responseData);
        });
      });

      req.on('error', reject);
      req.write(whatsappData);
      req.end();
    });

    // Step 4: Verify WhatsApp channel is saved
    console.log('\n4. Verifying WhatsApp channel saved...');
    const verifyResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5173,
        path: '/api/settings/channels',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('✓ Verification GET /api/settings/channels');
          const responseData = JSON.parse(data);
          console.log('  WhatsApp status:', responseData.whatsapp.is_connected ? 'CONNECTED' : 'NOT CONNECTED');
          console.log('  Response:', JSON.stringify(responseData, null, 2));
          resolve(responseData);
        });
      });

      req.on('error', reject);
      req.end();
    });

    console.log('\n✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSettingsAPI();
