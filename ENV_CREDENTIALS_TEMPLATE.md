# backend/.env - Credentials Template

Copy this template and fill in YOUR actual credentials from AWS, Twilio, and Meta.

```bash
# ============================================================================
# DATABASE (PostgreSQL) - ALREADY CONFIGURED
# ============================================================================
DATABASE_URL=postgresql://engageninja:engageninja@localhost:5432/engageninja?sslmode=disable

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=5173
BACKEND_PORT=5173
NODE_ENV=development
CORS_ORIGIN=http://localhost:3173
SESSION_SECRET=dev-session-secret-change-in-production
SESSION_TIMEOUT_DAYS=30

# ============================================================================
# SECURITY - CHANGE IN PRODUCTION
# ============================================================================
ENCRYPTION_KEY=your-encryption-key-for-storing-credentials
ENABLE_WEBHOOK_VERIFICATION=true

# ============================================================================
# EMAIL (AWS SES) - FILL IN YOUR CREDENTIALS
# ============================================================================
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=AKIA...                          # From AWS IAM
SES_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MD...        # From AWS IAM
SES_SENDER_EMAIL=your-verified-email@example.com   # Must be verified in SES console
SES_CONFIGURATION_SET=engageninja-email-events

# ============================================================================
# SMS (TWILIO) - FILL IN YOUR CREDENTIALS
# ============================================================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # From Twilio console
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx     # From Twilio console
TWILIO_PHONE_NUMBER=+15551234567                       # Your Twilio phone number
# Optional: If using messaging service SID for 10DLC/shortcodes:
# TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxx

# ============================================================================
# WHATSAPP (META) - FILL IN YOUR CREDENTIALS
# ============================================================================
META_BUSINESS_ACCOUNT_ID=123456789012345          # From Meta for Business
META_WHATSAPP_ACCESS_TOKEN=EAA...                 # From Meta System Users

# Note: Phone Number ID is configured per-tenant in the database
# See: tenant_channel_settings table

# ============================================================================
# STRIPE (OPTIONAL - for billing)
# ============================================================================
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================================================
# OPTIONAL FEATURES
# ============================================================================
ENABLE_AI_FEATURES=true
ENABLE_EMAIL_FEATURES=true
SSE_HEARTBEAT_INTERVAL_MS=30000

# ============================================================================
# AWS SQS & SNS (for production message queues)
# ============================================================================
# SQS_OUTBOUND_MESSAGES_URL=https://sqs.us-east-1.amazonaws.com/...
# SQS_SMS_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/...
# SQS_EMAIL_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/...
# SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/...
# SNS_SMS_EVENTS_TOPIC_ARN=arn:aws:sns:...
# SNS_EMAIL_EVENTS_TOPIC_ARN=arn:aws:sns:...

# ============================================================================
# LAMBDA METRICS CALLBACK (for production)
# ============================================================================
# METRICS_ENDPOINT=http://localhost:5173/webhooks/internal/metrics
# METRICS_AUTH_TOKEN=secret-token-for-lambda-callbacks
```

---

## How to Find Each Credential

### 🔑 AWS SES Credentials

**Access Key ID & Secret**:
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → Find "engageninja-app" user
3. Click "Security credentials" tab
4. Under "Access keys", click "Create access key"
5. Copy `Access key ID` → `SES_ACCESS_KEY_ID`
6. Copy `Secret access key` → `SES_SECRET_ACCESS_KEY`

**Sender Email**:
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Go to "Verified identities"
3. Choose a verified email → Copy to `SES_SENDER_EMAIL`
4. If none verified, verify your email first

**Region**:
- Usually `us-east-1` (check your SES console)
- Update `SES_REGION` if different

### 📱 Twilio Credentials

