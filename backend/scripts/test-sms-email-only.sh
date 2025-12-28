#!/bin/bash

###############################################################################
# SMS & EMAIL TESTING SCRIPT (Real AWS Infrastructure)
# Tests Twilio SMS and AWS SES Email with real AWS infrastructure
###############################################################################

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:5173}"
TENANT_ID="c6d7d3b6-982e-4c95-80f1-87f54d936b3a"  # Demo Tenant

echo "=========================================="
echo "SMS & EMAIL REAL INFRASTRUCTURE TEST"
echo "=========================================="
echo "Backend: $BACKEND_URL"
echo "Using: AWS RDS + Twilio + SES"
echo ""

# Check if backend is running
if ! curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
  echo "❌ Backend not running at $BACKEND_URL"
  echo "   Start with: npm run dev:backend"
  exit 1
fi

echo "✅ Backend is running"
echo ""

# ============================================================================
# 1. AUTHENTICATE
# ============================================================================
echo "1️⃣  Authenticating..."
curl -s -c /tmp/cookies_sms_email.txt -b /tmp/cookies_sms_email.txt \
  -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@engageninja.local",
    "password": "AdminPassword123"
  }' > /dev/null

# Switch to tenant
curl -s -b /tmp/cookies_sms_email.txt \
  -X POST "$BACKEND_URL/api/auth/switch-tenant" \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\": \"$TENANT_ID\"}" > /dev/null

echo "✅ Authenticated"
echo ""

# ============================================================================
# 2. TEST EMAIL (SES)
# ============================================================================
echo "2️⃣  Testing EMAIL via AWS SES..."
echo "   Creating test email campaign..."

EMAIL_RESULT=$(curl -s -b /tmp/cookies_sms_email.txt \
  -X POST "$BACKEND_URL/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Email Test - $(date +%Y-%m-%d\ %H:%M:%S)\",
    \"description\": \"Testing AWS SES email delivery with real infrastructure\",
    \"channel\": \"email\",
    \"subject\": \"Test Email from EngageNinja\",
    \"message_content\": \"This is a real test email sent via AWS SES from your EngageNinja infrastructure.\"
  }")

EMAIL_ID=$(echo "$EMAIL_RESULT" | jq -r '.data.id // empty')

if [ ! -z "$EMAIL_ID" ]; then
  echo "✅ Email campaign created"
  echo "   ID: $EMAIL_ID"
  echo "   Channel: Email (AWS SES)"
  echo "   Status: Draft (ready to send)"
  echo ""
else
  echo "❌ Email campaign creation failed"
  echo "   Response: $EMAIL_RESULT"
  echo ""
fi

# ============================================================================
# 3. TEST SMS (TWILIO)
# ============================================================================
echo "3️⃣  Testing SMS via Twilio..."
echo "   Creating test SMS campaign..."

SMS_RESULT=$(curl -s -b /tmp/cookies_sms_email.txt \
  -X POST "$BACKEND_URL/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"SMS Test - $(date +%Y-%m-%d\ %H:%M:%S)\",
    \"description\": \"Testing Twilio SMS delivery with real infrastructure\",
    \"channel\": \"sms\",
    \"message_content\": \"Test SMS from EngageNinja. This message was sent via Twilio using your real AWS infrastructure.\"
  }")

SMS_ID=$(echo "$SMS_RESULT" | jq -r '.data.id // empty')

if [ ! -z "$SMS_ID" ]; then
  echo "✅ SMS campaign created"
  echo "   ID: $SMS_ID"
  echo "   Channel: SMS (Twilio)"
  echo "   Status: Draft (ready to send)"
  echo ""
else
  echo "❌ SMS campaign creation failed"
  echo "   Response: $SMS_RESULT"
  echo ""
fi

# ============================================================================
# 4. SUMMARY
# ============================================================================
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""

PGPASSWORD=engageninja psql -h engageninja-pg-dev.cq9ese246m47.us-east-1.rds.amazonaws.com -U engageninja -d engageninja -c "
SELECT
  channel,
  COUNT(*) as total,
  MAX(created_at)::timestamp(0) as latest
FROM campaigns
WHERE tenant_id = '$TENANT_ID'
AND channel IN ('email', 'sms')
GROUP BY channel
ORDER BY channel;
" 2>/dev/null || echo "Note: Could not connect to RDS. Make sure you can reach the database."

echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Test Email Sending:"
echo "   - Go to EngageNinja UI"
echo "   - Click on the Email campaign"
echo "   - Add test recipients"
echo "   - Click 'Send'"
echo "   - Monitor AWS SES console for delivery"
echo ""
echo "2. Test SMS Sending:"
echo "   - Go to EngageNinja UI"
echo "   - Click on the SMS campaign"
echo "   - Add test phone numbers"
echo "   - Click 'Send'"
echo "   - Monitor Twilio dashboard for delivery"
echo ""
echo "3. Monitor Infrastructure:"
echo "   - SQS: Messages queued in engageninja-messages-dev"
echo "   - Lambda: engageninja-send-campaign-dev processes them"
echo "   - CloudWatch: Logs at /aws/engageninja/dev/app"
echo ""
echo "4. Webhook Events:"
echo "   - Check SNS topics for delivery status"
echo "   - View in AWS Console:"
echo "   - SNS → Topics → engageninja-sms-events-dev"
echo "   - SNS → Topics → engageninja-email-events-dev"
echo ""
echo "=========================================="
