# EngageNinja Twilio Integration - Implementation Plan

**Document Status**: Implementation Roadmap
**Created**: 2025-12-20
**Scope**: SMS, WhatsApp, Email with multi-tenant 10DLC support
**Timeline**: SMS first → WhatsApp → Email

---

## Phase 1: Database Schema & Data Models

### 1.1 Create Migration Files

**Files to create** (in `backend/db/migrations/`):

#### `014_tenant_business_info.sql`
```sql
CREATE TABLE tenant_business_info (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  -- Business Details (tenant-editable)
  legal_business_name TEXT NOT NULL,
  dba_name TEXT,
  business_website TEXT,
  business_type TEXT,  -- 'sole_proprietor', 'llc', 'corporation', etc.
  industry_vertical TEXT,

  -- Registration (tenant-editable)
  business_registration_number TEXT,  -- EIN or equivalent
  country TEXT NOT NULL,
  business_address TEXT NOT NULL,
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,

  -- Owner/Principal Contact (tenant-editable)
  owner_name TEXT NOT NULL,
  owner_title TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,

  -- Business Contact (can differ from owner)
  business_contact_name TEXT,
  business_contact_email TEXT,
  business_contact_phone TEXT,

  -- SMS/Messaging Specifics
  monthly_sms_volume_estimate INTEGER,
  use_case_description TEXT,

  -- Compliance
  sms_opt_in_language TEXT,
  gdpr_compliant BOOLEAN DEFAULT 0,
  tcpa_compliant BOOLEAN DEFAULT 0,

  -- Verification Status
  verification_status TEXT DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
  verification_failed_reason TEXT,
  verified_by_admin TEXT,
  verified_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_tenant_business_info_tenant_id ON tenant_business_info(tenant_id);
CREATE INDEX idx_tenant_business_info_verification_status ON tenant_business_info(verification_status);
```

#### `015_tenant_10dlc_brands.sql`
```sql
CREATE TABLE tenant_10dlc_brands (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- NOT UNIQUE - can have multiple if resubmitted

  -- Brand Info (snapshot at submission - locked after approval)
  legal_business_name TEXT NOT NULL,
  business_registration_number TEXT,
  country TEXT NOT NULL,
  business_address TEXT NOT NULL,  -- LOCKED after approval
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,

  -- Owner/Contact Info (locked)
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,

  -- Twilio 10DLC Registration
  twilio_brand_sid TEXT UNIQUE,
  twilio_brand_status TEXT,  -- 'draft', 'pending', 'approved', 'rejected'
  twilio_brand_status_reason TEXT,

  -- Phone Number Provisioning
  twilio_phone_number TEXT UNIQUE,
  twilio_phone_number_sid TEXT UNIQUE,
  twilio_phone_status TEXT,  -- 'active', 'provisioning', 'failed'

  -- Campaign Type
  campaign_type TEXT,  -- 'marketing', 'transactional', 'support', 'two_way'

  -- Versioning & Status
  is_active BOOLEAN DEFAULT 1,  -- Current active registration
  deprecation_reason TEXT,

  -- Dates
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  twilio_verified_at TIMESTAMP,
  twilio_approved_at TIMESTAMP,  -- Once set, record is READ-ONLY

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_tenant_10dlc_brands_tenant_id ON tenant_10dlc_brands(tenant_id);
CREATE INDEX idx_tenant_10dlc_brands_active ON tenant_10dlc_brands(tenant_id, is_active);
CREATE INDEX idx_tenant_10dlc_brands_twilio_brand_sid ON tenant_10dlc_brands(twilio_brand_sid);
```

