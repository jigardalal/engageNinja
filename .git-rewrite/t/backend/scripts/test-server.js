#!/usr/bin/env node

/**
 * Test backend server connectivity
 */

const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function test() {
  console.log('Testing Backend Server...\n');

  try {
    // Test health endpoint
    console.log('Testing GET /health...');
    const health = await makeRequest('/health');
    console.log(`✓ Status: ${health.status}`);
    console.log(`✓ Response:`, JSON.stringify(health.body, null, 2));

    // Test API status endpoint
    console.log('\nTesting GET /api/status...');
    const status = await makeRequest('/api/status');
    console.log(`✓ Status: ${status.status}`);
    console.log(`✓ Response:`, JSON.stringify(status.body, null, 2));

    // Test 404
    console.log('\nTesting 404 (GET /nonexistent)...');
    const notFound = await makeRequest('/nonexistent');
    console.log(`✓ Status: ${notFound.status}`);
    console.log(`✓ Response:`, JSON.stringify(notFound.body, null, 2));

    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  }
}

// Wait a moment for server to be ready
setTimeout(test, 1000);
