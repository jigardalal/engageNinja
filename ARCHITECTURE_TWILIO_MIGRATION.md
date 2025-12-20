# EngageNinja Twilio Migration Architecture

**Document Status**: Draft - Ready for Review
**Created**: 2025-12-20
**Scope**: SMS, WhatsApp, and Email channel integration with Twilio and AWS SES
**Timeline**: SMS first, then WhatsApp, then Email

---

## Executive Summary

This document outlines the architecture for migrating EngageNinja to use Twilio for SMS and WhatsApp, and AWS SES for Email. Key characteristics:

- **Each tenant**: Gets their own Twilio phone number and 10DLC brand registration
- **EngageNinja manages**: 10DLC provisioning on behalf of tenants via Twilio API
- **Business info**: Collected upfront from tenants (legal name, EIN, address, etc.)
- **Verification flow**: Trigger 10DLC submission when tenant tries to send first SMS
- **Multi-channel**: Same 10DLC brand can be used for both SMS and WhatsApp
- **Provider abstraction**: New provider pattern to support Twilio (SMS/WhatsApp) and AWS SES (Email)
- **Message Queue**: AWS SQS + Lambda for reliable, scalable message processing
- **Demo Mode**: Full workflow simulation for sales/platform testing without sending real messages

---

## Part 1: Data Model Changes

### New Tables

#### 1. `tenant_10dlc_brands`
Stores 10DLC brand registrations per tenant. One brand per tenant.

```sql
CREATE TABLE tenant_10dlc_brands (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  -- Brand Info (collected from tenant)
  legal_business_name TEXT NOT NULL,
  business_registration_number TEXT,  -- EIN/Tax ID
  country TEXT NOT NULL,              -- e.g., 'US'
  business_address TEXT NOT NULL,     -- Full address
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,

  -- Owner/Contact Info
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,

  -- Twilio 10DLC Registration
  twilio_brand_sid TEXT UNIQUE,       -- Twilio's brand identifier
  twilio_brand_status TEXT,           -- 'draft', 'pending', 'approved', 'rejected'
  twilio_brand_status_reason TEXT,    -- Why rejected (if applicable)

  -- Phone Number Provisioning
  twilio_phone_number TEXT UNIQUE,    -- E.g., '+1234567890'
  twilio_phone_number_sid TEXT UNIQUE,
  twilio_phone_status TEXT,           -- 'active', 'provisioning', 'failed'

  -- Campaign Type (for Twilio compliance)
  campaign_type TEXT,                 -- 'marketing', 'transactional', 'support', 'two_way'

  -- Dates
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  twilio_verified_at TIMESTAMP,
  twilio_approved_at TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_tenant_10dlc_brands_tenant_id ON tenant_10dlc_brands(tenant_id);
CREATE INDEX idx_tenant_10dlc_brands_twilio_brand_sid ON tenant_10dlc_brands(twilio_brand_sid);
```

#### 2. `tenant_channel_credentials_v2`
Enhanced channel credentials storage (replaces/extends `tenant_channel_settings`).

```sql
CREATE TABLE tenant_channel_credentials_v2 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,              -- 'sms', 'whatsapp', 'email'
  provider TEXT NOT NULL,             -- 'twilio', 'aws_ses'

  -- Twilio Credentials (for SMS/WhatsApp)
  twilio_account_sid TEXT,
  twilio_auth_token_encrypted TEXT,   -- AES-192-CBC encrypted

  -- AWS SES Credentials (for Email)
  aws_access_key_id_encrypted TEXT,
  aws_secret_access_key_encrypted TEXT,
  aws_region TEXT,

  -- Channel Status
  is_enabled BOOLEAN DEFAULT 0,       -- Can send messages
  is_verified BOOLEAN DEFAULT 0,      -- Credentials tested
  verification_error TEXT,
  verified_at TIMESTAMP,

  -- Webhook Configuration
  webhook_secret_encrypted TEXT,      -- For verifying incoming webhooks
  webhook_url TEXT,                   -- Full URL for provider callbacks

  -- Provider-Specific Data
  provider_config_json TEXT,          -- JSON for provider-specific settings

  -- Dates
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  UNIQUE(tenant_id, channel),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_tenant_channel_credentials_v2_tenant_id
  ON tenant_channel_credentials_v2(tenant_id);
```

#### 3. `sms_phone_pool`
Temporary table to track phone numbers allocated to tenants (for future scaling if needed).

```sql
CREATE TABLE sms_phone_pool (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,  -- E.g., '+1234567890'
  twilio_phone_number_sid TEXT UNIQUE,

  tenant_id TEXT,                     -- NULL if unallocated
  allocated_at TIMESTAMP,

  status TEXT DEFAULT 'active',       -- 'active', 'retired', 'failed'
  failure_reason TEXT,

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_sms_phone_pool_tenant_id ON sms_phone_pool(tenant_id);
CREATE INDEX idx_sms_phone_pool_status ON sms_phone_pool(status);
```

#### 4. `tenant_business_info`
Stores complete business information for 10DLC/compliance purposes.

```sql
CREATE TABLE tenant_business_info (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  -- Business Details
  legal_business_name TEXT NOT NULL,
  dba_name TEXT,                      -- "Doing Business As"
  business_website TEXT,
  business_type TEXT,                 -- 'sole_proprietor', 'llc', 'corporation', etc.
  industry_vertical TEXT,             -- From Twilio enum

  -- Registration
  business_registration_number TEXT,  -- EIN (US) or equivalent
  country TEXT NOT NULL,
  business_address TEXT NOT NULL,
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip TEXT NOT NULL,

  -- Owner/Principal Contact
  owner_name TEXT NOT NULL,
  owner_title TEXT,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,

  -- Business Contact (can differ from owner)
  business_contact_name TEXT,
  business_contact_email TEXT,
  business_contact_phone TEXT,

  -- SMS/Messaging Specifics
  monthly_sms_volume_estimate INTEGER, -- Expected volume
  use_case_description TEXT,           -- What they'll send

  -- Compliance
  sms_opt_in_language TEXT,           -- Language for SMS consent (if applicable)
  gdpr_compliant BOOLEAN DEFAULT 0,   -- For EU tenants
  tcpa_compliant BOOLEAN DEFAULT 0,   -- For US tenants

  -- Verification Status
  verification_status TEXT DEFAULT 'pending',  -- 'pending', 'verified', 'rejected'
  verification_failed_reason TEXT,
  verified_by_admin TEXT,             -- User who verified
  verified_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_tenant_business_info_tenant_id ON tenant_business_info(tenant_id);
CREATE INDEX idx_tenant_business_info_verification_status
  ON tenant_business_info(verification_status);
```

