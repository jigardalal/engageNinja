const { getPool } = require('../../utils/db');
const { notifyMetrics } = require('../../utils/metrics');
const { applyStatusUpdate } = require('../../utils/statusService');

const pool = getPool();

exports.handler = async (event) => {
  const detail = event.detail || (event.Records && event.Records[0] && event.Records[0].body ? JSON.parse(event.Records[0].body) : null);
  if (!detail || !detail.message_id) {
    return { statusCode: 400, message: 'Missing message_id' };
  }

  const client = await pool.connect();
  try {
    const message = await fetchMessage(client, detail.message_id);
    if (!message) {
      return { statusCode: 404, message: 'Message not found' };
    }

    const newStatus = detail.new_status || detail.status || 'delivered';
    await applyStatusUpdate(client, message, newStatus, detail.status_reason);

    await notifyMetrics({
      message_id: message.id,
      tenant_id: message.tenant_id,
      campaign_id: message.campaign_id,
      status: newStatus
    });

    return { statusCode: 200, message: 'OK', status: newStatus };
  } catch (error) {
    console.error('UpdateMessageStatus error', error);
    return { statusCode: 500, message: error.message };
  } finally {
    client.release();
  }
};

async function fetchMessage(client, messageId) {
  const res = await client.query('SELECT * FROM messages WHERE id = $1', [messageId]);
  return res.rows[0];
}
