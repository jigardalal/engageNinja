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
  // Login first
  await makeRequest('POST', '/api/auth/login', {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  });

  // Test endpoints that failed
  console.log('\n📋 Testing /api/tags:');
  const tagsRes = await makeRequest('GET', '/api/tags');
  console.log(`Status: ${tagsRes.status}`);
  console.log('Response:', JSON.stringify(tagsRes.data, null, 2));

  console.log('\n📋 Testing /api/campaigns:');
  const campaignsRes = await makeRequest('GET', '/api/campaigns');
  console.log(`Status: ${campaignsRes.status}`);
  console.log('Response:', JSON.stringify(campaignsRes.data, null, 2).substring(0, 500));

  console.log('\n📋 Testing /api/plans:');
  const plansRes = await makeRequest('GET', '/api/plans');
  console.log(`Status: ${plansRes.status}`);
  console.log('Response:', JSON.stringify(plansRes.data, null, 2));
}

test().catch(console.error);