#### 5. `message_provider_mappings`
Maps messages to provider-specific IDs for webhook matching.

```sql
CREATE TABLE message_provider_mappings (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,

  channel TEXT NOT NULL,              -- 'sms', 'whatsapp', 'email'
  provider TEXT NOT NULL,             -- 'twilio', 'aws_ses'
  provider_message_id TEXT UNIQUE,    -- ID from Twilio/SES for webhook matching
  provider_status TEXT,               -- Last status from provider

  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  UNIQUE(message_id, provider),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX idx_message_provider_mappings_provider_message_id
  ON message_provider_mappings(provider_message_id);
CREATE INDEX idx_message_provider_mappings_message_id
  ON message_provider_mappings(message_id);
```

### Modified Tables

#### `messages` table - Add columns:
```sql
ALTER TABLE messages ADD COLUMN phone_number TEXT;  -- For SMS channel
ALTER TABLE messages ADD COLUMN provider_account_sid TEXT;  -- Twilio SID
```

#### `campaigns` table - Add columns:
```sql
ALTER TABLE campaigns ADD COLUMN channel TEXT;      -- 'sms', 'whatsapp', 'email'
ALTER TABLE campaigns ADD COLUMN provider TEXT;     -- 'twilio', 'aws_ses'
```

#### `tenants` table - Add columns:
```sql
ALTER TABLE tenants ADD COLUMN is_demo BOOLEAN DEFAULT 0;  -- Demo account flag
ALTER TABLE tenants ADD COLUMN demo_created_by TEXT;        -- User ID who created demo
ALTER TABLE tenants ADD COLUMN demo_created_at TIMESTAMP;

CREATE INDEX idx_tenants_is_demo ON tenants(is_demo);
```

#### `contacts` table - Already has consent flags, add:
```sql
ALTER TABLE contacts ADD COLUMN phone_number TEXT;  -- For SMS
ALTER TABLE contacts ADD COLUMN whatsapp_number TEXT;  -- For WhatsApp (may differ from SMS)
ALTER TABLE contacts ADD COLUMN consent_sms BOOLEAN DEFAULT 0;
ALTER TABLE contacts ADD COLUMN consent_sms_updated_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN consent_whatsapp BOOLEAN DEFAULT 0;
ALTER TABLE contacts ADD COLUMN consent_whatsapp_updated_at TIMESTAMP;
```

---

## Part 2: 10DLC Provisioning Workflow

### High-Level Flow

```
Tenant Signs Up
    ↓
[Optional] Show "SMS/WhatsApp Coming Soon" or hide SMS channel
    ↓
Tenant tries to send first SMS
    ↓
Check: Does tenant have business info?
    ├─ NO → Redirect to "Business Information" form
    │       Collect: Legal name, EIN, Address, Owner info
    │       Store in tenant_business_info table
    │       Mark as verification_status = 'pending'
    │
    └─ YES → Check: Is 10DLC already provisioned?
             ├─ NO → Submit to Twilio API
             │       Create tenant_10dlc_brands record
             │       Mark twilio_brand_status = 'pending'
             │       Show "Pending Verification" badge
             │
             └─ YES → Check: Is brand approved?
                      ├─ YES → Allow SMS send
                      └─ NO → Show status (pending/rejected/error)
```

### Detailed Steps

#### Step 1: Business Info Collection

**Trigger**: User tries to send SMS/WhatsApp for the first time
**UX**: Modal/Form asking for business details

**Form Fields**:
```
- Legal Business Name (required)
- Business Type (dropdown: Sole Proprietor, LLC, Corporation, etc.)
- EIN / Business Registration Number (required)
- Industry Vertical (dropdown from Twilio enums)
- Business Website URL (optional)
- Business Address (required, multi-line)
- Business City, State, ZIP (required)
- Owner Name (required)
- Owner Title (required)
- Owner Email (required)
- Owner Phone (required)
- DBA Name (optional - if doing business as different name)
- Monthly SMS Volume Estimate (dropdown)
- Use Case Description (textarea - what will they send)
```

**API Endpoint** (new):
```
POST /api/business-info
Request body: { Legal name, EIN, address, owner info, etc. }
Response: { status: 'pending_verification', businessInfoId: '...' }
```

**Backend Flow**:
1. Validate required fields
2. Store in `tenant_business_info` table with `verification_status = 'pending'`
3. Return success with status

#### Step 2: Submit to Twilio 10DLC API

**Trigger**: Immediately after business info is saved (async job)
**Responsibility**: Backend service

**Twilio API Calls**:
```javascript
// 1. Create 10DLC Brand
POST https://trusthub.twilio.com/v1/Brands
{
  "friendlyName": legal_business_name,
  "legalName": legal_business_name,
  "legalRegistrationNumber": EIN,
  "businessType": business_type,
  "businessRegistrationCity": city,
  "businessRegistrationState": state,
  "businessRegistrationCountry": country,
  "businessRegistrationZip": zip,
  "addressSid": address_sid,  // Create address record first
}
→ Returns: Brand SID (e.g., "BU...")

// 2. Create Business Address (prerequisite)
POST https://trusthub.twilio.com/v1/Addresses
{
  "streetName": address,
  "city": city,
  "region": state,
  "postalCode": zip,
  "isoCountry": country,
  "friendlyName": "Business Address"
}
→ Returns: Address SID

// 3. Create/Update End User (Owner/Principal)
POST https://trusthub.twilio.com/v1/EndUsers
{
  "friendlyName": owner_name,
  "type": "individual",
  "attributes": {
    "first_name": owner_first_name,
    "last_name": owner_last_name,
    "email": owner_email,
    "phone": owner_phone
  }
}
→ Returns: End User SID

// 4. Associate End User with Brand
POST https://trusthub.twilio.com/v1/Brands/{BrandSid}/EndUserAssociations
{
  "endUserSid": end_user_sid,
  "endUserRole": "principal"
}

// 5. Create Supporting Documents (if required by Twilio)
// This happens asynchronously - Twilio notifies via webhook if needed
```

