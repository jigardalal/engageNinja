const http = require('http');

const ports = [5173];
const testPorts = async () => {
  for (const port of ports) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log(`✅ Port ${port}: RESPONDING (status: ${res.statusCode})`);
            console.log(`   Response: ${data}`);
            resolve();
          });
        });
        req.setTimeout(2000);
        req.on('error', (e) => {
          console.log(`❌ Port ${port}: NOT responding (${e.code})`);
          resolve();
        });
      });
    } catch (e) {
      console.log(`❌ Port ${port}: Error - ${e.message}`);
    }
  }
};

testPorts();
