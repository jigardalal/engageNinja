#!/bin/bash

###############################################################################
# REAL CHANNEL TESTING SCRIPT
# Tests Email (SES), SMS (Twilio), and WhatsApp (Meta) with real credentials
###############################################################################

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:5173}"
TENANT_ID="ba2fa939-450f-4a93-b0d0-8814bb6ecb42"
TEST_EMAIL="test@example.com"
TEST_PHONE="+15551234567"  # Update with your test number
TEST_WHATSAPP="+1234567890"  # Update with your test WhatsApp number

echo "=========================================="
echo "REAL CHANNEL TESTING"
echo "=========================================="
echo "Backend: $BACKEND_URL"
echo "Tenant: $TENANT_ID"
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
curl -s -c /tmp/cookies_real.txt -b /tmp/cookies_real.txt \
  -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@engageninja.local",
    "password": "AdminPassword123"
  }' > /dev/null

# Switch to tenant
curl -s -b /tmp/cookies_real.txt \
  -X POST "$BACKEND_URL/api/auth/switch-tenant" \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\": \"$TENANT_ID\"}" > /dev/null

echo "✅ Authenticated and switched to tenant"
echo ""

# ============================================================================
# 2. TEST EMAIL (SES)
# ============================================================================
echo "2️⃣  Testing EMAIL via SES..."

EMAIL_RESULT=$(curl -s -b /tmp/cookies_real.txt \
  -X POST "$BACKEND_URL/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Real Email Test - $(date +%H:%M:%S)\",
    \"description\": \"Testing AWS SES email delivery\",
    \"channel\": \"email\",
    \"subject\": \"EngageNinja Test Email\",
    \"message_content\": \"This is a real test email from EngageNinja. If you're seeing this, email delivery is working! ✅\"
  }")

EMAIL_ID=$(echo "$EMAIL_RESULT" | jq -r '.data.id // empty')

if [ ! -z "$EMAIL_ID" ]; then
  echo "✅ Email campaign created: $EMAIL_ID"
  echo "   Status: Draft"
  echo "   Channel: Email (AWS SES)"
  echo "   Next: Send via UI or API to test delivery"
  echo ""
else
  echo "❌ Email campaign creation failed"
  echo "Response: $EMAIL_RESULT"
  echo ""
fi

# ============================================================================
# 3. TEST SMS (TWILIO)
# ============================================================================
echo "3️⃣  Testing SMS via Twilio..."

SMS_RESULT=$(curl -s -b /tmp/cookies_real.txt \
  -X POST "$BACKEND_URL/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Real SMS Test - $(date +%H:%M:%S)\",
    \"description\": \"Testing Twilio SMS delivery\",
    \"channel\": \"sms\",
    \"message_content\": \"EngageNinja SMS test. Got this? Reply STOP to opt out. ✅\"
  }")

SMS_ID=$(echo "$SMS_RESULT" | jq -r '.data.id // empty')

if [ ! -z "$SMS_ID" ]; then
  echo "✅ SMS campaign created: $SMS_ID"
  echo "   Status: Draft"
  echo "   Channel: SMS (Twilio)"
  echo "   Phone: $TEST_PHONE"
  echo "   Next: Send via UI or API to test delivery"
  echo ""
else
  echo "❌ SMS campaign creation failed"
  echo "Response: $SMS_RESULT"
  echo ""
fi

# ============================================================================
# 4. TEST WHATSAPP (META)
# ============================================================================
echo "4️⃣  Testing WhatsApp via Meta..."

WA_RESULT=$(curl -s -b /tmp/cookies_real.txt \
  -X POST "$BACKEND_URL/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Real WhatsApp Test - $(date +%H:%M:%S)\",
    \"description\": \"Testing Meta WhatsApp delivery\",
    \"channel\": \"whatsapp\",
    \"template_id\": \"9325438A-83EF-4F05-B3BF-18F74F7509B6\",
    \"message_content\": \"EngageNinja WhatsApp test. Testing real message delivery via Meta API. ✅\"
  }")

WA_ID=$(echo "$WA_RESULT" | jq -r '.data.id // empty')

if [ ! -z "$WA_ID" ]; then
  echo "✅ WhatsApp campaign created: $WA_ID"
  echo "   Status: Draft"
  echo "   Channel: WhatsApp (Meta)"
  echo "   Next: Send via UI or API to test delivery"
  echo ""
else
  echo "❌ WhatsApp campaign creation failed"
  echo "Response: $WA_RESULT"
  echo ""
fi

# ============================================================================
# 5. SUMMARY
# ============================================================================
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Campaigns created for real testing:"

PGPASSWORD=engageninja psql -h localhost -U engageninja -d engageninja -c "
SELECT
  channel,
  COUNT(*) as total_campaigns,
  MAX(created_at) as latest
FROM campaigns
WHERE tenant_id = '$TENANT_ID'
GROUP BY channel
ORDER BY channel;
" 2>/dev/null || true

echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. CONFIGURE REAL CREDENTIALS"
echo "   📄 See: REAL_TESTING_SETUP.md"
echo "   - AWS SES credentials"
echo "   - Twilio credentials"
echo "   - Meta WhatsApp credentials"
echo ""
echo "2. UPDATE BACKEND .ENV"
echo "   Edit backend/.env and fill in:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - SES_SENDER_EMAIL"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - META_BUSINESS_ACCOUNT_ID"
echo "   - META_WHATSAPP_ACCESS_TOKEN"
echo ""
echo "3. RESTART BACKEND"
echo "   npm run dev:backend"
echo ""
echo "4. SEND TEST MESSAGES"
echo "   Use EngageNinja UI to send to test numbers"
echo "   Monitor delivery in:"
echo "   - AWS SES Console"
echo "   - Twilio Dashboard"
echo "   - Meta Business Manager"
echo ""
echo "5. VERIFY WEBHOOKS"
echo "   Check console for incoming webhook events"
echo "   Set ENABLE_WEBHOOK_VERIFICATION=true"
echo ""
echo "=========================================="
