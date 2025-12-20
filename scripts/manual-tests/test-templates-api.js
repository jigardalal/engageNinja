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

async function testTemplatesAPI() {
  console.log('🧪 WhatsApp Templates API Integration Tests\n');
  console.log('='.repeat(50));

  let passCount = 0;
  let failCount = 0;

  try {
    // 1. Login
    console.log('\n✓ Logging in...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    console.log('  Session established');
    passCount++;

    // 2. GET /api/templates (List)
    console.log('\n✓ Test 1: GET /api/templates (List templates)');
    const listRes = await makeRequest('GET', '/api/templates');
    if (listRes.status === 200 && Array.isArray(listRes.data.templates)) {
      console.log(`  ✓ Status: ${listRes.status}`);
      console.log(`  ✓ Templates count: ${listRes.data.templates.length}`);
      passCount++;
    } else {
      console.log(`  ✗ Failed: ${listRes.status}`);
      console.log(`  Response: ${JSON.stringify(listRes.data)}`);
      failCount++;
    }

    // 3. GET /api/templates with filters
    console.log('\n✓ Test 2: GET /api/templates?status=PENDING (Filtered)');
    const filteredRes = await makeRequest('GET', '/api/templates?status=PENDING');
    if (filteredRes.status === 200 && Array.isArray(filteredRes.data.templates)) {
      console.log(`  ✓ Status: ${filteredRes.status}`);
      console.log(`  ✓ Filtered templates count: ${filteredRes.data.templates.length}`);
      console.log(`  ✓ Filter applied: status=${filteredRes.data.filters.status}`);
      passCount++;
    } else {
      console.log(`  ✗ Failed: ${filteredRes.status}`);
      failCount++;
    }

    // 4. POST /api/templates (Create)
    console.log('\n✓ Test 3: POST /api/templates (Create template)');
    const templateName = `test_template_${Date.now()}`;
    const createRes = await makeRequest('POST', '/api/templates', {
      name: templateName,
      language: 'en',
      category: 'MARKETING',
      components: {
        HEADER: {
          type: 'TEXT',
          format: 'TEXT',
          text: 'Welcome to our store!',
          example: { header_text: [] }
        },
        BODY: {
          type: 'BODY',
          text: 'Hi {{1}}, your order {{2}} is confirmed!',
          example: { body_text: [['name', 'order123']] }
        },
        FOOTER: {
          type: 'FOOTER',
          text: 'Thank you!'
        },
        BUTTONS: {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'View Order' },
            { type: 'URL', text: 'Track', url: 'https://example.com/track' }
          ]
        }
      }
    });

    if (createRes.status === 201 && createRes.data.id) {
      console.log(`  ✓ Status: ${createRes.status}`);
      console.log(`  ✓ Template created: ${createRes.data.id}`);
      console.log(`  ✓ Name: ${createRes.data.name}`);
      console.log(`  ✓ Initial status: ${createRes.data.status}`);
      passCount++;

      const templateId = createRes.data.id;

      // 5. GET /api/templates/:id (Detail)
      console.log('\n✓ Test 4: GET /api/templates/:id (Get template detail)');
      const detailRes = await makeRequest('GET', `/api/templates/${templateId}`);
      if (detailRes.status === 200 && detailRes.data.data) {
        console.log(`  ✓ Status: ${detailRes.status}`);
        console.log(`  ✓ Template name: ${detailRes.data.data.name}`);
        console.log(`  ✓ Components schema exists: ${!!detailRes.data.data.components_schema}`);
        passCount++;
      } else {
        console.log(`  ✗ Failed: ${detailRes.status}`);
        failCount++;
      }

      // 6. POST /api/templates/:id/duplicate (Version - only works if APPROVED)
      console.log('\n✓ Test 5: POST /api/templates/:id/duplicate (Version template)');
      const versionRes = await makeRequest('POST', `/api/templates/${templateId}/duplicate`);

      // This will fail if template isn't APPROVED yet - that's expected
      if (versionRes.status === 400 && versionRes.data.message?.includes('approved')) {
        console.log(`  ℹ Expected: Template not yet approved (${versionRes.status})`);
        console.log(`  Message: ${versionRes.data.message}`);
        passCount++; // Still counts as passing test (correct error handling)
      } else if (versionRes.status === 201) {
        console.log(`  ✓ Status: ${versionRes.status}`);
        console.log(`  ✓ New version created: ${versionRes.data.id}`);
        console.log(`  ✓ Version name: ${versionRes.data.name}`);
        passCount++;
      } else {
        console.log(`  ⚠ Unexpected response: ${versionRes.status}`);
      }

      // 7. DELETE /api/templates/:id (Delete)
      console.log('\n✓ Test 6: DELETE /api/templates/:id (Delete template)');
      const deleteRes = await makeRequest('DELETE', `/api/templates/${templateId}`);
      if (deleteRes.status === 200) {
        console.log(`  ✓ Status: ${deleteRes.status}`);
        console.log(`  ✓ Message: ${deleteRes.data.message}`);
        passCount++;

        // Verify deletion
        const verifyRes = await makeRequest('GET', `/api/templates/${templateId}`);
        if (verifyRes.status === 404) {
          console.log(`  ✓ Verified: Template deleted (404 on GET)`);
          passCount++;
        } else {
          console.log(`  ✗ Verification failed: ${verifyRes.status}`);
          failCount++;
        }
      } else {
        console.log(`  ✗ Failed: ${deleteRes.status}`);
        console.log(`  Response: ${JSON.stringify(deleteRes.data)}`);
        failCount++;
      }
    } else {
      console.log(`  ✗ Failed: ${createRes.status}`);
      console.log(`  Response: ${JSON.stringify(createRes.data)}`);
      failCount += 3; // Count all remaining tests as failed
    }

    // 8. Form validation tests
    console.log('\n✓ Test 7: Validation - Invalid template name');
    const invalidNameRes = await makeRequest('POST', '/api/templates', {
      name: 'InvalidName-WithSpecialChars!',
      language: 'en',
      category: 'MARKETING',
      components: { BODY: { text: 'Test' } }
    });
    if (invalidNameRes.status === 400) {
      console.log(`  ✓ Status: ${invalidNameRes.status}`);
      console.log(`  ✓ Error: ${invalidNameRes.data.message}`);
      passCount++;
    } else {
      console.log(`  ✗ Expected 400, got ${invalidNameRes.status}`);
      failCount++;
    }

    console.log('\n✓ Test 8: Validation - Missing body');
    const noBodyRes = await makeRequest('POST', '/api/templates', {
      name: 'test_no_body',
      language: 'en',
      category: 'MARKETING',
      components: {}
    });
    if (noBodyRes.status === 400) {
      console.log(`  ✓ Status: ${noBodyRes.status}`);
      console.log(`  ✓ Error: ${noBodyRes.data.message}`);
      passCount++;
    } else {
      console.log(`  ✗ Expected 400, got ${noBodyRes.status}`);
      failCount++;
    }

  } catch (error) {
    console.error('\n✗ Test error:', error.message);
    failCount++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results:`);
  console.log(`  ✓ Passed: ${passCount}`);
  console.log(`  ✗ Failed: ${failCount}`);
  console.log(`  Total: ${passCount + failCount}`);

  if (failCount === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failCount} test(s) failed`);
    process.exit(1);
  }
}

testTemplatesAPI().catch(console.error);
