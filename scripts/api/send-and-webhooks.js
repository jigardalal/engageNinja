/**
 * API test: send path validation + webhook signature enforcement + AI endpoint placeholder
 *
 * This intentionally exercises:
 * - Campaign send validation (fails cleanly when channel not configured)
 * - WhatsApp webhook rejects missing/invalid signature
 * - Email webhook rejects missing signature
 * - AI generation endpoint (expected 404/501 placeholder)
 *
 * Backend must be running at localhost:5173
 */

const http = require('http');

let sessionCookie = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
        ...headers
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
        if (sessionMatch) sessionCookie = sessionMatch.split(';')[0];
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('🧪 API send/webhook/ai checks');
  try {
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });
    if (loginRes.status !== 200) throw new Error('Login failed');

    // Create a draft campaign (whatsapp)
    const createRes = await request('POST', '/api/campaigns', {
      name: `SendTest ${Date.now()}`,
      channel: 'whatsapp',
      message_content: 'Hello {{name}}',
      audience_filters: {},
      status: 'draft'
    });
    if (createRes.status !== 201) throw new Error('Campaign create failed');
    const campaignId = createRes.data?.data?.campaign_id || createRes.data?.data?.id;

    // Attempt send -> expect 400 because WhatsApp not configured in test env
    const sendRes = await request('POST', `/api/campaigns/${campaignId}/send`);
    if (sendRes.status !== 400) throw new Error(`Send path should fail when not configured (got ${sendRes.status})`);
    console.log('✅ Send path validation surfaced as expected');

    // WhatsApp webhook should reject missing signature
    const waWebhook = await request('POST', '/webhooks/whatsapp', { test: true }, {});
    if (![400, 403].includes(waWebhook.status)) throw new Error('WhatsApp webhook did not reject missing signature');
    console.log('✅ WhatsApp webhook signature enforcement observed');

    // Email webhook should reject missing signature
    const emailWebhook = await request('POST', '/webhooks/email', { Message: '{}' }, {});
    if (![400, 403].includes(emailWebhook.status)) throw new Error('Email webhook did not reject missing signature');
    console.log('✅ Email webhook signature enforcement observed');

    // AI generation endpoint placeholder (expect 404/501)
    const aiRes = await request('POST', '/api/ai/generate', { prompt: 'test' });
    if (![404, 501].includes(aiRes.status)) throw new Error('AI endpoint did not respond as expected placeholder');
    console.log('✅ AI generation endpoint responds (placeholder) as expected');

    console.log('\n✅ API send/webhook/ai checks passed');
    process.exit(0);
  } catch (err) {
    console.error('❌ API check failed:', err.message);
    process.exit(1);
  }
}

run();
