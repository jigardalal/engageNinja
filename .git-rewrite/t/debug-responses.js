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
  // Login
  await makeRequest('POST', '/api/auth/login', {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  });

  console.log('Testing GET /api/contacts/:id\n');
  const contactDetailRes = await makeRequest('GET', '/api/contacts/afe9b773-c702-40cb-b40b-fd5c160a9d3f');
  console.log('Status:', contactDetailRes.status);
  console.log('Response:', JSON.stringify(contactDetailRes.data, null, 2));

  console.log('\n\nTesting GET /api/campaigns/:id\n');
  const campaignDetailRes = await makeRequest('GET', '/api/campaigns/undefined');
  console.log('Status:', campaignDetailRes.status);
  console.log('Response:', JSON.stringify(campaignDetailRes.data, null, 2));
}

test().catch(console.error);
