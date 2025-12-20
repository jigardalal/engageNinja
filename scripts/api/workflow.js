/**
 * API workflow test
 * Flows: login -> contacts CRUD -> campaign create -> list -> delete -> logout
 * Requires backend running at localhost:5173
 */

const http = require('http');

let sessionCookie = '';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path,
      method,
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

async function run() {
  console.log('🧪 API workflow\n');
  try {
    // Login
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@engageninja.local',
      password: 'AdminPassword123'
    });
    if (loginRes.status !== 200) throw new Error('Login failed');
    const tenantId = loginRes.data.active_tenant_id;
    console.log('✅ Login ok');

    // List contacts
    const contactsRes = await makeRequest('GET', '/api/contacts');
    if (contactsRes.status !== 200) throw new Error('List contacts failed');
    console.log(`✅ Contacts listed (${(contactsRes.data.contacts || []).length})`);

    // Create contact
    const uniquePhone = '+1415' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    const createContactRes = await makeRequest('POST', '/api/contacts', {
      name: 'John Doe',
      phone: uniquePhone,
      email: 'john@example.com',
      consent_whatsapp: true,
      consent_email: true,
      tags: []
    });
    if (createContactRes.status !== 201) throw new Error('Create contact failed');
    const contactId = createContactRes.data.contact_id;
    console.log(`✅ Contact created (${contactId})`);

    // Update contact
    const editContactRes = await makeRequest('PUT', `/api/contacts/${contactId}`, {
      name: 'John Doe Updated',
      phone: uniquePhone,
      email: 'john.updated@example.com',
      consent_whatsapp: true,
      consent_email: true,
      tags: []
    });
    if (editContactRes.status !== 200) throw new Error('Edit contact failed');
    console.log('✅ Contact updated');

    // Get contact detail
    const contactDetailRes = await makeRequest('GET', `/api/contacts/${contactId}`);
    if (contactDetailRes.status !== 200) throw new Error('Contact detail failed');
    console.log('✅ Contact detail ok');

    // Create campaign
    const createCampaignRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Test Campaign',
      description: 'A test campaign',
      channel: 'whatsapp',
      template_id: null,
      audience_filters: JSON.stringify({}),
      message_content: 'Hello {{name}}, this is a test message',
      status: 'draft'
    });
    if (createCampaignRes.status !== 201) throw new Error('Create campaign failed');
    const campaignId = createCampaignRes.data.campaign_id || createCampaignRes.data.id;
    console.log(`✅ Campaign created (${campaignId})`);

    // Campaign detail
    const campaignDetailRes = await makeRequest('GET', `/api/campaigns/${campaignId}`);
    if (campaignDetailRes.status !== 200) throw new Error('Campaign detail failed');
    console.log('✅ Campaign detail ok');

    // List campaigns
    const campaignsListRes = await makeRequest('GET', '/api/campaigns');
    if (campaignsListRes.status !== 200) throw new Error('List campaigns failed');
    console.log(`✅ Campaigns listed (${(campaignsListRes.data.data || []).length})`);

    // Delete contact
    const deleteContactRes = await makeRequest('DELETE', `/api/contacts/${contactId}`);
    if (deleteContactRes.status !== 200) throw new Error('Delete contact failed');
    console.log('✅ Contact deleted');

    // Logout
    const logoutRes = await makeRequest('POST', '/api/auth/logout');
    if (logoutRes.status !== 200) throw new Error('Logout failed');
    console.log('✅ Logout ok');

    console.log('\n✅ ALL API WORKFLOWS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
}

run();