**Backend Job**:
```javascript
// After business info saved
async function submitTwilioBrand(tenantId) {
  const businessInfo = getBusinessInfo(tenantId);

  try {
    // 1. Create Address
    const address = await twilioClient.trusthub.addresses.create({...});

    // 2. Create End User
    const endUser = await twilioClient.trusthub.endUsers.create({...});

    // 3. Create Brand
    const brand = await twilioClient.trusthub.brands.create({...});

    // 4. Associate End User
    await twilioClient.trusthub.brands(brand.sid)
      .endUserAssociations.create({...});

    // 5. Store in our database
    db.prepare(`
      INSERT INTO tenant_10dlc_brands
      (id, tenant_id, twilio_brand_sid, twilio_brand_status, ...)
      VALUES (?, ?, ?, 'pending', ...)
    `).run(uuidv4(), tenantId, brand.sid);

    // 6. Update business info status
    db.prepare(`
      UPDATE tenant_business_info
      SET verification_status = 'pending_twilio'
      WHERE tenant_id = ?
    `).run(tenantId);

  } catch (error) {
    // Store error in tenant_10dlc_brands
    db.prepare(`
      UPDATE tenant_10dlc_brands
      SET twilio_brand_status = 'rejected',
          twilio_brand_status_reason = ?
      WHERE tenant_id = ?
    `).run(error.message, tenantId);
  }
}
```

#### Step 3: Twilio Brand Approval

**Status**: Asynchronous - Twilio reviews with third parties (1-48 hours typically)

**Webhook from Twilio**:
```
POST /webhooks/twilio/brand-status
{
  "brandSid": "BU...",
  "status": "approved" | "rejected",
  "reason": "..."
}
```

**Our Webhook Handler**:
```javascript
app.post('/webhooks/twilio/brand-status', (req, res) => {
  const { brandSid, status, reason } = req.body;

  // Find tenant by brand SID
  const brandRecord = db.prepare(`
    SELECT tenant_id FROM tenant_10dlc_brands
    WHERE twilio_brand_sid = ?
  `).get(brandSid);

  if (!brandRecord) {
    return res.status(404).json({ error: 'Brand not found' });
  }

  const tenantId = brandRecord.tenant_id;

  // Update brand status
  db.prepare(`
    UPDATE tenant_10dlc_brands
    SET twilio_brand_status = ?,
        twilio_brand_status_reason = ?,
        twilio_approved_at = ?
    WHERE tenant_id = ?
  `).run(status, reason, status === 'approved' ? new Date() : null, tenantId);

  // If approved, provision phone number
  if (status === 'approved') {
    asyncJob(provisionPhoneNumber, { tenantId, brandSid });
  }

  res.status(200).json({ ok: true });
});
```

#### Step 4: Phone Number Provisioning (After Brand Approval)

**Trigger**: When brand status = 'approved'
**Responsibility**: Backend service (async job)

**Twilio API Call**:
```javascript
// Rent/Buy phone number for SMS
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/IncomingPhoneNumbers.json
{
  "PhoneNumber": "+14155552671",  // Choose from available
  "FriendlyName": "tenant_id",
  "SmsUrl": "https://yourdomain.com/webhooks/sms",
  "SmsMethod": "POST",
  "StatusCallback": "https://yourdomain.com/webhooks/sms/status",
  "StatusCallbackMethod": "POST",
  "SmsApplicationSid": application_sid  // Optional but recommended
}
→ Returns: Phone Number SID
```

**Backend Implementation**:
```javascript
async function provisionPhoneNumber(tenantId, brandSid) {
  try {
    // Get available phone numbers in tenant's country
    const phoneNumbers = await twilioClient.availablePhoneNumbers
      .list(country_code)
      .local({ contains: area_code });

    if (phoneNumbers.length === 0) {
      throw new Error('No available phone numbers');
    }

    const phoneNumber = phoneNumbers[0];

    // Provision the number
    const incomingNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber.phoneNumber,
      friendlyName: tenantId,
      smsUrl: `${WEBHOOK_BASE_URL}/webhooks/sms`,
      smsMethod: 'POST',
      statusCallback: `${WEBHOOK_BASE_URL}/webhooks/sms/status`,
      statusCallbackMethod: 'POST'
    });

    // Store in database
    db.prepare(`
      UPDATE tenant_10dlc_brands
      SET twilio_phone_number = ?,
          twilio_phone_number_sid = ?,
          twilio_phone_status = 'active'
      WHERE tenant_id = ?
    `).run(phoneNumber.phoneNumber, incomingNumber.sid, tenantId);

    // Also add to phone pool
    db.prepare(`
      INSERT INTO sms_phone_pool
      (id, phone_number, twilio_phone_number_sid, tenant_id, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(uuidv4(), phoneNumber.phoneNumber, incomingNumber.sid, tenantId);

  } catch (error) {
    db.prepare(`
      UPDATE tenant_10dlc_brands
      SET twilio_phone_status = 'failed',
          twilio_brand_status_reason = ?
      WHERE tenant_id = ?
    `).run(error.message, tenantId);
  }
}
```

---

## Part 2.5: Demo Mode Implementation

### Overview

Demo tenants experience the full workflow end-to-end without sending real SMS/WhatsApp/Email messages. They see realistic simulated status updates. Demo mode is **only available to sales and platform staff**.

### Demo Tenant Characteristics

**When is_demo = true**:
- ✅ Create campaigns
- ✅ Configure business info (10DLC simulation)
- ✅ Submit for 10DLC approval (auto-approved in 30 seconds)
- ✅ Send campaigns
- ✅ See message statuses (sent → delivered → read)
- ✅ View all reporting/metrics
- ❌ No real SMS/WhatsApp/Email sent
- ❌ No charges to Twilio/SES
- ❌ Can't upgrade to real sending

### Demo Tenant Creation

**Admin Endpoint** (platform staff only):
```
POST /api/admin/demo-tenants
Request: {
  name: "Acme Corp Demo",
  created_by: "admin-user-id"
}
Response: {
  tenant_id: "...",
  is_demo: true,
  access_url: "...",
  cleanup_scheduled: "2025-12-27T14:30:00Z"  // Auto-delete after 7 days
}
```

**Database Record**:
```javascript
INSERT INTO tenants (id, name, plan_id, is_demo, demo_created_by, demo_created_at)
VALUES (uuid(), "Acme Corp Demo", "demo_plan", 1, "admin-user-id", NOW())

// Also create demo users
INSERT INTO users (id, email, tenant_id, role)
VALUES (uuid(), "demo@acme.local", tenant_id, "owner")