**Account SID & Auth Token**:
1. Go to [Twilio Console](https://console.twilio.com/)
2. Look at "Account" in left sidebar
3. Copy "Account SID" → `TWILIO_ACCOUNT_SID`
4. Copy "Auth Token" → `TWILIO_AUTH_TOKEN`

**Phone Number**:
1. Go to "Phone Numbers" → "Manage"
2. Find your Twilio number (e.g., +15551234567)
3. Copy to `TWILIO_PHONE_NUMBER`

**Messaging Service SID** (optional):
- If using 10DLC/shortcodes, find it under "Messaging" → "Services"
- Copy to `TWILIO_MESSAGING_SERVICE_SID`

### 💬 Meta WhatsApp Credentials

**Access Token**:
1. Go to [Meta for Business](https://business.facebook.com/)
2. Go to "Settings" → "System Users"
3. Find your system user
4. Click "Generate new token"
5. Select your app and copy token → `META_WHATSAPP_ACCESS_TOKEN`

**Business Account ID**:
1. Go to "Settings" → "Business Information"
2. Copy "Business Account ID" → `META_BUSINESS_ACCOUNT_ID`

**Phone Number ID**:
- Per-tenant in database
- Set via UI: Settings → WhatsApp Channel → Configure
- Stored in `tenant_channel_settings` table

---

## How to Update Your .env File

### Option 1: Manual Edit

```bash
# Open in your editor
nano backend/.env

# Or use VS Code
code backend/.env
```

Find and replace:
- `SES_ACCESS_KEY_ID=` → Add your AWS access key
- `SES_SECRET_ACCESS_KEY=` → Add your AWS secret
- `SES_SENDER_EMAIL=` → Add your verified email
- `TWILIO_ACCOUNT_SID=` → Add your Twilio SID
- `TWILIO_AUTH_TOKEN=` → Add your Twilio token
- `TWILIO_PHONE_NUMBER=` → Add your Twilio number
- `META_BUSINESS_ACCOUNT_ID=` → Add your Meta account ID
- `META_WHATSAPP_ACCESS_TOKEN=` → Add your Meta token

Save and close.

### Option 2: Using env-example

```bash
# Copy the example
cp backend/.env.example backend/.env

# Open to edit credentials
nano backend/.env
```

### Option 3: Using Terraform Variables

If your terraform.tfvars has these values:

```bash
# Extract from terraform.tfvars (if available)
grep -E "(aws_access|aws_secret|twilio|meta)" Terraform/terraform.tfvars
```

---

## Verification Checklist

Before restarting backend:

- [ ] `SES_ACCESS_KEY_ID` is filled (starts with AKIA)
- [ ] `SES_SECRET_ACCESS_KEY` is filled (long string)
- [ ] `SES_SENDER_EMAIL` is a verified email in AWS SES
- [ ] `TWILIO_ACCOUNT_SID` is filled (starts with AC)
- [ ] `TWILIO_AUTH_TOKEN` is filled (long string)
- [ ] `TWILIO_PHONE_NUMBER` is filled with E.164 format (+15551234567)
- [ ] `META_BUSINESS_ACCOUNT_ID` is filled
- [ ] `META_WHATSAPP_ACCESS_TOKEN` is filled
- [ ] `ENCRYPTION_KEY` is filled (or keep the dev default)
- [ ] No credentials are surrounded by quotes (e.g., `KEY=value` not `KEY="value"`)

---

## Testing After Configuration

Once credentials are filled in:

```bash
# 1. Restart backend
npm run dev:backend

# 2. Run test script
bash backend/scripts/test-real-channels.sh

# 3. Check output for:
# ✅ All three campaigns created successfully
# ✅ No credential errors in console

# 4. Send test messages
# Via UI: Create campaign → Send to test recipients
# Monitor in AWS SES / Twilio / Meta consoles
```

---

## Security Reminders

🔒 **DO NOT**:
- Commit credentials to git
- Share .env file with anyone
- Hardcode credentials in source code
- Use production credentials for local testing

✅ **DO**:
- Keep .env in .gitignore (already done)
- Rotate credentials regularly
- Use AWS Secrets Manager for production
- Use environment-specific credentials

---

## Troubleshooting

**"Error: Invalid AWS credentials"**
→ Double-check Access Key ID and Secret in AWS console

**"Error: Invalid Twilio credentials"**
→ Verify Account SID and Auth Token in Twilio console

**"Invalid Meta token"**
→ Token may have expired, generate a new one

**"Connection refused" for database**
→ Ensure PostgreSQL is running: `docker ps` or check local service

---

**Need help?** See `REAL_TESTING_SETUP.md` for detailed instructions.
