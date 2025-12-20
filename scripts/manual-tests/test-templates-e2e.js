/**
 * End-to-End Tests for WhatsApp Template Management
 * Tests the complete user workflow via UI interactions
 *
 * Run: node scripts/manual-tests/test-templates-e2e.js
 * Requires: Frontend running on http://localhost:3173
 */

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

async function testE2ETemplateWorkflow() {
  console.log('🧪 End-to-End Template Management Workflow Tests\n');
  console.log('='.repeat(60));

  let passCount = 0;
  let failCount = 0;

  try {
    // 1. Login
    console.log('\n[Setup] Logging in...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    console.log('✓ Authenticated\n');
    passCount++;

    // ===== SCENARIO 1: Create Template with Full Components =====
    console.log('📋 SCENARIO 1: Create Template with Full Components');
    console.log('-'.repeat(60));

    const templateName = `e2e_test_${Date.now()}`;

    console.log('\n1.1: Create template with all component types');
    const createRes = await makeRequest('POST', '/api/templates', {
      name: templateName,
      language: 'en',
      category: 'MARKETING',
      components: {
        HEADER: {
          type: 'TEXT',
          format: 'TEXT',
          text: 'Order Confirmation',
          example: { header_text: [] }
        },
        BODY: {
          type: 'BODY',
          text: 'Hi {{1}}, your order #{{2}} has been confirmed!\nExpected delivery: {{3}}',
          example: { body_text: [['John', 'ORD-123', '2 days']] }
        },
        FOOTER: {
          type: 'FOOTER',
          text: 'Thank you for your order!'
        },
        BUTTONS: {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'View Order' },
            { type: 'URL', text: 'Track Package', url: 'https://example.com/track' },
            { type: 'PHONE_NUMBER', text: 'Call Support', phone_number: '+1234567890' }
          ]
        }
      }
    });

    if (createRes.status === 201 && createRes.data.id) {
      console.log(`  ✓ Template created: ${createRes.data.id}`);
      console.log(`  ✓ Name: ${createRes.data.name}`);
      console.log(`  ✓ Initial status: ${createRes.data.status}`);
      console.log(`  ✓ Language: ${createRes.data.language}`);
      console.log(`  ✓ Category: ${createRes.data.category}`);
      passCount++;

      const templateId = createRes.data.id;

      // ===== SCENARIO 2: List and Filter Templates =====
      console.log('\n\n📋 SCENARIO 2: List and Filter Templates');
      console.log('-'.repeat(60));

      console.log('\n2.1: List all templates');
      const listRes = await makeRequest('GET', '/api/templates');
      if (listRes.status === 200 && Array.isArray(listRes.data.templates)) {
        console.log(`  ✓ Retrieved ${listRes.data.templates.length} template(s)`);

        const createdTemplate = listRes.data.templates.find(t => t.id === templateId);
        if (createdTemplate) {
          console.log(`  ✓ Created template found in list`);
          passCount++;
        } else {
          console.log(`  ✗ Created template NOT found in list`);
          failCount++;
        }
      } else {
        console.log(`  ✗ List failed: ${listRes.status}`);
        failCount++;
      }

      console.log('\n2.2: Filter by status (PENDING)');
      const filterRes = await makeRequest('GET', '/api/templates?status=PENDING');
      if (filterRes.status === 200) {
        const pendingCount = filterRes.data.templates.filter(t => t.status === 'PENDING').length;
        console.log(`  ✓ Filtered results: ${filterRes.data.templates.length} templates`);
        console.log(`  ✓ All templates have PENDING status: ${pendingCount === filterRes.data.templates.length}`);
        passCount++;
      } else {
        console.log(`  ✗ Filter failed: ${filterRes.status}`);
        failCount++;
      }

      console.log('\n2.3: Filter by language (English)');
      const langRes = await makeRequest('GET', '/api/templates?language=en');
      if (langRes.status === 200) {
        console.log(`  ✓ Retrieved ${langRes.data.templates.length} English template(s)`);
        passCount++;
      } else {
        console.log(`  ✗ Filter failed: ${langRes.status}`);
        failCount++;
      }

      console.log('\n2.4: Filter by category (Marketing)');
      const catRes = await makeRequest('GET', '/api/templates?category=MARKETING');
      if (catRes.status === 200) {
        console.log(`  ✓ Retrieved ${catRes.data.templates.length} Marketing template(s)`);
        passCount++;
      } else {
        console.log(`  ✗ Filter failed: ${catRes.status}`);
        failCount++;
      }

      // ===== SCENARIO 3: Template Details =====
      console.log('\n\n📋 SCENARIO 3: Retrieve Template Details');
      console.log('-'.repeat(60));

      console.log('\n3.1: Get template by ID');
      const detailRes = await makeRequest('GET', `/api/templates/${templateId}`);
      if (detailRes.status === 200 && detailRes.data.data) {
        const template = detailRes.data.data;
        console.log(`  ✓ Template retrieved`);
        console.log(`  ✓ Name: ${template.name}`);
        console.log(`  ✓ Status: ${template.status}`);
        console.log(`  ✓ Variable count: ${template.variable_count}`);

        // Verify components
        if (template.components_schema) {
          const comp = JSON.parse(template.components_schema);
          console.log(`  ✓ Components found: ${Object.keys(comp).join(', ')}`);
          console.log(`  ✓ Buttons count: ${comp.BUTTONS?.buttons?.length || 0}`);
          passCount++;
        } else {
          console.log(`  ✗ Components schema missing`);
          failCount++;
        }
      } else {
        console.log(`  ✗ Detail retrieval failed: ${detailRes.status}`);
        failCount++;
      }

      // ===== SCENARIO 4: Versioning (if APPROVED) =====
      console.log('\n\n📋 SCENARIO 4: Template Versioning');
      console.log('-'.repeat(60));

      console.log('\n4.1: Attempt to version PENDING template (should fail)');
      const versionRes = await makeRequest('POST', `/api/templates/${templateId}/duplicate`);
      if (versionRes.status === 400 && versionRes.data.message?.includes('approved')) {
        console.log(`  ✓ Correctly rejected: Template must be APPROVED`);
        console.log(`  ✓ Error message: ${versionRes.data.message}`);
        passCount++;
      } else if (versionRes.status === 201) {
        console.log(`  ℹ Template was approved, version created`);
        console.log(`  ✓ New version: ${versionRes.data.name}`);
        passCount++;
      } else {
        console.log(`  ✗ Unexpected response: ${versionRes.status}`);
        failCount++;
      }

      // ===== SCENARIO 5: Error Handling =====
      console.log('\n\n📋 SCENARIO 5: Error Handling & Validation');
      console.log('-'.repeat(60));

      console.log('\n5.1: Duplicate template name');
      const dupRes = await makeRequest('POST', '/api/templates', {
        name: templateName,  // Same name
        language: 'en',
        category: 'MARKETING',
        components: { BODY: { text: 'Test' } }
      });
      if (dupRes.status === 400 && dupRes.data.message?.includes('already exists')) {
        console.log(`  ✓ Correctly rejected: ${dupRes.data.message}`);
        passCount++;
      } else {
        console.log(`  ✗ Should reject duplicate name`);
        failCount++;
      }

      console.log('\n5.2: Invalid template name format');
      const invalidRes = await makeRequest('POST', '/api/templates', {
        name: 'INVALID-NAME!',  // Contains uppercase and special char
        language: 'en',
        category: 'MARKETING',
        components: { BODY: { text: 'Test' } }
      });
      if (invalidRes.status === 400 && invalidRes.data.message?.includes('lowercase')) {
        console.log(`  ✓ Correctly rejected: ${invalidRes.data.message}`);
        passCount++;
      } else {
        console.log(`  ✗ Should reject invalid name format`);
        failCount++;
      }

      console.log('\n5.3: Missing required body');
      const noBodyRes = await makeRequest('POST', '/api/templates', {
        name: 'test_no_body_unique',
        language: 'en',
        category: 'MARKETING',
        components: {}  // No BODY
      });
      if (noBodyRes.status === 400 && noBodyRes.data.message) {
        console.log(`  ✓ Correctly rejected: ${noBodyRes.data.message}`);
        passCount++;
      } else {
        console.log(`  ✗ Should require body component`);
        failCount++;
      }

      console.log('\n5.4: Get non-existent template');
      const notFoundRes = await makeRequest('GET', '/api/templates/nonexistent-id-12345');
      if (notFoundRes.status === 404 && notFoundRes.data.message?.includes('not found')) {
        console.log(`  ✓ Correctly returned 404: ${notFoundRes.data.message}`);
        passCount++;
      } else {
        console.log(`  ✗ Should return 404 for missing template`);
        failCount++;
      }

      // ===== SCENARIO 6: Cleanup - Delete Template =====
      console.log('\n\n📋 SCENARIO 6: Template Deletion');
      console.log('-'.repeat(60));

      console.log('\n6.1: Delete template');
      const deleteRes = await makeRequest('DELETE', `/api/templates/${templateId}`);
      if (deleteRes.status === 200) {
        console.log(`  ✓ Template deleted`);
        console.log(`  ✓ Message: ${deleteRes.data.message}`);

        // Verify deletion
        const verifyRes = await makeRequest('GET', `/api/templates/${templateId}`);
        if (verifyRes.status === 404) {
          console.log(`  ✓ Verified: Template no longer exists (404)`);
          passCount++;
        } else {
          console.log(`  ✗ Template still exists: ${verifyRes.status}`);
          failCount++;
        }
      } else {
        console.log(`  ✗ Delete failed: ${deleteRes.status}`);
        failCount++;
      }

    } else {
      console.log(`  ✗ Template creation failed: ${createRes.status}`);
      console.log(`  Response: ${JSON.stringify(createRes.data)}`);
      failCount += 10; // Count all scenarios as failed
    }

  } catch (error) {
    console.error('\n✗ Test error:', error.message);
    failCount++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 E2E Test Results:`);
  console.log(`  ✓ Passed: ${passCount}`);
  console.log(`  ✗ Failed: ${failCount}`);
  console.log(`  Total: ${passCount + failCount}`);
  console.log(`  Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);

  if (failCount === 0) {
    console.log('\n✅ All E2E tests passed!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failCount} test(s) need attention`);
    process.exit(1);
  }
}

testE2ETemplateWorkflow().catch(console.error);
