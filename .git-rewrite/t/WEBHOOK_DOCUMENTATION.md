# EngageNinja Webhook Infrastructure Documentation

## Overview

The webhook infrastructure enables real-time processing of message status updates from WhatsApp and email providers. This unlocks:
- Real-time campaign metrics (sent, delivered, read, failed counts)
- Accurate uplift calculation for resend campaigns
- Live status updates for users

## Architecture

### Endpoints

#### WhatsApp Webhooks

**GET /webhooks/whatsapp** - Webhook verification (challenge-response)
- Used by Meta to verify the webhook URL during setup
- Requires: `hub_mode=subscribe`, `hub_verify_token`, `hub_challenge`
- Returns: The challenge string if verification token matches

**POST /webhooks/whatsapp** - Receive message status updates
- Accepts webhook notifications from Meta WhatsApp Cloud API
- Signature validation using X-Hub-Signature-256 header
- Processes status updates: `sent`, `delivered`, `read`, `failed`
- Updates message status in database
- Logs status events in `message_status_events` table

#### Email Webhooks

**POST /webhooks/email** - Receive email provider events
- Accepts SNS notifications from AWS SES
- Supports SES event types: `Send`, `Delivery`, `Open`, `Bounce`, `Complaint`, `Click`, `Reject`
- Maps SES events to message statuses:
  - `Send` → `sent`
  - `Delivery` → `delivered`
  - `Open` → `read`
  - `Bounce`, `Reject`, `Complaint` → `failed`

#### Debug Endpoints

**GET /webhooks/health** - Health check
- Returns webhook system status
- Shows recent events (last 10)
- Total event count

**GET /webhooks/events** - Recent webhook events
- Query parameter: `limit` (max 500, default 50)
- Returns recent webhook events for debugging

## Configuration

### Environment Variables

```bash
# Webhook verification secrets
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token
SES_WEBHOOK_SECRET=your-ses-secret

# Feature flags
ENABLE_WEBHOOK_VERIFICATION=true  # Set to false for development
```

## Webhook Processing Flow

### WhatsApp Status Update Flow

```
1. Meta sends POST /webhooks/whatsapp
2. System verifies X-Hub-Signature-256
3. Extracts provider_message_id and new_status
4. Checks for duplicate event (idempotency)
5. Finds message in database by provider_message_id
6. Updates message.status and status timestamp
7. Inserts event in message_status_events table
8. Updates campaign metrics
9. Returns 200 OK
```

### Email Status Update Flow

```
1. SES sends POST /webhooks/email (via SNS)
2. Parses SNS notification and inner message
3. Extracts messageId and eventType
4. Maps eventType to status (Delivery → delivered, etc.)
5. Checks for duplicate event
6. Finds message by provider_message_id
7. Updates message status
8. Inserts event in message_status_events table
9. Updates campaign metrics
10. Returns 200 OK
```

## Database Updates

### message_status_events Table

Records every status update for audit trail:
```sql
CREATE TABLE message_status_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  provider_message_id TEXT,
  old_status TEXT,
  new_status TEXT,
  event_timestamp TIMESTAMP,
  webhook_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);
```

### messages Table Updates

When a webhook arrives:
- `status` column updated to new status
- Appropriate timestamp column updated:
  - `sent` → `sent_at`
  - `delivered` → `delivered_at`
  - `read` → `read_at`
  - `failed` → `failed_at`
- `updated_at` timestamp refreshed

## Idempotency & Reliability

### Duplicate Event Handling
- Checks if exact status already exists for message
- Prevents duplicate processing if same status arrives multiple times
- Logged for debugging

### Error Handling
- Malformed webhooks don't crash server
- Invalid signatures rejected gracefully
- Missing messages logged but don't cause errors
- Database errors handled with proper error responses

### Event Logging
- All webhook events logged in memory (last 1000)
- Available via `/webhooks/events` endpoint
- Useful for debugging and auditing

## Testing

### Basic Tests

Run basic webhook endpoint tests:
```bash
node test-webhooks.js
```

Tests:
- Webhook health endpoint
- WhatsApp verification
- WhatsApp status updates
- Email webhook processing
- Event retrieval

### Integration Tests

Run integration tests with database operations:
```bash
# Requires server running and database seeded
node test-webhook-integration.js
```

Tests:
- Endpoint accessibility
- WhatsApp status webhook with database updates
- Message status events logging
- Email webhook processing
- Event retrieval

### Manual Testing with curl

**Test WhatsApp verification:**
```bash
curl "http://localhost:5173/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=test-verify-token-whatsapp&hub_challenge=test-challenge-123"
```

**Send WhatsApp status update:**
```bash
curl -X POST http://localhost:5173/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test-signature" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "test",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "statuses": [{
            "id": "wamid.test123",
            "status": "sent",
            "timestamp": 1699999999
          }]
        }
      }]
    }]
  }'
```

**Test health endpoint:**
```bash
curl http://localhost:5173/webhooks/health
```

**Check recent events:**
```bash
curl "http://localhost:5173/webhooks/events?limit=10"
```

## Production Deployment Checklist

- [ ] Set `ENABLE_WEBHOOK_VERIFICATION=true`
- [ ] Configure real webhook secrets from Meta and AWS
- [ ] Set up Meta WhatsApp webhook in Business Suite
- [ ] Set up AWS SES SNS topic for email events
- [ ] Configure webhook URLs in provider consoles
- [ ] Test with actual provider webhooks
- [ ] Monitor webhook logs for errors
- [ ] Set up alerting for webhook failures
- [ ] Document webhook IP allowlist if applicable
- [ ] Implement rate limiting if needed

## Troubleshooting

### Webhook not received
1. Verify webhook URL is publicly accessible
2. Check provider webhook configuration (Meta, SES)
3. Verify verify token matches (WhatsApp)
4. Check firewall/CORS settings

### Status not updating
1. Check `/webhooks/events` for received events
2. Verify provider_message_id matches message in database
3. Check `message_status_events` table for entries
4. Review server logs for errors

### Duplicate events processing
1. Check idempotency logic in code
2. Review recent events via `/webhooks/events`
3. Check `message_status_events` table for duplicates

## Future Enhancements

- [ ] Webhook retry queue with exponential backoff
- [ ] Rate limiting per provider
- [ ] Webhook signature validation for Brevo/email providers
- [ ] Real-time SSE push to frontend (Phase 2 ENG-23)
- [ ] Webhook event persistence in database (beyond memory)
- [ ] Webhook event replay capability
- [ ] Provider-specific error handling

## References

- [Meta WhatsApp Cloud API - Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [AWS SES Event Types](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-sns-topics.html)
- [Brevo Webhooks](https://developers.brevo.com/docs/webhooks)
