const http = require('http');

const data = JSON.stringify({
  email: 'admin@engageninja.local',
  password: 'AdminPassword123'
});

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Origin': process.env.BASE_URL || 'http://localhost:3173'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`CORS Allow Origin: ${res.headers['access-control-allow-origin']}`);

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('Response status:', json.status);
      if (json.status === 'success') {
        console.log('✓ Login succeeded!');
      } else {
        console.log('✗ Login failed:', json.error);
      }
    } catch (e) {
      console.log('Body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(data);
req.end();
