const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => {
    console.log('Chunk:', chunk.toString());
    data += chunk;
  });
  res.on('end', () => {
    console.log('Full Response:', data);
    console.log('Response Length:', data.length);
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

const body = JSON.stringify({ email: 'admin@engageninja.local', password: 'AdminPassword123' });
console.log('Sending:', body);
req.write(body);
req.end();
