# Database Migration Summary - Twilio SMS Integration

This document provides an overview of all database migrations created for the Twilio SMS/WhatsApp integration.

## Migration Timeline

### Phase 1: New Tables (Migrations 014-018)

#### Migration 014: `tenant_business_info`
**Purpose**: Store editable, current business information for each tenant

**Key Features**:
- Tenant-editable business details (separate from approved Twilio data)
- Legal name, EIN, address, owner info
- Verification status tracking (pending/verified/rejected)
- One row per tenant (UNIQUE constraint on tenant_id)

**Schema**:
```sql
CREATE TABLE tenant_business_info (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  legal_business_name, dba_name, business_website, business_type, industry_vertical,
  business_registration_number, country, business_address, business_city, business_state, business_zip,
  owner_name, owner_title, owner_email, owner_phone,
  business_contact_name, business_contact_email, business_contact_phone,
  monthly_sms_volume_estimate, use_case_description,
  sms_opt_in_language, gdpr_compliant, tcpa_compliant,
  verification_status, verification_failed_reason, verified_by_admin, verified_at,
  created_at, updated_at
);
```

**Indexes**:
- `idx_tenant_business_info_tenant_id`
- `idx_tenant_business_info_verification_status`

---

#### Migration 015: `tenant_10dlc_brands`
**Purpose**: Store approved 10DLC brand registrations (immutable once Twilio approves)

**Key Features**:
- Immutable after provider approval (compliance requirement)
- Multiple records per tenant allowed (for resubmission after business info changes)
- Tracks provider status (draft/pending/approved/rejected)
- Phone number allocation per brand
- Provider-agnostic design (works with Twilio, Bandwidth, Vonage, etc.)

**Schema**:
```sql
CREATE TABLE tenant_10dlc_brands (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  legal_business_name, dba_name, business_website, business_type, industry_vertical,
  business_registration_number, country, business_address, business_city, business_state, business_zip,
  owner_name, owner_title, owner_email, owner_phone,
  provider, provider_brand_id, provider_status, provider_status_reason,
  phone_number, provider_phone_id, phone_status,
  campaign_type, provider_config_json,
  is_active, deprecation_reason,
  created_at, updated_at, provider_verified_at, provider_approved_at
);
```

**Indexes**:
- `idx_tenant_10dlc_brands_tenant_id`
- `idx_tenant_10dlc_brands_active`
- `idx_tenant_10dlc_brands_provider_brand_id`
- `idx_tenant_10dlc_brands_provider_status`

**Design Philosophy**:
- **Immutability Pattern**: Once `provider_approved_at` is set, the record becomes READ-ONLY (Twilio compliance)
- **Multiple Registrations**: If business info changes post-approval, tenant submits new registration (gets new phone number)
- **Versioning**: Old registration stays active until explicitly deprecated; multiple active registrations supported

---

#### Migration 016: `tenant_channel_credentials_v2` (Later Dropped in 020)
**Status**: Created but later consolidated with `tenant_channel_settings`

**Note**: The project uses `tenant_channel_settings` (from 001_schema.sql) instead. This migration was dropped in migration 022 to avoid duplicate tables.

---

#### Migration 017: `message_provider_mappings`
**Purpose**: Map messages to provider-specific IDs for webhook matching

**Key Features**:
- Bridge table between internal message IDs and provider-specific IDs
- Critical for webhook processing (provider sends back their ID, we look it up here)
- Tracks last known provider status
- One row per message per provider (usually just one provider)

**Schema**:
```sql
CREATE TABLE message_provider_mappings (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  channel, provider, provider_message_id, provider_status,
  created_at, updated_at
);
```

**Indexes**:
- `idx_message_provider_mappings_provider_message_id`
- `idx_message_provider_mappings_message_id`
- `idx_message_provider_mappings_provider`

**Usage Example**:
```
1. Backend sends SMS via Twilio
   → Gets back provider_message_id = "SM1234567890abcdef"
   → Stores in message_provider_mappings

2. Twilio webhook arrives
   → Contains MessageSid = "SM1234567890abcdef"
   → We query message_provider_mappings to find our message_id
   → Update message status in messages table
```

---

#### Migration 018: `sms_phone_pool`
**Purpose**: Track SMS phone numbers allocated to tenants

**Key Features**:
- Currently one number per tenant per 10DLC registration
- Future scaling: manage pool of numbers across tenants
- Tracks allocation status and failures
- Supports provider-specific phone number IDs

**Schema**:
```sql
CREATE TABLE sms_phone_pool (
  id TEXT PRIMARY KEY,
  phone_number UNIQUE NOT NULL,
  twilio_phone_number_sid UNIQUE,
  tenant_id, allocated_at,
  status, failure_reason,
  created_at, updated_at
);
```

**Indexes**:
- `idx_sms_phone_pool_tenant_id`
- `idx_sms_phone_pool_status`
- `idx_sms_phone_pool_phone_number`

---

### Phase 2: Tenant Enhancements (Migrations 019-022)

#### Migration 019: `add_demo_flag_to_tenants`
**Purpose**: Add demo mode flags for sales/platform testing

**Changes**:
```sql
ALTER TABLE tenants ADD COLUMN is_demo BOOLEAN DEFAULT 0;
ALTER TABLE tenants ADD COLUMN demo_created_by TEXT;
ALTER TABLE tenants ADD COLUMN demo_created_at TIMESTAMP;
CREATE INDEX idx_tenants_is_demo ON tenants(is_demo);
```

**Usage**: Demo tenants get full workflow simulation without sending real messages

---

