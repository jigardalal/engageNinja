/**
 * API test: Campaign metrics SSE stream
 * - Login
 * - Create a draft campaign
 * - Open SSE stream and assert initial data chunk arrives with campaign id
 *
 * Backend must be running at localhost:5173
 */

const http = require('http');

let sessionCookie = '';

function makeRequest(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
        ...extraHeaders
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
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('🧪 API SSE metrics test');
  try {
    // Login
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });
    if (loginRes.status !== 200) throw new Error('Login failed');

    // Create draft campaign
    const createRes = await makeRequest('POST', '/api/campaigns', {
      name: `SSE Test ${Date.now()}`,
      channel: 'whatsapp',
      message_content: 'Hello {{name}}',
      audience_filters: {},
      status: 'draft'
    });
    if (createRes.status !== 201) throw new Error('Failed to create campaign');
    const created = JSON.parse(createRes.data);
    const campaignId = created.data?.campaign_id || created.data?.id;
    if (!campaignId) throw new Error('No campaign id returned');

    // Open SSE stream and read first data event
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5173,
        path: `/api/campaigns/${campaignId}/metrics/stream`,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cookie': sessionCookie
        }
      };
      const req = http.request(options, (res) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const parts = buffer.split('\n\n');
          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const payload = part.replace('data: ', '').trim();
              try {
                const parsed = JSON.parse(payload);
                if (parsed?.campaign?.id === campaignId) {
                  console.log('✅ SSE initial payload received');
                  req.destroy();
                  resolve();
                  return;
                }
              } catch (e) {
                // continue reading
              }
            }
          }
        });
        res.on('end', () => reject(new Error('Stream ended before receiving data')));
      });
      req.on('error', reject);
      req.end();
    });

    console.log('✅ API SSE metrics test passed');
    process.exit(0);
  } catch (err) {
    console.error('❌ API SSE test failed:', err.message);
    process.exit(1);
  }
}

run();
