#!/usr/bin/env node

/**
 * Provider Layer Integration Tests
 *
 * Tests the messaging provider abstraction layer:
 * - MessagingProvider base class
 * - DemoProvider mock implementation
 * - Provider factory and credential handling
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertMatch(str, pattern, message) {
  if (!pattern.test(str)) {
    throw new Error(message || `"${str}" does not match pattern ${pattern}`);
  }
}

console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}  Messaging Provider Layer Tests${colors.reset}`);
console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

// ============================================================================
// Test: MessagingProvider Base Class
// ============================================================================

console.log(`${colors.blue}MessagingProvider Base Class${colors.reset}`);

test('MessagingProvider should be importable', () => {
  const MessagingProvider = require('../src/services/messaging/MessagingProvider');
  assert(MessagingProvider !== undefined, 'MessagingProvider not imported');
  assert(typeof MessagingProvider === 'function', 'MessagingProvider is not a class');
});

test('MessagingProvider should instantiate with tenant/channel/credentials', () => {
  const MessagingProvider = require('../src/services/messaging/MessagingProvider');
  const provider = new MessagingProvider('tenant-123', 'sms', { key: 'value' }, { setting: true });

  assert(provider.tenantId === 'tenant-123', 'tenantId not set');
  assert(provider.channel === 'sms', 'channel not set');
  assert(provider.credentials.key === 'value', 'credentials not set');
});

test('MessagingProvider should define abstract methods', () => {
  const MessagingProvider = require('../src/services/messaging/MessagingProvider');
  const provider = new MessagingProvider('tenant-123', 'sms', {}, {});

  assert(typeof provider.send === 'function', 'send method missing');
  assert(typeof provider.verify === 'function', 'verify method missing');
  assert(typeof provider.parseWebhook === 'function', 'parseWebhook method missing');
  assert(typeof provider.getStatus === 'function', 'getStatus method missing');
});

test('MessagingProvider should define helper methods', () => {
  const MessagingProvider = require('../src/services/messaging/MessagingProvider');
  const provider = new MessagingProvider('tenant-123', 'sms', {}, {});

  assert(typeof provider.normalizeStatus === 'function', 'normalizeStatus missing');
  assert(typeof provider.hasRequiredCredentials === 'function', 'hasRequiredCredentials missing');
  assert(typeof provider.logError === 'function', 'logError missing');
});

test('normalizeStatus should handle various statuses', () => {
  const MessagingProvider = require('../src/services/messaging/MessagingProvider');
  const provider = new MessagingProvider('tenant-123', 'sms', {}, {});

  assertEqual(provider.normalizeStatus('sent'), 'sent', 'sent status');
  assertEqual(provider.normalizeStatus('delivered'), 'delivered', 'delivered status');
  assertEqual(provider.normalizeStatus('failed'), 'failed', 'failed status');
  assertEqual(provider.normalizeStatus('read'), 'read', 'read status');
});

test('hasRequiredCredentials should validate presence', () => {
  const MessagingProvider = require('../src/services/messaging/MessagingProvider');
  const provider = new MessagingProvider('tenant-123', 'sms',
    { apiKey: 'key123', secret: 'secret456' }, {});

  assert(provider.hasRequiredCredentials(['apiKey']) === true, 'should find apiKey');
  assert(provider.hasRequiredCredentials(['apiKey', 'secret']) === true, 'should find both');
  assert(provider.hasRequiredCredentials(['apiKey', 'missing']) === false, 'should reject when missing');
});

// ============================================================================
// Test: DemoProvider
// ============================================================================

console.log(`\n${colors.blue}DemoProvider Implementation${colors.reset}`);

test('DemoProvider should be importable', () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  assert(DemoProvider !== undefined, 'DemoProvider not imported');
});

test('DemoProvider should extend MessagingProvider', () => {
  const MessagingProvider = require('../src/services/messaging/MessagingProvider');
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const provider = new DemoProvider('tenant-123', 'sms', {}, {});

  assert(provider instanceof MessagingProvider, 'DemoProvider should extend MessagingProvider');
});

test('DemoProvider should instantiate without credentials', () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const provider = new DemoProvider('tenant-123', 'sms', {}, {});

  assert(provider.tenantId === 'tenant-123', 'tenantId not set');
  assert(provider.channel === 'sms', 'channel not set');
});

test('DemoProvider.send should return success result', async () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const provider = new DemoProvider('tenant-123', 'sms', {}, {});

  const message = {
    id: 'msg-123',
    phone_number: '+1234567890',
    content: 'Test message'
  };

  const result = await provider.send(message);

  assert(result.success === true, 'send should return success=true');
  assert(result.status === 'sent', 'status should be sent');
  assert(result.provider === 'demo', 'provider should be demo');
  assert(result.demo === true, 'demo flag should be true');
  assertMatch(result.provider_message_id, /^demo-msg-123-\d+$/, 'provider_message_id format invalid');
});

test('DemoProvider.generateDemoMessageId creates realistic IDs', () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const provider = new DemoProvider('tenant-123', 'sms', {}, {});

  const id1 = provider.generateDemoMessageId('msg-abc123');

  // Small delay to ensure different timestamp
  const now = Date.now();
  while (Date.now() === now) {} // Wait for next millisecond

  const id2 = provider.generateDemoMessageId('msg-abc123');

  assertMatch(id1, /^demo-msg-abc123-\d+$/, 'ID format should match pattern');
  assert(id1 !== id2, 'IDs should differ (different timestamps)');
});

test('DemoProvider.verify should return success', async () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const provider = new DemoProvider('tenant-123', 'sms', {}, {});

  const result = await provider.verify();

  assert(result.success === true, 'verify should return success=true');
  assert(result.demo === true, 'demo flag should be true');
});

test('DemoProvider.getStatus should return active', async () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const provider = new DemoProvider('tenant-123', 'sms', {}, {});

  const result = await provider.getStatus();

  assertEqual(result.status, 'active', 'status should be active');
  assert(result.demo === true, 'demo flag should be true');
});

test('DemoProvider.parseWebhook should handle demo webhook', () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const provider = new DemoProvider('tenant-123', 'sms', {}, {});

  const webhook = {
    provider_message_id: 'demo-msg-123-1234567890',
    status: 'delivered',
    timestamp: new Date().toISOString()
  };

  const result = provider.parseWebhook(webhook, null);

  assertEqual(result.provider_message_id, 'demo-msg-123-1234567890', 'message ID should match');
  assertEqual(result.status, 'delivered', 'status should be delivered');
  assert(result.timestamp instanceof Date, 'timestamp should be Date');
  assert(result.demo === true, 'demo flag should be true');
});

test('DemoProvider.getDemoDelays returns realistic timing', () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const delays = DemoProvider.getDemoDelays();

  assertEqual(delays.sent_delay, 0, 'sent_delay should be 0');
  assert(delays.delivered_delay >= 3000, 'delivered_delay should be at least 3s');
  assert(delays.delivered_delay <= 5000, 'delivered_delay should be at most 5s');
  assert(delays.read_delay >= 5000, 'read_delay should be at least 5s');
  assert(delays.read_delay <= 10000, 'read_delay should be at most 10s');
});

test('DemoProvider supports all channels', () => {
  const DemoProvider = require('../src/services/messaging/providers/DemoProvider');
  const channels = DemoProvider.getSupportedChannels();

  assert(Array.isArray(channels), 'getSupportedChannels should return array');
  assert(channels.includes('sms'), 'should support sms');
  assert(channels.includes('whatsapp'), 'should support whatsapp');
  assert(channels.includes('email'), 'should support email');
});

// ============================================================================
// Test: Other Providers
// ============================================================================

console.log(`\n${colors.blue}Other Provider Implementations${colors.reset}`);

test('TwilioSmsProvider should be importable', () => {
  const TwilioSmsProvider = require('../src/services/messaging/providers/TwilioSmsProvider');
  assert(TwilioSmsProvider !== undefined, 'TwilioSmsProvider not imported');
});

test('TwilioWhatsAppProvider should be importable', () => {
  const TwilioWhatsAppProvider = require('../src/services/messaging/providers/TwilioWhatsAppProvider');
  assert(TwilioWhatsAppProvider !== undefined, 'TwilioWhatsAppProvider not imported');
});

test('SESEmailProvider should be importable', () => {
  const SESEmailProvider = require('../src/services/messaging/providers/SESEmailProvider');
  assert(SESEmailProvider !== undefined, 'SESEmailProvider not imported');
});

test('TwilioWhatsAppProvider should support whatsapp channel', () => {
  const TwilioWhatsAppProvider = require('../src/services/messaging/providers/TwilioWhatsAppProvider');
  const channels = TwilioWhatsAppProvider.getSupportedChannels();

  assert(channels.includes('whatsapp'), 'should support whatsapp');
});

test('SESEmailProvider should support email channel', () => {
  const SESEmailProvider = require('../src/services/messaging/providers/SESEmailProvider');
  const channels = SESEmailProvider.getSupportedChannels();

  assert(channels.includes('email'), 'should support email');
});

// ============================================================================
// Test: Provider Factory
// ============================================================================

console.log(`\n${colors.blue}Provider Factory${colors.reset}`);

test('providerFactory should be importable', () => {
  const factory = require('../src/services/messaging/providerFactory');
  assert(factory !== undefined, 'providerFactory not imported');
  assert(typeof factory.getProvider === 'function', 'getProvider not exported');
  assert(typeof factory.decryptCredentials === 'function', 'decryptCredentials not exported');
});

test('decryptCredentials should handle encryption/decryption', () => {
  const { decryptCredentials } = require('../src/services/messaging/providerFactory');

  const originalCreds = {
    accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    authToken: 'auth_token_here'
  };

  // Encrypt credentials
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
  const key = crypto.createHash('sha256').update(encryptionKey).digest().subarray(0, 24);
  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(originalCreds), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Decrypt
  const decrypted = decryptCredentials(encrypted);

  assertEqual(decrypted.accountSid, originalCreds.accountSid, 'accountSid should match');
  assertEqual(decrypted.authToken, originalCreds.authToken, 'authToken should match');
});

test('decryptCredentials should handle null/empty input', () => {
  const { decryptCredentials } = require('../src/services/messaging/providerFactory');

  assert(decryptCredentials(null) === null, 'null should return null');
  assert(decryptCredentials(undefined) === null, 'undefined should return null');
  assert(decryptCredentials('') === null, 'empty string should return null');
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}  Test Summary${colors.reset}`);
console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

const totalTests = testsPassed + testsFailed;
const percentage = totalTests > 0 ? Math.round((testsPassed / totalTests) * 100) : 0;

console.log(`Total Tests:  ${totalTests}`);
console.log(`${colors.green}Passed:       ${testsPassed}${colors.reset}`);
if (testsFailed > 0) {
  console.log(`${colors.red}Failed:       ${testsFailed}${colors.reset}`);
}
console.log(`Success Rate: ${percentage}%\n`);

if (testsFailed > 0) {
  console.log(`${colors.red}TESTS FAILED${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}ALL TESTS PASSED${colors.reset}\n`);
  process.exit(0);
}
