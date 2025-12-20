/**
 * Comprehensive Webhook Integration Test
 * Tests webhook infrastructure with actual database operations
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:5173';
const DB_PATH = path.join(__dirname, 'backend/database.sqlite');

// Color codes
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
 * Get database connection
 */
function getDB() {
  try {
    const db = new sqlite3(DB_PATH);
    db.pragma('foreign_keys = ON');
    return db;
  } catch (error) {
    log('error', `Failed to connect to database: ${error.message}`);
    throw error;
  }
}

/**
 * Create test data (tenant, campaign, message)
 */
function createTestData(db) {
  try {
    // Check if demo tenant exists
    const tenant = db.prepare(`
      SELECT id FROM tenants WHERE name = 'Demo Tenant' LIMIT 1
    `).get();

    if (!tenant) {
      log('error', 'Demo Tenant not found. Please ensure database is seeded.');
      return null;
    }

    const tenantId = tenant.id;

    // Get a contact from demo tenant
    const contact = db.prepare(`
      SELECT id FROM contacts WHERE tenant_id = ? LIMIT 1
    `).get(tenantId);

    if (!contact) {
      log('error', 'No contacts found for demo tenant');
      return null;
    }

    // Create a test campaign
    const campaignId = uuidv4();
    const userId = db.prepare(`
      SELECT user_id FROM user_tenants WHERE tenant_id = ? LIMIT 1
    `).get(tenantId).user_id;

    db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, channel, status, sent_by, sent_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaignId,
      tenantId,
      'Test Webhook Campaign',
      'whatsapp',
      'sending',
      userId,
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Create a test message
    const messageId = uuidv4();
    const providerMessageId = `wamid.${uuidv4()}`;

    db.prepare(`
      INSERT INTO messages (
        id, tenant_id, campaign_id, contact_id, channel, provider,
        provider_message_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      tenantId,
      campaignId,
      contact.id,
      'whatsapp',
      'meta',
      providerMessageId,
      'queued',
      new Date().toISOString(),
      new Date().toISOString()
    );

    return {
      tenantId,
      campaignId,
      messageId,
      contactId: contact.id,
      providerMessageId,
      userId
    };
  } catch (error) {
    log('error', `Failed to create test data: ${error.message}`);
    return null;
  }
}

/**
 * Test 1: Webhook infrastructure endpoint exists
 */
async function testWebhookEndpointExists() {
  log('test', 'Test 1: Webhook endpoint exists');
  try {
    const response = await makeRequest('GET', '/webhooks/health');
    if (response.status === 200 && response.body.webhooks) {
      log('success', 'Webhook endpoint is operational');
      return true;
    } else {
      log('error', `Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: WhatsApp webhook receives status update
 */
async function testWhatsAppStatusWebhook() {
  log('test', 'Test 2: WhatsApp webhook status update');

  const db = getDB();
  const testData = createTestData(db);

  if (!testData) {
    log('warn', 'Skipping test - could not create test data');
    db.close();
    return false;
  }

  try {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'test-entry',
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
                    id: testData.providerMessageId,
                    status: 'sent',
                    timestamp: Math.floor(Date.now() / 1000),
                    recipient_id: 'test-recipient'
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const response = await makeRequest('POST', '/webhooks/whatsapp', payload);

    if (response.status === 200 && response.body.processed > 0) {
      log('success', `Webhook processed ${response.body.processed} status update(s)`);

      // Verify message status was updated in database
      const updated = db.prepare(`
        SELECT status FROM messages WHERE id = ?
      `).get(testData.messageId);

      if (updated && updated.status === 'sent') {
        log('success', 'Message status updated to "sent" in database');
        db.close();
        return true;
      } else {
        log('warn', `Message status is: ${updated?.status || 'not found'}`);
        db.close();
        return false;
      }
    } else {
      log('error', `Webhook failed: ${response.status}`);
      db.close();
      return false;
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
    db.close();
    return false;
  }
}

/**
 * Test 3: Message status events are logged
 */
async function testMessageStatusEventsLogging() {
  log('test', 'Test 3: Message status events logging');

  const db = getDB();
  const testData = createTestData(db);

  if (!testData) {
    log('warn', 'Skipping test - could not create test data');
    db.close();
    return false;
  }

  try {
    // Send a webhook
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'test-entry',
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
                    id: testData.providerMessageId,
                    status: 'delivered',
                    timestamp: Math.floor(Date.now() / 1000),
                    recipient_id: 'test-recipient'
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    await makeRequest('POST', '/webhooks/whatsapp', payload);

    // Check if event was logged
    const event = db.prepare(`
      SELECT * FROM message_status_events
      WHERE provider_message_id = ? AND new_status = 'delivered'
      ORDER BY created_at DESC LIMIT 1
    `).get(testData.providerMessageId);

    if (event) {
      log('success', `Status event logged: ${event.old_status} → ${event.new_status}`);
      db.close();
      return true;
    } else {
      log('warn', 'Status event not found in database');
      db.close();
      return false;
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
    db.close();
    return false;
  }
}

/**
 * Test 4: Email webhook processing
 */
async function testEmailWebhook() {
  log('test', 'Test 4: Email webhook processing');

  try {
    const payload = {
      Type: 'Notification',
      MessageId: 'test-sns-msg-id',
      TopicArn: 'arn:aws:sns:us-east-1:123456789:test-topic',
      Message: JSON.stringify({
        eventType: 'Delivery',
        mail: {
          messageId: `ses-${uuidv4()}`,
          timestamp: new Date().toISOString(),
          source: 'noreply@engageninja.local',
          destination: ['test@example.com']
        },
        delivery: {
          timestamp: new Date().toISOString(),
          recipients: ['test@example.com']
        }
      }),
      Timestamp: new Date().toISOString()
    };

    const response = await makeRequest('POST', '/webhooks/email', payload);

    if (response.status === 200) {
      log('success', `Email webhook processed: ${response.body.eventType}`);
      return true;
    } else {
      log('error', `Email webhook failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Webhook event retrieval
 */
async function testWebhookEventRetrieval() {
  log('test', 'Test 5: Webhook event retrieval');

  try {
    const response = await makeRequest('GET', '/webhooks/events?limit=5');

    if (response.status === 200 && Array.isArray(response.body.events)) {
      log('success', `Retrieved ${response.body.events.length} webhook events`);
      return true;
    } else {
      log('error', `Failed to retrieve events: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.blue + '  EngageNinja Webhook Integration Testing Suite' + colors.reset);
  console.log(colors.blue + '═══════════════════════════════════════════════════════' + colors.reset + '\n');

  const tests = [
    { name: 'Webhook Endpoint Exists', fn: testWebhookEndpointExists },
    { name: 'WhatsApp Status Webhook', fn: testWhatsAppStatusWebhook },
    { name: 'Message Status Events Logging', fn: testMessageStatusEventsLogging },
    { name: 'Email Webhook Processing', fn: testEmailWebhook },
    { name: 'Webhook Event Retrieval', fn: testWebhookEventRetrieval }
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
      log('error', `Test crashed: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log(colors.blue + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset} | ${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(colors.blue + '═══════════════════════════════════════════════════════' + colors.reset + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
setTimeout(runAllTests, 1000);
