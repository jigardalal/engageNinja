# Real Testing Setup - All Three Channels

This guide configures EngageNinja for **real testing** with Email (AWS SES), SMS (Twilio), and WhatsApp (Meta).

## Current Status

✅ **Database**: PostgreSQL running locally
✅ **Backend**: All APIs functional
✅ **Test Data**: 5 campaigns created successfully (Email, SMS, WhatsApp)

❌ **Credentials**: Currently using empty/placeholder values in `backend/.env`

## What You Need to Provide

You mentioned having credentials configured in terraform. Here's what to gather:

### 1. AWS SES (Email)
**Location**: AWS Console → IAM → Users → engageninja-app → Security Credentials
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `SES_SENDER_EMAIL` - A verified sender email (must be verified in SES)
- `AWS_REGION` - us-east-1 (or your region)

**Verification**: Your email must be verified in AWS SES console

### 2. Twilio (SMS)
**Location**: Twilio Console → Account Dashboard
- `TWILIO_ACCOUNT_SID` - Your account SID (starts with AC)
- `TWILIO_AUTH_TOKEN` - Your auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (E.164 format: +15551234567)
- `TWILIO_MESSAGING_SERVICE_SID` - (Optional) Your messaging service SID if using shortcodes/10DLC

**Note**: Can use either a Twilio phone number OR messaging service SID

### 3. Meta WhatsApp
**Location**: Meta for Business → Settings → System Users
- `META_BUSINESS_ACCOUNT_ID` - Your business account ID
- `META_WHATSAPP_ACCESS_TOKEN` - Your access token (long-lived)
- `META_PHONE_NUMBER_ID` - Your WhatsApp phone number ID

**Verification**: Must have WhatsApp Business API app created and configured

### 4. Optional - Stripe (for Billing)
**Location**: Stripe Dashboard → API Keys
- `STRIPE_SECRET_KEY` - Your test/live secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

---

## How to Update backend/.env

Use the complete template in `backend/.env.example` as reference. Fill in YOUR credentials:

```bash
# 1. Copy the example file
cp backend/.env.example backend/.env.new

# 2. Edit with your real credentials
nano backend/.env.new

# 3. Replace current .env
mv backend/.env.new backend/.env

# 4. Restart backend
npm run dev:backend
```

### Credentials to Fill In

**Email (SES):**
```
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID_HERE
SES_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY_HERE
SES_SENDER_EMAIL=YOUR_VERIFIED_EMAIL@example.com
```

**SMS (Twilio):**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+15551234567
# TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxx (optional)
```

**WhatsApp (Meta):**
```
META_BUSINESS_ACCOUNT_ID=YOUR_BUSINESS_ACCOUNT_ID
META_WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
# Plus Phone Number ID (stored per-tenant in database)
```

**Encryption & Security:**
```
ENCRYPTION_KEY=your-encryption-key-for-storing-credentials
ENABLE_WEBHOOK_VERIFICATION=true
```

---

## Restore Full Configuration

If you have your terraform variables or previous .env backup:

```bash
# Option 1: Use terraform.tfvars as reference
cat Terraform/terraform.tfvars  # Check infrastructure config

# Option 2: Check git history for previous .env
git show HEAD~5:backend/.env    # Find a recent backup

# Option 3: Use AWS Secrets Manager (if configured)
aws secretsmanager get-secret-value --secret-id engageninja-config
```

---

## Testing Plan (Real Channels)

Once credentials are configured:

### 1. **Email Campaign Test**
```bash
# Create and send to test email
curl -X POST http://localhost:5173/api/campaigns \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{
    "name": "Real Email Test",
    "channel": "email",
    "message_content": "Testing SES integration"
  }'

# Check AWS SES console for delivery status
```

### 2. **SMS Campaign Test**
```bash
# Create and send to test phone
curl -X POST http://localhost:5173/api/campaigns \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{
    "name": "Real SMS Test",
    "channel": "sms",
    "message_content": "Testing Twilio SMS"
  }'

# Check Twilio console for delivery status
```

### 3. **WhatsApp Campaign Test**
```bash
# Create and send to test number
curl -X POST http://localhost:5173/api/campaigns \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{
    "name": "Real WhatsApp Test",
    "channel": "whatsapp",
    "message_content": "Testing Meta WhatsApp"
  }'

# Check Meta Business Manager for delivery status
```

### 4. **Webhook Verification**
```bash
# Once messages are sent, enable webhook verification
# to test delivery confirmations:
ENABLE_WEBHOOK_VERIFICATION=true npm run dev:backend

# Monitor logs for incoming webhook events
```

---

## Credential Security Notes

🔒 **IMPORTANT**:
- Never commit credentials to git
- Use `.env` file (already in `.gitignore`)
- Consider using AWS Secrets Manager for production
- Rotate credentials regularly
- Each tenant can have their own credentials (stored encrypted in database)

---

## What Happens After Configuration

1. **Backend stores encrypted credentials** in `tenant_channel_settings` table
2. **Campaign sends** directly via provider APIs (SES, Twilio, Meta)
3. **Webhooks** receive delivery status updates
4. **SSE** streams real-time updates to frontend
5. **Metrics** tracked in database for billing

---

## Troubleshooting

**Email not sending?**
- Check SES verified senders in AWS console
- Verify AWS access keys are valid
- Check SES rate limits and sandbox mode

**SMS not sending?**
- Verify Twilio account has active phone number
- Check phone number format (E.164)
- Verify Twilio account has SMS credits

**WhatsApp not sending?**
- Verify access token is long-lived (not expiring soon)
- Check phone number is properly configured in Meta
- Verify business account is approved for API access

---

## Next Steps

1. **Gather credentials** from AWS, Twilio, and Meta consoles
2. **Update backend/.env** with real values
3. **Restart backend**: `npm run dev:backend`
4. **Run real tests** for all three channels
5. **Monitor delivery** in respective service consoles