INSERT INTO user_tenants (id, user_id, tenant_id, role)
VALUES (uuid(), user_id, tenant_id, "owner")
```

### Demo Mode 10DLC Flow

**Timeline**:
1. **T+0s**: Demo tenant submits business info form
2. **T+0s**: Backend immediately creates `tenant_10dlc_brands` record with status = 'pending'
3. **T+30s**: Scheduled Lambda auto-updates status to 'approved'
4. **T+30s**: Generate fake phone number (e.g., `+1-555-0100-{tenantId}`)
5. **T+30s**: Frontend shows "✓ SMS approved and ready!"

**Backend Logic** (in 10DLC submission):
```javascript
async function submitBusinessInfo(tenantId, businessInfo) {
  const tenant = await getTenant(tenantId);

  if (tenant.is_demo) {
    // Demo mode: simulate approval
    const fakePhoneNumber = `+1-555-0100-${tenantId.substring(0, 4)}`;

    const brandRecord = {
      id: uuidv4(),
      tenant_id: tenantId,
      twilio_brand_status: 'pending',
      twilio_phone_number: fakePhoneNumber,
      twilio_phone_status: 'active',
      ...businessInfo
    };

    db.prepare(`
      INSERT INTO tenant_10dlc_brands (...) VALUES (...)
    `).run(...);

    // Schedule auto-approval in 30 seconds
    await scheduleAutoApproval(tenantId, 30000);

    return {
      status: 'pending',
      message: 'Business verification in progress... (demo mode)',
      estimated_time: '30 seconds'
    };
  } else {
    // Real mode: submit to Twilio
    return submitToTwilio(tenantId, businessInfo);
  }
}

async function scheduleAutoApproval(tenantId, delayMs) {
  // Use EventBridge to schedule approval
  const eventBridge = new AWS.EventBridge();

  await eventBridge.putEvents({
    Entries: [{
      Source: 'engageninja.demo',
      DetailType: 'DemoTenantApproveNow',
      Detail: JSON.stringify({ tenantId }),
      Time: new Date(Date.now() + delayMs)
    }]
  }).promise();
}
```

**Lambda Function** (auto-approve demo 10DLC):
```javascript
// lambda/functions/demo-tenant-approve/index.js

exports.handler = async (event) => {
  const { tenantId } = JSON.parse(event.detail);

  db.prepare(`
    UPDATE tenant_10dlc_brands
    SET twilio_brand_status = 'approved',
        twilio_phone_status = 'active',
        twilio_approved_at = NOW()
    WHERE tenant_id = ?
  `).run(tenantId);

  // Broadcast via SSE
  await broadcastViaSSE(tenantId, {
    type: '10dlc_approved',
    message: 'SMS is now ready to use!'
  });

  return { success: true };
};
```

### Demo Mode Message Sending

**When demo tenant sends campaign**:
1. No Twilio API call made
2. Generate fake `provider_message_id` (e.g., `demo-{tenantId}-{timestamp}`)
3. Store in message_provider_mappings
4. Mark message as 'sent' immediately
5. Schedule async status updates at realistic intervals

**Lambda** (`handleDemoSend` in SendCampaignMessage):
```javascript
async function handleDemoSend(messageId, tenantId, channel) {
  const fakeProviderId = `demo-${tenantId}-${Date.now()}`;

  // Update to 'sent' immediately
  await updateMessageStatus(messageId, 'sent', {
    provider_message_id: fakeProviderId
  });

  // Schedule 'delivered' in 3-5 seconds
  const deliveredDelay = 3000 + Math.random() * 2000;
  await scheduleStatusUpdate(messageId, tenantId, 'delivered', deliveredDelay);

  // Schedule 'read' in 5-10 seconds total
  const readDelay = 5000 + Math.random() * 5000;
  await scheduleStatusUpdate(messageId, tenantId, 'read', readDelay);
}
```

**Result**: Demo tenant sees:
- T+0s: Message marked "Sent" ✓
- T+3-5s: Message marked "Delivered" ✓
- T+5-10s: Message marked "Read" ✓

### Demo Mode UI Badge

**Every page showing tenant info**:
```
┌─────────────────────────────────────┐
│ Acme Corp Demo                      │
│ ⚠️ DEMO ACCOUNT - Messages Not Sent │
│ Cleanup scheduled: Dec 27           │
└─────────────────────────────────────┘
```

**Campaign sending UI**:
```
Pre-send validation:
├─ ✓ Channel enabled
├─ ✓ Phone numbers valid
├─ ⚠️ DEMO MODE: Messages will be simulated (not actually sent)
└─ [Send Campaign (Demo)]
```

### Demo Tenant Cleanup

**Scheduled Job** (runs daily):
```javascript
// Clean up demo tenants older than 7 days
const demoTenants = db.prepare(`
  SELECT id FROM tenants
  WHERE is_demo = 1
  AND demo_created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
`).all();

demoTenants.forEach(tenant => {
  // Delete all related data
  db.prepare('DELETE FROM messages WHERE tenant_id = ?').run(tenant.id);
  db.prepare('DELETE FROM campaigns WHERE tenant_id = ?').run(tenant.id);
  db.prepare('DELETE FROM contacts WHERE tenant_id = ?').run(tenant.id);
  db.prepare('DELETE FROM users WHERE tenant_id = ?').run(tenant.id);
  db.prepare('DELETE FROM tenants WHERE id = ?').run(tenant.id);

  console.log(`Cleaned up demo tenant: ${tenant.id}`);
});
```

---

## Part 3: Message Queue Architecture (AWS SQS + Lambda)

### Overview

Instead of in-memory polling, use AWS SQS + Lambda for reliable, scalable message processing:

```
Campaign Send
    ↓
INSERT to messages table (status='queued')
    ↓
PUT message to SQS Queue
    ↓
Lambda triggered by SQS
    ├─ Get message details
    ├─ Decrypt credentials
    ├─ Check if demo tenant
    │  ├─ YES → Mock send (store fake provider_message_id)
    │  └─ NO  → Call Twilio/SES API
    ├─ Update message status
    └─ Delete from SQS (or DLQ if failed)
    ↓
Schedule Lambda for async status updates
    ├─ sent: 1 second delay
    ├─ delivered: 3-5 second delay
    └─ read: 5-10 second delay
    ↓
Update message status in DB
    ↓
Broadcast via SSE
```

### SQS Queue Setup

**Queue Name**: `engageninja-messages-{environment}`
**Type**: Standard (FIFO optional if ordering critical)
**Message Retention**: 14 days
**Visibility Timeout**: 300 seconds (5 minutes - Lambda execution time)
**Dead Letter Queue**: `engageninja-messages-dlq`

**Queue Policy** (allow Lambda to receive messages):
```json
{
  "Effect": "Allow",
  "Principal": {
    "Service": "lambda.amazonaws.com"
  },
  "Action": "sqs:*",
  "Resource": "arn:aws:sqs:region:account:engageninja-messages-*"
}
```

### Lambda Function: SendCampaignMessage

**Trigger**: SQS Queue (batch size 10, 300 second timeout)
**Runtime**: Node.js 18+
**Environment Variables**:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `AWS_SES_REGION`
- `WEBHOOK_BASE_URL`
- `DATABASE_URL`

**Code Structure**:
```javascript
// lambda/functions/send-campaign-message/index.js

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();
const lambda = new AWS.Lambda();
const TwilioSmsProvider = require('./providers/TwilioSmsProvider');
const AwsSesProvider = require('./providers/AwsSesProvider');