#### Migration 020: `add_message_status_reason`
**Status**: No-op - Column already exists in base schema

---

#### Migration 021: `extend_tenant_channel_settings`
**Status**: No-op - Provider metadata already in base schema

---

#### Migration 022: `drop_tenant_channel_credentials_v2`
**Purpose**: Clean up duplicate table definition

**Changes**:
```sql
DROP TABLE IF EXISTS tenant_channel_credentials_v2;
```

**Note**: Project uses consolidated `tenant_channel_settings` table from base schema

---

### Phase 3: Contact & Campaign Extensions (Migrations 023-024)

#### Migration 023: `add_sms_whatsapp_fields_to_contacts`
**Purpose**: Add SMS and WhatsApp specific fields to contacts

**Changes**:
```sql
ALTER TABLE contacts ADD COLUMN phone_number TEXT;           -- For SMS
ALTER TABLE contacts ADD COLUMN whatsapp_number TEXT;        -- For WhatsApp
ALTER TABLE contacts ADD COLUMN consent_sms BOOLEAN DEFAULT 0;
ALTER TABLE contacts ADD COLUMN consent_sms_updated_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN consent_whatsapp_updated_at TIMESTAMP;

CREATE INDEX idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX idx_contacts_whatsapp_number ON contacts(whatsapp_number);
CREATE INDEX idx_contacts_consent_sms ON contacts(tenant_id, consent_sms);
CREATE INDEX idx_contacts_consent_whatsapp ON contacts(tenant_id, consent_whatsapp);
```

**Rationale**:
- SMS and WhatsApp numbers may differ per contact
- Separate consent fields for GDPR/TCPA compliance
- Timestamp tracking for audit compliance

---

#### Migration 024: `add_provider_column_to_campaigns`
**Purpose**: Track provider used for campaign sending

**Changes**:
```sql
ALTER TABLE campaigns ADD COLUMN provider TEXT;
CREATE INDEX idx_campaigns_provider ON campaigns(provider);
```

**Rationale**:
- Associates campaign with specific provider (twilio, aws_ses, etc.)
- Works with existing `channel` column to determine full sending config
- Enables multi-provider support in future

---

## Schema Relationship Diagram

```
┌─────────────────────────────────────────────────────────┐
│ tenants (base schema)                                   │
│ + is_demo, demo_created_by, demo_created_at (M019)     │
└─────────────────────────────────────────────────────────┘
         │
         ├─→ tenant_business_info (M014) - Editable current state
         │
         ├─→ tenant_10dlc_brands (M015) - Immutable approved snapshots
         │
         ├─→ tenant_channel_settings (base schema)
         │   - SMS/WhatsApp/Email credentials
         │
         └─→ sms_phone_pool (M018) - Phone number allocation

┌─────────────────────────────────────────────────────────┐
│ campaigns (base schema)                                 │
│ + provider (M024)                                       │
└─────────────────────────────────────────────────────────┘
         │
         └─→ messages (base schema) - Individual messages
                 │
                 └─→ message_provider_mappings (M017)
                     - Links to provider-specific IDs for webhooks

┌─────────────────────────────────────────────────────────┐
│ contacts (base schema)                                  │
│ + phone_number, whatsapp_number (M023)                 │
│ + consent_sms, consent_sms_updated_at (M023)           │
│ + consent_whatsapp_updated_at (M023)                   │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Execution Order

Migrations execute in alphabetical order (001 through 024). The system automatically:

1. **Tracks executed migrations** in `schema_migrations` table
2. **Skips duplicate columns** gracefully (idempotency)
3. **Executes pending migrations** on application startup
4. **Logs execution** for auditing

**Example Log Output**:
```
🔄 Checking for pending database migrations...
📋 Found 2 pending migration(s):

  Running: 023_add_sms_whatsapp_fields_to_contacts.sql...
  ✓ 023_add_sms_whatsapp_fields_to_contacts.sql applied

  Running: 024_add_provider_column_to_campaigns.sql...
  ✓ 024_add_provider_column_to_campaigns.sql applied

✅ Successfully applied 2 migration(s)
```

---

## Data Consistency Notes

### Immutability Enforcement
- `tenant_10dlc_brands` records are LOCKED once `provider_approved_at` is set
- Application should check `provider_approved_at IS NOT NULL` before allowing updates
- UI should show read-only badge for approved registrations

### Multi-Tenant Isolation
- All tables use `tenant_id` as filtering criterion
- Foreign keys enforce tenant-level cascade deletes
- Contact consent fields are tenant-scoped

### SMS vs WhatsApp Phone Numbers
- `phone_number`: SMS recipient
- `whatsapp_number`: WhatsApp recipient (may be same or different)
- Both optional to allow gradual migration
- Consent tracked separately per channel

---

## Future Enhancements

1. **Message History**: Implement message audit trail with full provider status history
2. **Phone Pool Management**: Scale to manage pools of numbers across tenants
3. **Provider Abstraction**: Add more providers (Bandwidth, Vonage, etc.)
4. **Webhook Retries**: Implement exponential backoff for webhook delivery
5. **Compliance Reporting**: Add detailed audit reporting for SMS/WhatsApp/Email

---

## Testing Checklist

- [ ] All 24 migrations execute without errors
- [ ] Schema matches architecture specifications
- [ ] Indexes created correctly (query `PRAGMA index_list(tablename)`)
- [ ] Foreign key constraints enforced
- [ ] Tenant isolation verified (no cross-tenant leakage)
- [ ] Demo mode flag works correctly
- [ ] Provider mappings enable webhook lookup
- [ ] Contact consent fields track SMS and WhatsApp separately
