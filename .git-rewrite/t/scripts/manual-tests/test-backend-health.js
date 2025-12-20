const http = require('http');

// Test health on the standard backend port
const ports = [5173];

ports.forEach(port => {
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log(`Port ${port}: OK`);
        console.log(`  Environment: ${data.environment}`);
        console.log(`  Port reported: ${data.port}`);
      } catch (e) {
        console.log(`Port ${port}: Got response but couldn't parse`);
      }
    });
  });

  req.on('error', (e) => {
    console.log(`Port ${port}: Connection refused`);
  });

  req.end();
});

// Wait a bit for responses
setTimeout(() => {
  console.log('\nNow testing login on 5173...\n');

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
      'Origin': 'http://localhost:3173'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`CORS-Allow-Origin: ${res.headers['access-control-allow-origin']}`);

    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        console.log('Response:', json.status);
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
}, 500);
