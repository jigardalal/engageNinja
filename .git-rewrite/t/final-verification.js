const http = require('http');

let sessionCookie = '';
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

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

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
  testResults.tests.push({ name, passed });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function runTests() {
  console.log('🧪 EngageNinja Feature Verification Tests\n');
  console.log('='.repeat(60) + '\n');

  try {
    // ==================== AUTHENTICATION ====================
    console.log('🔐 AUTHENTICATION TESTS');
    console.log('-'.repeat(60));

    // Test: Login
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });
    logTest('ENG-8: Login with email and password', loginRes.status === 200 && loginRes.data.user_id);

    // Test: Wrong password
    const wrongPwRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'WrongPassword'
    });
    logTest('ENG-8: Reject wrong password', wrongPwRes.status !== 200);

    console.log();

    // ==================== CONTACTS MANAGEMENT ====================
    console.log('📇 CONTACTS MANAGEMENT TESTS');
    console.log('-'.repeat(60));

    // Test: List contacts (ENG-12)
    const listContactsRes = await makeRequest('GET', '/api/contacts');
    logTest('ENG-12: List contacts for tenant', listContactsRes.status === 200 && Array.isArray(listContactsRes.data.contacts), `${listContactsRes.data.contacts?.length} contacts`);

    // Test: Create contact (ENG-14)
    const uniquePhone = '+1415' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    const createContactRes = await makeRequest('POST', '/api/contacts', {
      name: 'Test Contact',
      phone: uniquePhone,
      email: 'test@example.com',
      consent_whatsapp: true,
      consent_email: true,
      tags: []
    });
    const contactId = createContactRes.data.contact_id;
    logTest('ENG-14: Create contact', createContactRes.status === 201 && contactId, `ID: ${contactId?.substring(0, 8)}`);

    // Test: Get contact detail (ENG-13)
    const contactDetailRes = await makeRequest('GET', `/api/contacts/${contactId}`);
    const contact = contactDetailRes.data.contact;
    logTest('ENG-13: View contact detail', contactDetailRes.status === 200 && contact?.id === contactId, `Name: ${contact?.name}`);

    // Test: Edit contact (ENG-15)
    const editContactRes = await makeRequest('PUT', `/api/contacts/${contactId}`, {
      name: 'Updated Contact',
      phone: uniquePhone,
      email: 'updated@example.com',
      consent_whatsapp: true,
      consent_email: true,
      tags: []
    });
    logTest('ENG-15: Edit contact', editContactRes.status === 200, `Name: ${editContactRes.data.contact?.name}`);

    // Test: Delete contact (ENG-16)
    const deleteContactRes = await makeRequest('DELETE', `/api/contacts/${contactId}`);
    logTest('ENG-16: Delete contact', deleteContactRes.status === 200);

    // Verify contact is deleted
    const verifyDeleteRes = await makeRequest('GET', `/api/contacts/${contactId}`);
    logTest('ENG-16: Verify contact deleted', verifyDeleteRes.status === 404);

    console.log();

    // ==================== CAMPAIGNS ====================
    console.log('📧 CAMPAIGNS TESTS');
    console.log('-'.repeat(60));

    // Test: List campaigns (ENG-17)
    const listCampaignsRes = await makeRequest('GET', '/api/campaigns');
    logTest('ENG-17: List campaigns for tenant', listCampaignsRes.status === 200 && Array.isArray(listCampaignsRes.data.data), `${listCampaignsRes.data.data?.length} campaigns`);

    // Test: Create campaign (ENG-18)
    const createCampaignRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Verification Test Campaign',
      description: 'Test campaign for verification',
      channel: 'whatsapp',
      template_id: null,
      audience_filters: JSON.stringify({}),
      message_content: 'Hello {{name}}, this is a test',
      status: 'draft'
    });
    const campaignId = createCampaignRes.data.data?.id;
    logTest('ENG-18: Create campaign', createCampaignRes.status === 201 && campaignId, `ID: ${campaignId?.substring(0, 8)}`);

    // Test: Get campaign detail
    const campaignDetailRes = await makeRequest('GET', `/api/campaigns/${campaignId}`);
    const campaign = campaignDetailRes.data.campaign || campaignDetailRes.data.data;
    logTest('Campaign detail view', campaignDetailRes.status === 200 && campaign?.id === campaignId, `Status: ${campaign?.status}`);

    // Test: Send campaign with usage limits (ENG-19)
    const sendCampaignRes = await makeRequest('POST', `/api/campaigns/${campaignId}/send`);
    logTest('ENG-19: Send campaign', sendCampaignRes.status === 200, `Status after send: ${sendCampaignRes.data.campaign?.status}`);

    // Test: Verify campaign status changed to sending/sent
    const verifySendRes = await makeRequest('GET', `/api/campaigns/${campaignId}`);
    const campaignAfterSend = verifySendRes.data.campaign || verifySendRes.data.data;
    logTest('ENG-19: Campaign status updated', ['sending', 'sent'].includes(campaignAfterSend?.status), `Status: ${campaignAfterSend?.status}`);

    console.log();

    // ==================== SESSION ====================
    console.log('🔗 SESSION TESTS');
    console.log('-'.repeat(60));

    // Test: Session cookie is set
    logTest('Session cookie set', !!sessionCookie, `Cookie: ${sessionCookie?.substring(0, 20)}...`);

    // Test: Logout
    const logoutRes = await makeRequest('POST', '/api/auth/logout');
    logTest('Logout endpoint', logoutRes.status === 200);

    console.log();
    console.log('='.repeat(60));
    console.log(`📊 SUMMARY: ${testResults.passed} Passed, ${testResults.failed} Failed`);
    console.log('='.repeat(60));

    // Show details
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.tests
        .filter(t => !t.passed)
        .forEach(t => console.log(`   - ${t.name}`));
    }

    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
