const http = require('http');

let sessionCookie = '';
let tenantId = '';

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

async function testWorkflow() {
  console.log('🧪 Testing Complete User Workflows\n');

  try {
    // === WORKFLOW 1: LOGIN ===
    console.log('📝 WORKFLOW 1: LOGIN');
    console.log('================');

    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });

    if (loginRes.status !== 200) {
      console.log('❌ FAIL: Login failed');
      process.exit(1);
    }

    tenantId = loginRes.data.active_tenant_id;
    console.log('✅ Login successful');
    console.log(`   User: ${loginRes.data.email}`);
    console.log(`   Tenant: ${loginRes.data.tenants[0].name}`);
    console.log(`   Session: ${sessionCookie.substring(0, 20)}...\n`);

    // === WORKFLOW 2: LIST CONTACTS ===
    console.log('📝 WORKFLOW 2: LIST CONTACTS');
    console.log('============================');

    const contactsRes = await makeRequest('GET', '/api/contacts');
    if (contactsRes.status !== 200) {
      console.log('❌ FAIL: Get contacts failed');
      process.exit(1);
    }
    console.log(`✅ Contacts retrieved: ${contactsRes.data.contacts.length} contacts\n`);

    // === WORKFLOW 3: CREATE CONTACT ===
    console.log('📝 WORKFLOW 3: CREATE CONTACT');
    console.log('=============================');

    const uniquePhone = '+1415' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    const createContactRes = await makeRequest('POST', '/api/contacts', {
      name: 'John Doe',
      phone: uniquePhone,
      email: 'john@example.com',
      consent_whatsapp: true,
      consent_email: true,
      tags: []
    });

    if (createContactRes.status !== 201) {
      console.log('❌ FAIL: Create contact failed');
      console.log('Response:', createContactRes.data);
      process.exit(1);
    }

    const contactId = createContactRes.data.contact_id;
    console.log(`✅ Contact created: ${contactId}`);
    console.log(`   Name: ${createContactRes.data.name}`);
    console.log(`   Phone: ${createContactRes.data.phone}\n`);

    // === WORKFLOW 4: EDIT CONTACT ===
    console.log('📝 WORKFLOW 4: EDIT CONTACT');
    console.log('===========================');

    const editContactRes = await makeRequest('PUT', `/api/contacts/${contactId}`, {
      name: 'John Doe Updated',
      phone: uniquePhone,
      email: 'john.updated@example.com',
      consent_whatsapp: true,
      consent_email: true,
      tags: []
    });

    if (editContactRes.status !== 200) {
      console.log('❌ FAIL: Edit contact failed');
      console.log('Response:', editContactRes.data);
      process.exit(1);
    }

    console.log(`✅ Contact updated: ${contactId}`);
    console.log(`   New name: ${editContactRes.data.name}\n`);

    // === WORKFLOW 5: GET CONTACT DETAIL ===
    console.log('📝 WORKFLOW 5: GET CONTACT DETAIL');
    console.log('==================================');

    const contactDetailRes = await makeRequest('GET', `/api/contacts/${contactId}`);
    if (contactDetailRes.status !== 200) {
      console.log('❌ FAIL: Get contact detail failed');
      process.exit(1);
    }

    console.log(`✅ Contact detail retrieved: ${contactId}`);
    console.log(`   Name: ${contactDetailRes.data.name}`);
    console.log(`   Email: ${contactDetailRes.data.email}\n`);

    // === WORKFLOW 6: CREATE CAMPAIGN ===
    console.log('📝 WORKFLOW 6: CREATE CAMPAIGN');
    console.log('===============================');

    const createCampaignRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Test Campaign',
      description: 'A test campaign',
      channel: 'whatsapp',
      template_id: null,
      audience_filters: JSON.stringify({}),
      message_content: 'Hello {{name}}, this is a test message',
      status: 'draft'
    });

    if (createCampaignRes.status !== 201) {
      console.log('❌ FAIL: Create campaign failed');
      console.log('Response:', createCampaignRes.data);
      process.exit(1);
    }

    const campaignId = createCampaignRes.data.campaign_id;
    console.log(`✅ Campaign created: ${campaignId}`);
    console.log(`   Name: ${createCampaignRes.data.name}`);
    console.log(`   Status: ${createCampaignRes.data.status}\n`);

    // === WORKFLOW 7: GET CAMPAIGN DETAIL ===
    console.log('📝 WORKFLOW 7: GET CAMPAIGN DETAIL');
    console.log('==================================');

    const campaignDetailRes = await makeRequest('GET', `/api/campaigns/${campaignId}`);
    if (campaignDetailRes.status !== 200) {
      console.log('❌ FAIL: Get campaign detail failed');
      process.exit(1);
    }

    console.log(`✅ Campaign detail retrieved: ${campaignId}`);
    console.log(`   Name: ${campaignDetailRes.data.name}`);
    console.log(`   Channel: ${campaignDetailRes.data.channel}`);
    console.log(`   Status: ${campaignDetailRes.data.status}\n`);

    // === WORKFLOW 8: LIST CAMPAIGNS ===
    console.log('📝 WORKFLOW 8: LIST CAMPAIGNS');
    console.log('=============================');

    const campaignsListRes = await makeRequest('GET', '/api/campaigns');
    if (campaignsListRes.status !== 200) {
      console.log('❌ FAIL: List campaigns failed');
      process.exit(1);
    }

    console.log(`✅ Campaigns listed: ${campaignsListRes.data.data.length} campaigns\n`);

    // === WORKFLOW 9: DELETE CONTACT ===
    console.log('📝 WORKFLOW 9: DELETE CONTACT');
    console.log('=============================');

    const deleteContactRes = await makeRequest('DELETE', `/api/contacts/${contactId}`);
    if (deleteContactRes.status !== 200) {
      console.log('❌ FAIL: Delete contact failed');
      process.exit(1);
    }

    console.log(`✅ Contact deleted: ${contactId}\n`);

    // === WORKFLOW 10: LOGOUT ===
    console.log('📝 WORKFLOW 10: LOGOUT');
    console.log('======================');

    const logoutRes = await makeRequest('POST', '/api/auth/logout');
    if (logoutRes.status !== 200) {
      console.log('❌ FAIL: Logout failed');
      process.exit(1);
    }

    console.log(`✅ Logout successful\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('✅ ALL WORKFLOWS PASSED!');
    console.log('='.repeat(50));
    process.exit(0);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
}

testWorkflow();