#### `016_tenant_channel_credentials_v2.sql`
```sql
CREATE TABLE tenant_channel_credentials_v2 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,  -- 'sms', 'whatsapp', 'email'
  provider TEXT NOT NULL,  -- 'twilio', 'aws_ses'

  -- Twilio Credentials
  twilio_account_sid TEXT,
  twilio_auth_token_encrypted TEXT,  -- AES-192-CBC encrypted

  -- AWS SES Credentials
  aws_access_key_id_encrypted TEXT,
  aws_secret_access_key_encrypted TEXT,
  aws_region TEXT,

  -- Channel Status
  is_enabled BOOLEAN DEFAULT 0,
  is_verified BOOLEAN DEFAULT 0,
  verification_error TEXT,
  verified_at TIMESTAMP,

  -- Webhook Configuration
  webhook_secret_encrypted TEXT,
  webhook_url TEXT,

  -- Provider-Specific Data
  provider_config_json TEXT,

  -- Dates
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  UNIQUE(tenant_id, channel),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_tenant_channel_credentials_v2_tenant_id ON tenant_channel_credentials_v2(tenant_id);
```

#### `017_message_provider_mappings.sql`
```sql
CREATE TABLE message_provider_mappings (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,

  channel TEXT NOT NULL,  -- 'sms', 'whatsapp', 'email'
  provider TEXT NOT NULL,  -- 'twilio', 'aws_ses', 'demo'
  provider_message_id TEXT UNIQUE,  -- ID from provider for webhook matching
  provider_status TEXT,  -- Last status from provider

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  UNIQUE(message_id, provider),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX idx_message_provider_mappings_provider_message_id ON message_provider_mappings(provider_message_id);
CREATE INDEX idx_message_provider_mappings_message_id ON message_provider_mappings(message_id);
```

#### `018_sms_phone_pool.sql`
```sql
CREATE TABLE sms_phone_pool (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  twilio_phone_number_sid TEXT UNIQUE,

  tenant_id TEXT,  -- NULL if unallocated
  allocated_at TIMESTAMP,

  status TEXT DEFAULT 'active',  -- 'active', 'retired', 'failed'
  failure_reason TEXT,

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_sms_phone_pool_tenant_id ON sms_phone_pool(tenant_id);
CREATE INDEX idx_sms_phone_pool_status ON sms_phone_pool(status);
```

### 1.2 Extend Existing Tables

#### Update `tenants` table
**File**: `backend/db/migrations/019_add_demo_flag_to_tenants.sql`

```sql
ALTER TABLE tenants ADD COLUMN is_demo BOOLEAN DEFAULT 0;
ALTER TABLE tenants ADD COLUMN demo_created_by TEXT;
ALTER TABLE tenants ADD COLUMN demo_created_at TIMESTAMP;

CREATE INDEX idx_tenants_is_demo ON tenants(is_demo);
```

#### Update `messages` table
**File**: `backend/db/migrations/020_add_channel_fields_to_messages.sql`

```sql
ALTER TABLE messages ADD COLUMN channel TEXT;  -- 'sms', 'whatsapp', 'email'
ALTER TABLE messages ADD COLUMN provider TEXT;  -- 'twilio', 'aws_ses'
ALTER TABLE messages ADD COLUMN phone_number TEXT;  -- For SMS/WhatsApp
ALTER TABLE messages ADD COLUMN provider_account_sid TEXT;

CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_provider ON messages(provider);
```

#### Update `campaigns` table
**File**: `backend/db/migrations/021_add_channel_fields_to_campaigns.sql`

```sql
ALTER TABLE campaigns ADD COLUMN channel TEXT;  -- 'sms', 'whatsapp', 'email'
ALTER TABLE campaigns ADD COLUMN provider TEXT;  -- 'twilio', 'aws_ses'

CREATE INDEX idx_campaigns_channel ON campaigns(channel);
CREATE INDEX idx_campaigns_provider ON campaigns(provider);
```

### 1.3 Run & Test Migrations

```bash
# Run migrations locally
npm run db:reset

# Verify schema
sqlite3 backend/database.sqlite ".schema tenant_business_info"
sqlite3 backend/database.sqlite ".schema tenant_10dlc_brands"
# etc.
```

---

## Phase 2: Provider Abstraction Layer

