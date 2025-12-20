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

async function test() {
  console.log('🧪 Testing Campaign Metrics API\n');

  // Login
  await makeRequest('POST', '/api/auth/login', {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  });

  // Create a campaign
  console.log('1. Creating test campaign...');
  const createRes = await makeRequest('POST', '/api/campaigns', {
    name: 'Metrics Test Campaign',
    description: 'Test campaign for metrics',
    channel: 'whatsapp',
    template_id: null,
    audience_filters: JSON.stringify({}),
    message_content: 'Hello {{name}}',
    status: 'draft'
  });

  const campaignId = createRes.data.data?.id;
  console.log(`✅ Campaign created: ${campaignId}\n`);

  // Test metrics for draft campaign (should have no messages)
  console.log('2. Testing metrics for draft campaign...');
  const metricsRes = await makeRequest('GET', `/api/campaigns/${campaignId}/metrics`);
  console.log(`Status: ${metricsRes.status}`);
  console.log('Response:', JSON.stringify(metricsRes.data, null, 2));

  // Send the campaign
  console.log('\n3. Sending campaign...');
  const sendRes = await makeRequest('POST', `/api/campaigns/${campaignId}/send`);
  console.log(`Send status: ${sendRes.status}`);
  console.log(`Campaign status after send: ${sendRes.data.campaign?.status}`);

  // Test metrics after send
  console.log('\n4. Testing metrics after send...');
  const metricsRes2 = await makeRequest('GET', `/api/campaigns/${campaignId}/metrics`);
  console.log(`Status: ${metricsRes2.status}`);
  console.log('Metrics:', JSON.stringify(metricsRes2.data, null, 2));
}

test().catch(console.error);
