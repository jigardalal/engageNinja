/**
 * Webhook Testing Script
 * Tests webhook infrastructure implementation
 */

const http = require('http');

const BASE_URL = 'http://localhost:5173';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (level, msg) => {
  const color = level === 'success' ? colors.green :
                level === 'error' ? colors.red :
                level === 'info' ? colors.blue :
                level === 'test' ? colors.cyan :
                level === 'warn' ? colors.yellow : colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${msg}`);
};

/**
 * Make HTTP request
 */
const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=test-signature'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

/**
 * Test 1: Webhook health check
 */
async function testWebhookHealth() {
  log('test', 'Testing webhook health endpoint...');
  try {
    const response = await makeRequest('GET', '/webhooks/health');

    if (response.status === 200) {
      log('success', 'Webhook health check passed');
      log('info', `Status: ${response.body.webhooks?.whatsapp}, ${response.body.webhooks?.email}`);
      return true;
    } else {
      log('error', `Webhook health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', `Webhook health check error: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: WhatsApp webhook verification
 */
async function testWhatsAppVerification() {
  log('test', 'Testing WhatsApp webhook verification...');
  try {
    const response = await makeRequest('GET', '/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=test-verify-token-whatsapp&hub_challenge=test-challenge-123');

    if (response.status === 200 && response.body === 'test-challenge-123') {
      log('success', 'WhatsApp webhook verification passed');
      return true;
    } else {
      log('error', `WhatsApp verification failed: ${response.status}`);
      log('info', `Response: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    log('error', `WhatsApp verification error: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: WhatsApp webhook status update (without signature verification)
 */
async function testWhatsAppStatusUpdate() {
  log('test', 'Testing WhatsApp webhook status update...');

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: 'test-phone-id'
              },
              statuses: [
                {
                  id: 'test-provider-msg-id-001', // provider_message_id
                  status: 'sent',
                  timestamp: Math.floor(Date.now() / 1000),
                  recipient_id: 'test-recipient-123'
                },
                {
                  id: 'test-provider-msg-id-002',
                  status: 'delivered',
                  timestamp: Math.floor(Date.now() / 1000),
                  recipient_id: 'test-recipient-456'
                }
              ]
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await makeRequest('POST', '/webhooks/whatsapp', payload);

    if (response.status === 200) {
      log('success', 'WhatsApp webhook status update passed');
      log('info', `Processed: ${response.body.processed} status updates`);
      return true;
    } else {
      log('error', `WhatsApp webhook failed: ${response.status}`);
      log('info', `Response: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    log('error', `WhatsApp webhook error: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Email webhook (SES format)
 */
async function testEmailWebhook() {
  log('test', 'Testing Email webhook (SES format)...');

  const payload = {
    Type: 'Notification',
    MessageId: 'test-sns-msg-id',
    TopicArn: 'arn:aws:sns:us-east-1:123456789:test-topic',
    Message: JSON.stringify({
      eventType: 'Delivery',
      mail: {
        messageId: 'test-ses-msg-id-001',
        timestamp: new Date().toISOString(),
        source: 'noreply@engageninja.local',
        destination: ['test@example.com'],
        headers: [],
        commonHeaders: {}
      },
      delivery: {
        timestamp: new Date().toISOString(),
        recipients: ['test@example.com'],
        smtpResponse: '250 2.0.0 OK',
        remoteMtaIp: '192.0.2.1'
      }
    }),
    Timestamp: new Date().toISOString(),
    UnsubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe'
  };

  try {
    const response = await makeRequest('POST', '/webhooks/email', payload);

    if (response.status === 200) {
      log('success', 'Email webhook passed');
      log('info', `Processed: ${response.body.eventType} event`);
      return true;
    } else {
      log('error', `Email webhook failed: ${response.status}`);
      log('info', `Response: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    log('error', `Email webhook error: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Get recent webhook events
 */
async function testWebhookEvents() {
  log('test', 'Testing webhook events endpoint...');
  try {
    const response = await makeRequest('GET', '/webhooks/events?limit=10');

    if (response.status === 200) {
      log('success', 'Webhook events endpoint passed');
      log('info', `Total logged: ${response.body.totalLogged}, Returned: ${response.body.returned}`);
      if (response.body.events.length > 0) {
        log('info', `Latest event: ${response.body.events[response.body.events.length - 1].type}`);
      }
      return true;
    } else {
      log('error', `Webhook events failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', `Webhook events error: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + colors.blue + '═══════════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  EngageNinja Webhook Testing Suite' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════════' + colors.reset + '\n');

  const tests = [
    { name: 'Webhook Health Check', fn: testWebhookHealth },
    { name: 'WhatsApp Verification', fn: testWhatsAppVerification },
    { name: 'WhatsApp Status Update', fn: testWhatsAppStatusUpdate },
    { name: 'Email Webhook', fn: testEmailWebhook },
    { name: 'Webhook Events', fn: testWebhookEvents }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log('error', `Test "${test.name}" crashed: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log(colors.blue + '═══════════════════════════════════════════' + colors.reset);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset} | ${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(colors.blue + '═══════════════════════════════════════════' + colors.reset + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Wait a moment for server to be ready, then run tests
setTimeout(runAllTests, 500);