### 2.1 Create Base Provider Interface

**File**: `backend/src/services/messaging/MessagingProvider.js`

```javascript
/**
 * Abstract base class for messaging providers.
 * All providers (Twilio SMS, Twilio WhatsApp, AWS SES) extend this.
 */
class MessagingProvider {
  // Constructor receives tenant credentials
  constructor(tenantId, credentials) {
    this.tenantId = tenantId;
    this.credentials = credentials;
  }

  // Send a single message
  async send(message) {
    throw new Error('send() must be implemented');
  }

  // Verify credentials are valid
  async verify() {
    throw new Error('verify() must be implemented');
  }

  // Parse incoming webhook
  parseWebhook(body, signature) {
    throw new Error('parseWebhook() must be implemented');
  }

  // Get account status
  async getStatus() {
    throw new Error('getStatus() must be implemented');
  }
}

module.exports = MessagingProvider;
```

### 2.2 Implement Twilio SMS Provider

**File**: `backend/src/services/messaging/TwilioSmsProvider.js`

```javascript
const MessagingProvider = require('./MessagingProvider');
const twilio = require('twilio');

class TwilioSmsProvider extends MessagingProvider {
  constructor(tenantId, credentials) {
    super(tenantId, credentials);
    this.client = twilio(
      credentials.twilio_account_sid,
      credentials.twilio_auth_token
    );
  }

  async send(message) {
    // message = {
    //   id, tenant_id, contact_id, phone_number,
    //   content, template_id, variables, ...
    // }

    const result = await this.client.messages.create({
      from: this.credentials.twilio_phone_number,
      to: message.phone_number,
      body: message.content
    });

    return {
      success: true,
      provider_message_id: result.sid,
      status: 'sent'
    };
  }

  async verify() {
    // Test credentials by fetching account info
    const account = await this.client.api.accounts.list({ limit: 1 });
    return { success: true };
  }

  parseWebhook(body, signature) {
    // Validate Twilio webhook signature
    // Return parsed event
    return {
      message_id: body.MessageSid,
      status: body.MessageStatus,
      timestamp: new Date()
    };
  }

  async getStatus() {
    const account = await this.client.api.accounts(this.credentials.twilio_account_sid).fetch();
    return {
      status: 'active',
      balance: account.balance,
      account_type: account.type
    };
  }
}

module.exports = TwilioSmsProvider;
```

### 2.3 Implement AWS SES Email Provider

**File**: `backend/src/services/messaging/SESEmailProvider.js`

```javascript
const MessagingProvider = require('./MessagingProvider');
const AWS = require('aws-sdk');

class SESEmailProvider extends MessagingProvider {
  constructor(tenantId, credentials) {
    super(tenantId, credentials);
    this.client = new AWS.SES({
      region: credentials.aws_region,
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key
    });
  }

  async send(message) {
    const result = await this.client.sendEmail({
      Source: message.from_email,
      Destination: { ToAddresses: [message.to_email] },
      Message: {
        Subject: { Data: message.subject },
        Body: { Html: { Data: message.html_body } }
      }
    }).promise();

    return {
      success: true,
      provider_message_id: result.MessageId,
      status: 'sent'
    };
  }

  async verify() {
    // Verify SES sender email
    const identities = await this.client.listVerifiedEmailAddresses().promise();
    return { success: identities.VerifiedEmailAddresses.length > 0 };
  }

  parseWebhook(body, signature) {
    // SNS message wrapping SES notification
    const parsed = JSON.parse(body.Message);
    return {
      message_id: parsed.mail.messageId,
      status: parsed.eventType,  // 'Bounce', 'Delivery', 'Send', etc.
      timestamp: new Date(parsed.mail.timestamp)
    };
  }

  async getStatus() {
    const quota = await this.client.getSendQuota().promise();
    return {
      status: 'active',
      daily_quota: quota.Max24HourSend,
      daily_sent: quota.SentLast24Hour,
      max_rate: quota.MaxSendRate
    };
  }
}

module.exports = SESEmailProvider;
```

