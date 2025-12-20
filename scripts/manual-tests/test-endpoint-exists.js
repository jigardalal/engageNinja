const http = require('http');

// Test if the settings endpoint exists
const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/settings/channels',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response body:', data);
    if (res.statusCode === 401 || res.statusCode === 400) {
      console.log('✓ Endpoint exists (got expected auth error)');
    } else {
      console.log('Response:', JSON.parse(data));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