exports.handler = async (event) => {
  console.log('Processing', event.Records.length, 'messages');

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { messageId, tenantId, channel, provider } = message;

      // Get tenant (check if demo)
      const tenant = await getTenant(tenantId);

      if (tenant.is_demo) {
        // Mock send
        await handleDemoSend(messageId, tenantId, channel);
      } else {
        // Real send
        await handleRealSend(messageId, tenantId, channel, provider);
      }

      // Delete from queue
      await sqs.deleteMessage({
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: record.receiptHandle
      }).promise();

    } catch (error) {
      console.error('Error processing message:', error);
      // Leave in queue for retry (or move to DLQ after 3 retries)
    }
  }

  return { batchItemFailures: [] };
};

async function handleDemoSend(messageId, tenantId, channel) {
  // Generate fake provider message ID
  const fakeProviderId = `demo-${tenantId}-${Date.now()}`;

  // Update to 'sent' status
  await updateMessageStatus(messageId, 'sent', { provider_message_id: fakeProviderId });

  // Schedule async status updates (via EventBridge)
  await scheduleStatusUpdate(messageId, tenantId, 'delivered', 3000 + Math.random() * 2000);
  await scheduleStatusUpdate(messageId, tenantId, 'read', 5000 + Math.random() * 5000);
}

async function handleRealSend(messageId, tenantId, channel, provider) {
  const message = await getMessageFromDb(messageId);
  const credentials = await getCredentials(tenantId, channel);
  const contact = await getContact(message.contact_id);

  let providerInstance;
  if (provider === 'twilio') {
    providerInstance = new TwilioSmsProvider(credentials);
  } else if (provider === 'aws_ses') {
    providerInstance = new AwsSesProvider(credentials);
  }

  const result = await providerInstance.send(
    contact.phone_number,
    message.content_snapshot,
    { fromNumber: message.phone_number }
  );

  if (result.success) {
    await updateMessageStatus(messageId, 'sent', {
      provider_message_id: result.providerId
    });
  } else {
    await updateMessageStatus(messageId, 'failed', {
      status_reason: result.error
    });
  }
}

async function scheduleStatusUpdate(messageId, tenantId, newStatus, delayMs) {
  // Use EventBridge to schedule Lambda execution
  const eventBridge = new AWS.EventBridge();

  await eventBridge.putEvents({
    Entries: [{
      Source: 'engageninja.messaging',
      DetailType: 'MockStatusUpdate',
      Detail: JSON.stringify({
        messageId,
        tenantId,
        newStatus
      }),
      RoleArn: process.env.EVENT_BRIDGE_ROLE_ARN,
      Time: new Date(Date.now() + delayMs)
    }]
  }).promise();
}
```

**Lambda Permission** (for SQS):
```bash
aws lambda add-permission \
  --function-name SendCampaignMessage \
  --statement-id AllowSQSInvoke \
  --action lambda:InvokeFunction \
  --principal sqs.amazonaws.com \
  --source-arn arn:aws:sqs:region:account:engageninja-messages-prod
```

### Lambda Function: UpdateMessageStatus (Async)

**Trigger**: EventBridge rule (for scheduled mock status updates)
**Execution**: Updates message status to 'delivered' or 'read'

```javascript
// lambda/functions/update-message-status/index.js

exports.handler = async (event) => {
  const { messageId, tenantId, newStatus } = JSON.parse(event.detail);

  // Update message status
  await updateMessageStatus(messageId, newStatus);

  // Broadcast via SSE
  await broadcastViaSSE(tenantId, {
    message_id: messageId,
    status: newStatus
  });

  return { success: true };
};
```

### Backend: Queue Message on Campaign Send

**Modified** `backend/src/routes/campaigns.js`:

```javascript
async function queueCampaignMessages(campaignId, tenantId, channel, contacts) {
  const sqs = new AWS.SQS();
  const queueUrl = process.env.SQS_QUEUE_URL;

  // Batch insert to SQS (max 10 per request)
  const batches = chunk(contacts, 10);

  for (const batch of batches) {
    const entries = batch.map((contact, index) => ({
      Id: `${campaignId}-${contact.id}-${index}`,
      MessageBody: JSON.stringify({
        messageId: uuidv4(),
        tenantId,
        campaignId,
        contactId: contact.id,
        channel,
        content: campaign.content,
        phoneNumber: contact.phone_number,
        timestamp: new Date().toISOString()
      })
    }));

    await sqs.sendMessageBatch({
      QueueUrl: queueUrl,
      Entries: entries
    }).promise();
  }
}
```

---

## Part 4: SMS Sending Architecture

### Provider Abstraction Pattern

Create a `MessagingProvider` interface that all providers implement:

```javascript
// backend/src/services/messaging/MessagingProvider.js
class MessagingProvider {
  /**
   * Send a message via the provider
   */
  async send(recipient, content, options) {
    throw new Error('Not implemented');
  }

  /**
   * Validate credentials with the provider
   */
  async validateCredentials(credentials) {
    throw new Error('Not implemented');
  }

  /**
   * Get message status from provider
   */
  async getMessageStatus(providerId) {
    throw new Error('Not implemented');
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload) {
    throw new Error('Not implemented');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    throw new Error('Not implemented');
  }
}

module.exports = MessagingProvider;
```

### Twilio SMS Provider Implementation

```javascript
// backend/src/services/messaging/TwilioSmsProvider.js
const MessagingProvider = require('./MessagingProvider');
const twilio = require('twilio');

class TwilioSmsProvider extends MessagingProvider {
  constructor(accountSid, authToken) {
    super();
    this.client = twilio(accountSid, authToken);
    this.accountSid = accountSid;
    this.authToken = authToken;
  }