### 2.4 Provider Factory

**File**: `backend/src/services/messaging/providerFactory.js`

```javascript
const TwilioSmsProvider = require('./TwilioSmsProvider');
const SESEmailProvider = require('./SESEmailProvider');
const DemoProvider = require('./DemoProvider');
const db = require('../../db');

/**
 * Factory to get the correct provider instance for a tenant/channel
 */
async function getProvider(tenantId, channel) {
  const tenant = db.prepare('SELECT is_demo FROM tenants WHERE id = ?').get(tenantId);

  if (tenant.is_demo) {
    return new DemoProvider(tenantId, { channel });
  }

  const credentials = db.prepare(`
    SELECT * FROM tenant_channel_credentials_v2
    WHERE tenant_id = ? AND channel = ?
  `).get(tenantId, channel);

  if (!credentials) {
    throw new Error(`No credentials found for tenant ${tenantId}, channel ${channel}`);
  }

  const provider = credentials.provider;

  if (provider === 'twilio' && channel === 'sms') {
    return new TwilioSmsProvider(tenantId, credentials);
  }

  if (provider === 'aws_ses' && channel === 'email') {
    return new SESEmailProvider(tenantId, credentials);
  }

  throw new Error(`Unsupported provider/channel: ${provider}/${channel}`);
}

module.exports = { getProvider };
```

---

## Phase 3: AWS Infrastructure Setup

### 3.1 Create SQS Queues

**Manual AWS Console OR Terraform**:

```bash
# Create outbound message queue
aws sqs create-queue \
  --queue-name engageninja-messages-dev \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600 \
  --region us-east-1

# Create email events queue
aws sqs create-queue \
  --queue-name engageninja-email-events-dev \
  --region us-east-1

# Create SMS events queue
aws sqs create-queue \
  --queue-name engageninja-sms-events-dev \
  --region us-east-1

# Create DLQ for failed messages
aws sqs create-queue \
  --queue-name engageninja-messages-dlq-dev \
  --region us-east-1
```

### 3.2 Create SNS Topics

```bash
# Email events topic
aws sns create-topic \
  --name engageninja-email-events-dev \
  --region us-east-1

# SMS events topic
aws sns create-topic \
  --name engageninja-sms-events-dev \
  --region us-east-1
```

### 3.3 Subscribe SQS to SNS

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:433088583514:engageninja-email-events-dev \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:433088583514:engageninja-email-events-dev \
  --region us-east-1
```

### 3.4 Create Lambda Functions

**Files to create**:

#### `backend/lambda/functions/processMessageQueue/index.js`
- Polls SQS for outbound messages
- Calls appropriate provider (Twilio/SES/Demo)
- Handles retries and DLQ

#### `backend/lambda/functions/demoStatusUpdate/index.js`
- Scheduled by EventBridge
- Updates message status in DB
- Broadcasts via SSE

#### `backend/lambda/functions/demoTenantApprove/index.js`
- Scheduled by EventBridge
- Auto-approves 10DLC for demo tenants

---

## Phase 4: API Endpoints

### 4.1 Tenant Business Info Routes

**File**: `backend/src/routes/businessInfo.js`

```
GET  /api/business-info                 # Get current business info
POST /api/business-info                 # Create or update business info
GET  /api/10dlc/form                    # Get pre-populated 10DLC form
POST /api/10dlc/submit                  # Submit 10DLC registration
GET  /api/10dlc/status                  # Check 10DLC approval status
GET  /api/10dlc/registrations           # List all registrations (current + historical)
```

### 4.2 Campaign Sending Routes

**File**: `backend/src/routes/campaigns.js` (extend existing)

```
POST /api/campaigns/:id/send             # Send campaign
  - Validates 10DLC approved
  - Queues messages to SQS
  - Returns campaign status

