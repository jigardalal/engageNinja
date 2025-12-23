const { v4: uuidv4 } = require('uuid');

function getTimestampField(status) {
  if (status === 'delivered') return 'delivered_at';
  if (status === 'read') return 'read_at';
  if (status === 'failed') return 'failed_at';
  if (status === 'sent') return 'sent_at';
  return null;
}

async function applyStatusUpdate(client, message, newStatus, statusReason = null) {
  const now = new Date().toISOString();
  const updates = ['status = $1', 'updated_at = $2'];
  const params = [newStatus, now];
  let nextIndex = 3;
  const timestampField = getTimestampField(newStatus);

  if (timestampField) {
    updates.push(`${timestampField} = $${nextIndex}`);
    params.push(now);
    nextIndex += 1;
  }

  if (statusReason) {
    updates.push(`status_reason = $${nextIndex}`);
    params.push(statusReason);
    nextIndex += 1;
  }

  params.push(message.id);
  const query = `UPDATE messages SET ${updates.join(', ')} WHERE id = $${params.length}`;
  await client.query(query, params);

  await client.query(
    `INSERT INTO message_status_events
     (id, message_id, provider_message_id, old_status, new_status, event_timestamp, webhook_received_at, status_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7)`,
    [uuidv4(), message.id, message.provider_message_id, message.status, newStatus, now, statusReason]
  );

  await client.query(
    `UPDATE message_provider_mappings
     SET provider_status = $1, updated_at = $2
     WHERE message_id = $3`,
    [newStatus, now, message.id]
  );

  return now;
}

module.exports = {
  applyStatusUpdate
};