  async send(recipient, content, options = {}) {
    const {
      fromNumber,      // Phone number sending the SMS
      statusCallback,  // URL for delivery webhooks
    } = options;

    try {
      const message = await this.client.messages.create({
        body: content,
        from: fromNumber,
        to: recipient,
        statusCallback: statusCallback
      });

      return {
        success: true,
        providerId: message.sid,      // Message SID from Twilio
        status: message.status,       // 'accepted'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async validateCredentials() {
    // Simple validation: make a test API call
    try {
      await this.client.api.accounts(this.accountSid).fetch();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      return null;
    }
  }

  parseWebhook(payload) {
    // Twilio sends form-encoded data
    return {
      messageSid: payload.MessageSid,
      status: payload.MessageStatus,
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage
    };
  }

  verifyWebhookSignature(payload, signature, secret) {
    // Twilio uses HMAC-SHA1
    const crypto = require('crypto');
    const paramString = Object.keys(payload)
      .sort()
      .reduce((str, key) => str + key + payload[key], '');

    const hash = crypto
      .createHmac('sha1', secret)
      .update(paramString)
      .digest('Base64');

    return hash === signature;
  }
}

module.exports = TwilioSmsProvider;
```

### Message Queue Extension for SMS

Modify `backend/src/services/messageQueue.js` to support SMS:

```javascript
// backend/src/services/messageQueue.js (extended)
const TwilioSmsProvider = require('./messaging/TwilioSmsProvider');
const TwilioWhatsAppProvider = require('./messaging/TwilioWhatsAppProvider');
const AwsSesProvider = require('./messaging/AwsSesProvider');

class MessageQueueProcessor {
  constructor() {
    this.providers = new Map();
  }

  // Get provider instance for a tenant and channel
  async getProvider(tenantId, channel, provider) {
    const cacheKey = `${tenantId}:${channel}:${provider}`;

    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey);
    }

    const credentials = this.getCredentials(tenantId, channel);

    let providerInstance;
    switch (provider) {
      case 'twilio':
        if (channel === 'sms') {
          providerInstance = new TwilioSmsProvider(
            credentials.twilio_account_sid,
            this.decrypt(credentials.twilio_auth_token_encrypted)
          );
        } else if (channel === 'whatsapp') {
          providerInstance = new TwilioWhatsAppProvider(
            credentials.twilio_account_sid,
            this.decrypt(credentials.twilio_auth_token_encrypted)
          );
        }
        break;
      case 'aws_ses':
        providerInstance = new AwsSesProvider(
          this.decrypt(credentials.aws_access_key_id_encrypted),
          this.decrypt(credentials.aws_secret_access_key_encrypted),
          credentials.aws_region
        );
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    this.providers.set(cacheKey, providerInstance);
    return providerInstance;
  }

  async processSmsMessage(message) {
    const {
      id: messageId,
      tenant_id: tenantId,
      contact_id: contactId,
      content_snapshot: content,
      provider
    } = message;

    try {
      // Mark as processing
      this.updateMessageStatus(messageId, 'processing');

      // Get provider
      const providerInstance = await this.getProvider(tenantId, 'sms', provider);

      // Get contact phone number
      const contact = db.prepare('SELECT phone_number FROM contacts WHERE id = ?')
        .get(contactId);

      if (!contact || !contact.phone_number) {
        throw new Error('Contact phone number not found');
      }

      // Get 10DLC phone number for sending
      const brandRecord = db.prepare(`
        SELECT twilio_phone_number FROM tenant_10dlc_brands WHERE tenant_id = ?
      `).get(tenantId);

      if (!brandRecord || !brandRecord.twilio_phone_number) {
        throw new Error('SMS not enabled: 10DLC not provisioned');
      }

      // Send SMS
      const result = await providerInstance.send(
        contact.phone_number,
        content,
        {
          fromNumber: brandRecord.twilio_phone_number,
          statusCallback: `${WEBHOOK_BASE_URL}/webhooks/sms/status`
        }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Store provider message ID for webhook matching
      db.prepare(`
        INSERT INTO message_provider_mappings
        (id, message_id, channel, provider, provider_message_id)
        VALUES (?, ?, 'sms', ?, ?)
      `).run(uuidv4(), messageId, provider, result.providerId);

      // Mark as sent
      this.updateMessageStatus(messageId, 'sent', {
        provider_message_id: result.providerId,
        sent_at: new Date()
      });

    } catch (error) {
      this.updateMessageStatus(messageId, 'failed', {
        status_reason: error.message
      });
    }
  }

  // Main processing loop
  process() {
    setInterval(() => {
      const messages = db.prepare(`
        SELECT * FROM messages
        WHERE status = 'queued'
        LIMIT 50
      `).all();

      messages.forEach(msg => {
        if (msg.channel === 'sms') {
          this.processSmsMessage(msg);
        } else if (msg.channel === 'whatsapp') {
          this.processWhatsAppMessage(msg);
        } else if (msg.channel === 'email') {
          this.processEmailMessage(msg);
        }
      });
    }, 100);
  }
}
```

### SMS Sending - Campaign API

```javascript
// backend/src/routes/campaigns.js (SMS extension)

router.post('/:id/send', validateTenantAccess, requireTenantRole('member'), (req, res) => {
  const { id: campaignId } = req.params;
  const tenantId = req.session.activeTenantId;

  const campaign = db.prepare(`
    SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?
  `).get(campaignId, tenantId);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (campaign.status !== 'draft') {
    return res.status(400).json({ error: 'Campaign not in draft status' });
  }

  const { channel } = req.body;  // 'sms', 'whatsapp', or 'email'

  // 1. Check channel is enabled
  const channelCreds = db.prepare(`
    SELECT * FROM tenant_channel_credentials_v2
    WHERE tenant_id = ? AND channel = ? AND is_enabled = 1
  `).get(tenantId, channel);

  if (!channelCreds) {
    return res.status(400).json({
      error: `${channel} channel not enabled. Please configure in settings.`
    });
  }

  // 2. For SMS: Check 10DLC status
  if (channel === 'sms') {
    const brandRecord = db.prepare(`
      SELECT twilio_brand_status FROM tenant_10dlc_brands WHERE tenant_id = ?
    `).get(tenantId);

    if (!brandRecord) {
      return res.status(400).json({
        error: 'SMS not configured. Please provide business information first.',
        action: 'CONFIGURE_BUSINESS_INFO'
      });
    }

    if (brandRecord.twilio_brand_status === 'pending') {
      return res.status(400).json({
        error: 'SMS brand verification pending. Please wait for approval.',
        action: 'WAIT_FOR_APPROVAL'
      });
    }

    if (brandRecord.twilio_brand_status === 'rejected') {
      return res.status(400).json({
        error: 'SMS brand verification failed. Please update your business information.',
        action: 'UPDATE_BUSINESS_INFO'
      });
    }
  }

  // 3. Check quota
  const subscriptionStatus = checkSubscription(tenantId);
  if (!subscriptionStatus.active) {
    return res.status(402).json({ error: 'Subscription not active' });
  }

  const quotaKey = `${channel}_messages_per_month`;
  const monthlyQuota = subscriptionStatus.plan[quotaKey];

  const usageCounter = db.prepare(`
    SELECT * FROM usage_counters
    WHERE tenant_id = ? AND counter_type = ?
    AND year_month = DATE_FORMAT(NOW(), '%Y-%m')
  `).get(tenantId, quotaKey);

  const currentUsage = usageCounter?.count || 0;
  const contactCount = campaign.audience_filters?.length || 0;

  if (currentUsage + contactCount > monthlyQuota) {
    return res.status(402).json({
      error: `Insufficient quota. Need ${contactCount} messages, have ${monthlyQuota - currentUsage} remaining.`,
      current_usage: currentUsage,
      monthly_quota: monthlyQuota,
      remaining: monthlyQuota - currentUsage
    });
  }

  // 4. Get contacts matching audience filters
  const contacts = getContactsByFilters(tenantId, campaign.audience_filters);

  // 5. Check consent for channel
  if (channel === 'sms') {
    const contactsWithoutConsent = contacts.filter(c => !c.consent_sms);
    if (contactsWithoutConsent.length > 0) {
      return res.status(400).json({
        error: `${contactsWithoutConsent.length} contacts don't have SMS consent`,
        contacts_without_consent: contactsWithoutConsent.length,
        total_contacts: contacts.length,
        action: 'REMOVE_CONTACTS_OR_GET_CONSENT'
      });
    }
  }

  // 6. Create message records
  contacts.forEach(contact => {
    db.prepare(`
      INSERT INTO messages
      (id, tenant_id, campaign_id, contact_id, channel, provider,
       phone_number, content_snapshot, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued')
    `).run(
      uuidv4(),
      tenantId,
      campaignId,
      contact.id,
      channel,
      channelCreds.provider,  // 'twilio' or 'aws_ses'
      contact.phone_number,   // For SMS/WhatsApp
      campaign.content
    );
  });

  // 7. Update campaign status
  db.prepare(`
    UPDATE campaigns
    SET status = 'sending', channel = ?, provider = ?, sent_at = NOW()
    WHERE id = ?
  `).run(channel, channelCreds.provider, campaignId);

  // 8. Increment usage counter
  db.prepare(`
    INSERT INTO usage_counters (tenant_id, counter_type, count, year_month)
    VALUES (?, ?, ?, DATE_FORMAT(NOW(), '%Y-%m'))
    ON DUPLICATE KEY UPDATE count = count + ?
  `).run(tenantId, quotaKey, contacts.length, contacts.length);

  res.status(200).json({
    status: 'sending',
    campaign_id: campaignId,
    messages_queued: contacts.length,
    channel,
    provider: channelCreds.provider
  });
});
```

---

## Part 4: SMS Webhook Handling

### Webhook Endpoint

```javascript
// backend/src/routes/webhooks.js (SMS extension)

router.post('/sms/status', async (req, res) => {
  try {
    // Twilio sends form-encoded data
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    // Find message by provider message ID
    const mapping = db.prepare(`
      SELECT message_id FROM message_provider_mappings
      WHERE provider_message_id = ?
    `).get(MessageSid);

    if (!mapping) {
      console.warn(`Webhook received for unknown message: ${MessageSid}`);
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).get(mapping.message_id);

    if (!message) {
      return res.status(404).json({ error: 'Message record not found' });
    }

    // Map Twilio status to our status
    const statusMapping = {
      'accepted': 'sent',
      'queued': 'sent',
      'sending': 'sent',
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'undelivered': 'failed',
      'failed': 'failed'
    };

    const newStatus = statusMapping[MessageStatus] || 'failed';
    const statusReason = ErrorMessage ? `Twilio Error ${ErrorCode}: ${ErrorMessage}` : null;

    // Update message status
    db.prepare(`
      UPDATE messages
      SET status = ?, status_reason = ?, updated_at = NOW()
      WHERE id = ?
    `).run(newStatus, statusReason, message.id);

    // Update provider mapping
    db.prepare(`
      UPDATE message_provider_mappings
      SET provider_status = ?, updated_at = NOW()
      WHERE provider_message_id = ?
    `).run(MessageStatus, MessageSid);

    // Update campaign metrics
    updateCampaignMetrics(message.campaign_id);

    // Broadcast via SSE
    metricsEmitter.emit('message-status', {
      campaign_id: message.campaign_id,
      message_id: message.id,
      status: newStatus
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook verification (Twilio GET request)
router.get('/sms/status', (req, res) => {
  // Twilio performs a GET request to verify webhook URL
  res.status(200).send('OK');
});
```

---

## Part 5: API Endpoints

### Business Information Endpoints

```
POST   /api/business-info
       Save tenant business information
       Triggers async 10DLC submission

GET    /api/business-info
       Get tenant's business information

PUT    /api/business-info
       Update business information (if 10DLC not yet approved)

GET    /api/business-info/status
       Get 10DLC provisioning status
       Response: {
         status: 'pending' | 'approved' | 'rejected',
         phone_number: '+1234567890',
         brand_sid: 'BU...',
         failure_reason: '...'
       }
```

### Channel Configuration Endpoints

```
POST   /api/settings/channels/sms/configure
       POST body: {
         campaign_type: 'marketing' | 'transactional' | 'support'
       }
       Returns: {
         status: 'pending_business_info' | 'pending_approval' | 'ready'
       }

GET    /api/settings/channels/sms/status
       Returns current SMS provisioning status

DELETE /api/settings/channels/sms
       Disable SMS for tenant
```

### Campaign Sending (Extended)

```
POST   /api/campaigns/:id/send
       Request body: {
         channel: 'sms' | 'whatsapp' | 'email'
       }

       If SMS and 10DLC not ready:
       Response: {
         error: 'SMS not ready',
         status: 'pending_business_info' | 'pending_approval' | 'rejected',
         action: 'CONFIGURE_BUSINESS_INFO' | 'WAIT_FOR_APPROVAL' | 'UPDATE_BUSINESS_INFO'
       }
```

---

## Part 6: Frontend UX Flow

### Step 1: SMS Channel Discovery
When user goes to Channels/Settings page:
```
[SMS Channel Card]
├─ Status: "Pending Setup"
├─ Action: "Configure SMS"
└─ Info: "SMS requires business verification. Click to set up."
```

### Step 2: Business Information Form
When user clicks "Configure SMS":
```
Modal: "Business Information for SMS"
├─ Section 1: Business Details
│  ├─ Legal Business Name
│  ├─ Business Type
│  ├─ EIN
│  ├─ Industry
│  └─ Website
├─ Section 2: Address
│  ├─ Address Line 1
│  ├─ City, State, ZIP
│  └─ Country
├─ Section 3: Owner/Contact
│  ├─ Owner Name
│  ├─ Owner Title
│  ├─ Owner Email
│  └─ Owner Phone
├─ Section 4: SMS Details
│  ├─ Monthly Volume Estimate
│  └─ Use Case Description
└─ [Save] [Cancel]
```

### Step 3: Verification Pending
After form submission:
```
[SMS Channel Card]
├─ Status: "⏳ Pending Verification"
├─ Updated: "2025-12-20 14:30"
├─ Info: "Your business information has been submitted to Twilio.
│         Verification typically takes 1-48 hours."
├─ Action: "Edit Business Info" (disabled until approval)
└─ Info: "Note: SMS will be available once verified."
```

### Step 4: Create Campaign with SMS
Once SMS is approved:
```
[Create Campaign Page]
├─ Content: [Text content area]
├─ Channel: [Dropdown: SMS | WhatsApp | Email]
│  ├─ SMS ✓ (Ready)
│  ├─ WhatsApp (Not configured)
│  └─ Email (Not configured)
├─ Recipients: [Audience filter]
└─ [Send Campaign]
```

### Step 5: Consent Check
When sending SMS campaign:
```
Pre-send validation:
├─ ✓ Channel enabled
├─ ✓ Phone numbers valid
├─ ✓ Quota available
├─ ✗ 15 contacts missing SMS consent
└─ [Remove contacts and send] [Get consent first]
```

---

## Part 7: Migration Strategy

### Phase 1: SMS Infrastructure (Week 1-2)
- [x] Create data models (10dlc_brands, business_info, provider_mappings)
- [x] Implement TwilioSmsProvider class
- [x] Implement business information form
- [x] Implement 10DLC submission workflow
- [x] Implement SMS webhook handler
- [ ] Test with Twilio sandbox

### Phase 2: SMS Campaigns (Week 2-3)
- [ ] Extend message queue processor for SMS
- [ ] Extend campaign sending API for SMS channel
- [ ] Add SMS to campaign creation UI
- [ ] Implement quota enforcement for SMS
- [ ] End-to-end testing

### Phase 3: WhatsApp Migration (Week 3-4)
- [ ] Create TwilioWhatsAppProvider class
- [ ] Migrate WhatsApp templates from Meta to Twilio
- [ ] Implement WhatsApp message sending via Twilio
- [ ] Migrate WhatsApp webhooks
- [ ] Test with existing WhatsApp templates

### Phase 4: Email (AWS SES) (Week 4-5)
- [ ] Create AwsSesProvider class
- [ ] Implement email campaign sending
- [ ] Implement email webhooks
- [ ] Test with SES

### Phase 5: Testing & Hardening (Week 5-6)
- [ ] Load testing (high message volume)
- [ ] Webhook reliability testing
- [ ] Consent enforcement testing
- [ ] Quota enforcement testing
- [ ] Error handling & retry logic

---

## Part 8: Error Handling & Edge Cases

### Business Info Submission Failures
```
Scenario: User submits business info, Twilio API is down
→ Show: "Couldn't submit to Twilio. Please try again."
→ Retry: Automatically retry every 5 minutes (up to 10 times)
→ Fallback: Admin manual intervention option
```

### 10DLC Rejection
```
Scenario: Twilio rejects brand for compliance reasons
→ Show: Rejection reason from Twilio
→ Action: "Update Business Info" form with guidance
→ Allow: Re-submit after changes
```

### SMS Quota Exceeded
```
Scenario: Campaign would exceed monthly SMS quota
→ Show: "You have 500/1000 messages remaining. This campaign needs 700."
→ Options:
  - Remove 200 contacts
  - Upgrade plan
  - Send next month
```

### Webhook Failures
```
Scenario: Twilio webhook for message status doesn't arrive
→ Fallback: Background job polls Twilio API every 5 minutes for stuck messages
→ Retry: If webhook lost, fetch status directly from Twilio
→ Detect: Messages in 'sent' status >1 hour → assume delivered
```

---

## Part 9: Security Considerations

### Credential Encryption
- All Twilio auth tokens: AES-192-CBC encrypted
- All AWS keys: AES-192-CBC encrypted
- Encryption key: Stored in environment variable (rotate regularly)
- Decryption: Only at request time (not cached in memory)

### Webhook Signature Verification
- SMS: Verify Twilio X-Twilio-Signature header using auth token
- All webhooks: Must match our stored secret

### Consent Enforcement
- Filter contacts by `consent_sms` before sending
- Audit log all consent changes
- GDPR/TCPA compliance: Don't send to contacts without consent

### Audit Logging
- All 10DLC submissions: Log to audit_logs
- All SMS sends: Log to audit_logs with recipient count
- All webhook messages: Log payload (redact sensitive data)

---

## Part 10: Testing Checklist

- [ ] Business info form validates required fields
- [ ] 10DLC submission succeeds with valid data
- [ ] 10DLC rejection handled gracefully
- [ ] Phone number provisioning succeeds after approval
- [ ] SMS sending via Twilio works
- [ ] SMS webhook updates message status correctly
- [ ] Quota enforcement prevents over-sending
- [ ] Consent filtering prevents sending to non-consented contacts
- [ ] Retry logic handles failed messages
- [ ] Multi-tenant isolation (one tenant can't see another's 10DLC)
- [ ] UI shows accurate SMS status throughout flow

---

## Part 11: Dependencies & Libraries

### Already in codebase:
- `better-sqlite3` - Database
- `express-session` - Session management
- Encryption utilities

### New dependencies needed:
```json
{
  "twilio": "^4.x",
  "aws-sdk": "^2.x"  // Already may be present
}
```

### Optional (for improvements):
- `redis` - Distributed rate limiting
- `bull` - Job queue (for more reliable async jobs)
- `joi` - Schema validation for business info

---

## Part 12: Open Questions for Follow-up

1. **Twilio Account Setup**: Should each tenant have their own Twilio sub-account, or should all use your master account?
   - Recommendation: Master account with Subaccounts per tenant (better control, cost tracking)

2. **Sandbox vs Production**: When should we move from Twilio Sandbox to Production?
   - Recommendation: Use sandbox during development, switch to production when ready to launch

3. **WhatsApp Business Accounts**: For WhatsApp, does each tenant own their WABA or does EngageNinja?
   - Recommendation: EngageNinja owns WABA but associates to tenant (similar to SMS)

4. **Email Provider**: AWS SES in same AWS account as backend, or separate?
   - Recommendation: Same account, but use separate IAM user with limited SES permissions

5. **Compliance**: Need legal review for terms around SMS/WhatsApp liability?
   - Recommendation: Yes, before launch

---

## Next Steps

1. **Review** this architecture document
2. **Clarify** any open questions (see Part 12)
3. **Create migrations** for new tables
4. **Implement SMS Provider** class
5. **Test 10DLC flow** with Twilio sandbox
6. **Build business info form** in frontend
7. **Implement campaign SMS sending**

Let me know if you'd like me to:
- Deep dive into any section
- Create implementation code for specific components
- Create database migrations
- Create frontend components
- Create detailed test cases

