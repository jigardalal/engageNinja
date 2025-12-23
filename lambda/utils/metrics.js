const axios = require('axios');

const metricsEndpoint = process.env.METRICS_ENDPOINT;
const metricsToken = process.env.METRICS_AUTH_TOKEN;

async function notifyMetrics(payload) {
  if (!metricsEndpoint) {
    console.warn('METRICS_ENDPOINT is not set');
    return;
  }
  const headers = {};
  if (metricsToken) {
    headers.Authorization = `Bearer ${metricsToken}`;
  }
  try {
    await axios.post(metricsEndpoint, payload, { headers, timeout: 5000 });
  } catch (error) {
    console.error('Failed to notify metrics endpoint', error.message);
  }
}

module.exports = {
  notifyMetrics
};
