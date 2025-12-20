const http = require('http');

http.get('http://localhost:5173/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Health Check Response:');
    console.log(data);
    process.exit(0);
  });
}).on('error', (err) => {
  console.log('Health Check Error:', err.message);
  process.exit(1);
});