POST /api/campaigns/:id/pause            # Pause campaign
GET  /api/campaigns/:id/status           # Get campaign + message statuses
GET  /api/campaigns/:id/sse              # SSE stream for real-time updates
```

### 4.3 Webhook Routes

**File**: `backend/src/routes/webhooks.js` (extend existing)

```
POST /api/webhooks/twilio/sms            # Twilio SMS status updates
POST /api/webhooks/twilio/whatsapp       # Twilio WhatsApp status updates
POST /api/webhooks/aws/ses               # AWS SES bounce/delivery/complaint
```

---

## Phase 5: Frontend UI

### 5.1 Business Info Form

**File**: `frontend/src/pages/BusinessInfoPage.jsx`

- Pre-populated from API
- Form validation
- Submit handling
- Display current vs. approved info comparison

### 5.2 10DLC Registration Flow

**File**: `frontend/src/pages/TenantSettings/10DLCRegistration.jsx`

- Show registration status
- Display approval timeline (demo vs. real)
- Show current phone number
- Option to resubmit if info changed

### 5.3 Campaign Sending with Channel Selection

**File**: `frontend/src/pages/CampaignSend.jsx` (extend existing)

- Select channel (SMS, WhatsApp, Email)
- Pre-fill recipient phone/email based on channel
- Show demo badge if demo tenant
- Show "Messages will be simulated" warning in demo mode

---

## Phase 6: Testing Strategy

### 6.1 Unit Tests
- Provider classes (mock Twilio/SES)
- Message queue processor
- Webhook parsing

### 6.2 Integration Tests
- Database schema integrity
- Provider factory
- API endpoints (auth + RBAC)
- SQS queue flow

### 6.3 E2E Tests (Puppeteer)
- Complete 10DLC submission (real + demo)
- Campaign sending (SMS, WhatsApp, Email)
- Real-time status updates
- Webhook ingestion

### 6.4 Manual Testing
- Test real Twilio account
- Test real AWS SES
- Test demo mode workflow
- Test error scenarios (invalid phone, SES bounce, etc.)

---

## Dependencies & Critical Path

```
Phase 1: Database Schema
  ↓
Phase 2: Provider Abstraction
  ├─ Can start testing with mocks
  ├─ DemoProvider ready immediately
  └─ Real providers need AWS credentials
    ↓
Phase 3: AWS Infrastructure
  ├─ SQS, SNS, Lambda
  └─ EventBridge rules for demo
    ↓
Phase 4: API Endpoints
  ├─ Business info endpoints
  ├─ 10DLC submission
  └─ Campaign sending
    ↓
Phase 5: Frontend UI
  ├─ Business info form
  ├─ 10DLC registration
  └─ Campaign sending
    ↓
Phase 6: Testing
```

---

## Success Criteria per Phase

### Phase 1: ✅ Complete
- [ ] All migrations run without errors
- [ ] Schema matches ARCHITECTURE_TWILIO_MIGRATION.md
- [ ] Can insert test data

### Phase 2: ✅ Complete
- [ ] Provider factory resolves correct provider
- [ ] Mock providers work
- [ ] DemoProvider works (no external calls)

### Phase 3: ✅ Complete
- [ ] SQS queues created and accessible
- [ ] SNS topics created
- [ ] Lambda functions deployable
- [ ] Credentials stored in `.env`

### Phase 4: ✅ Complete
- [ ] All endpoints return correct responses
- [ ] RBAC enforced
- [ ] Tenant context validated
- [ ] SQS messages queued successfully

### Phase 5: ✅ Complete
- [ ] Forms submit successfully
- [ ] Real-time SSE updates work
- [ ] Demo badge displays
- [ ] Pre-population works

### Phase 6: ✅ Complete
- [ ] E2E SMS campaign works
- [ ] E2E Email campaign works
- [ ] Demo mode messages simulated
- [ ] Webhook events processed

---

## Next Immediate Action

**Start with Phase 1**: Create database migrations and run them locally.

Would you like me to proceed with creating and testing the migration files?
