# EngageNinja Billing System

Complete documentation for the Stripe-integrated multi-tenant SaaS billing system.

## Overview

EngageNinja includes a comprehensive subscription billing system with:
- Multiple pricing tiers (free, starter, growth, pro, enterprise)
- Plan upgrades and downgrades
- Automated invoice generation and PDF download
- Email notifications for billing events
- Subscription management with Stripe
- Admin tenant billing management

## Architecture

### Backend Components

**Stripe Integration** (`src/services/stripe.js`)
- Subscription creation and management
- Webhook event handling (created, updated, deleted, canceled)
- Signature verification for webhook security
- Subscription status tracking
- Plan detection from Stripe product data

**Billing Routes** (`src/routes/billing.js`)
- `GET /billing/plans` - List available plans
- `GET /billing/summary` - Current plan, usage, limits
- `POST /billing/checkout-session` - Create Stripe checkout
- `POST /billing/portal-session` - Link to Stripe billing portal
- `POST /billing/sync-subscription` - Manually sync with Stripe
- `GET /billing/invoices` - List invoices
- `GET /billing/invoices/:id/download` - Download invoice PDF

**Billing Summary** (`src/services/billingSummary.js`)
- Usage tracking and calculation
- Remaining quota determination
- Plan limit enforcement
- Subscription status retrieval

**Invoice Generator** (`src/services/invoiceGenerator.js`)
- PDF invoice generation with Puppeteer
- Local or cloud storage support
- Invoice numbering and archival

**Email Notifications** (`src/services/emailService.js`)
- Payment success/failure emails
- Subscription cancellation notifications
- Plan upgrade confirmations

### Frontend Components

**Billing Page** (`frontend/src/pages/BillingPage.jsx`)
- Display current plan and usage
- Plan comparison and selection
- Upgrade/downgrade flows
- Invoice management
- Subscription status display

**Admin Billing** (`frontend/src/pages/admin/TenantBillingTab.jsx`)
- Tenant billing overview
- Plan assignment
- Quota overrides
- Custom pricing configuration

### Database Schema

**billing_customers**
- Tracks Stripe customer IDs per tenant
- Links tenants to Stripe accounts

**subscriptions**
- Subscription lifecycle tracking
- Status: trialing, active, past_due, unpaid, canceled
- Current period tracking
- Cancellation reason tracking

**invoices**
- Invoice history and records
- Amount, currency, status
- Hosted invoice URL
- PDF generation tracking

**plan_overrides**
- Per-tenant custom quotas
- Allows specific customers different limits
- Created by admin users

**tenants** (additions)
- `plan_id` - Current plan (free, starter, growth, pro, enterprise)
- `price` - Monthly price in dollars
- `stripe_price_id` - Stripe price ID for this plan
- `subscription_status` - Current subscription status
- `subscription_cancelled_at` - When subscription was cancelled
- `subscription_cancellation_reason` - Why it was cancelled

## Pricing Plans

| Plan | Price | WhatsApp | Email | SMS | Users | Contacts | AI | API |
|------|-------|----------|-------|-----|-------|----------|----|----|
| Free | $0 | 100/mo | 500/mo | 0 | 1 | 100 | No | No |
| Starter | $49 | 500/mo | 5,000/mo | 0 | 3 | 1,000 | No | No |
| Growth | $129 | 2,000/mo | 25,000/mo | 1,000/mo | 10 | 10,000 | Yes | No |
| Pro | $299 | 5,000/mo | 100,000/mo | 5,000/mo | 25 | 50,000 | Yes | Yes |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Yes | Yes |

## Setup

### 1. Stripe Configuration

Get credentials from [Stripe Dashboard](https://dashboard.stripe.com/apikeys):

```bash
# In backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Create Stripe Products and Prices

For each plan (except free), create:
1. Product in Stripe Dashboard
2. Monthly recurring price
3. Copy the price ID

```bash
# Update backend/.env with price IDs
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### 3. Configure Webhook

In Stripe Dashboard → Webhooks:
1. Add endpoint: `{APP_URL}/webhooks/billing/stripe`
2. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
3. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 4. Database Migrations

Migrations run automatically on server startup:
- `010_billing_tables.sql` - Core billing tables
- `011_add_stripe_price_to_tenants.sql` - Stripe price tracking
- `012_add_subscription_tracking.sql` - Subscription events
- `013_add_subscription_cancellation_tracking.sql` - Cancellation tracking

### 5. Invoice Storage

Configure where invoices are saved:

```bash
# Local storage (default)
INVOICE_STORAGE=local
# Invoices saved to: backend/invoices/{tenantId}_{invoiceNumber}.pdf

# Cloud storage
INVOICE_STORAGE=cloud
CLOUD_STORAGE_PROVIDER=s3
AWS_S3_BUCKET=your-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Usage

### For Users

#### Upgrade Plan
1. Go to Settings → Billing
2. Click "Upgrade" on desired plan
3. Complete payment in Stripe Checkout
4. Redirected to billing page with new plan active
5. Plan updates immediately upon payment confirmation

#### View Invoices
1. Settings → Billing → Invoices section
2. Click invoice to download PDF
3. Invoices include:
   - Invoice number and date
   - Tenant billing information
   - Plan and pricing details
   - Payment status

#### Manage Subscription
1. Click "Manage Subscription" button
2. Redirect to Stripe customer portal
3. Can view invoices, update payment method, cancel subscription

### For Admins

#### Assign Plans
1. Admin → Tenants → Select tenant
2. Plan section
3. Change plan dropdown
4. Save changes
5. Tenant is now on new plan

#### Override Quotas
1. Admin → Tenants → Select tenant
2. Quota Overrides tab
3. Set custom limits for WhatsApp, Email, SMS
4. Save changes
5. System uses overrides instead of plan defaults

#### Custom Pricing
```sql
-- Set custom price for specific tenant
UPDATE tenants
SET price = 99.99
WHERE id = 'tenant-uuid';
```

#### Manual Sync
If subscription data is out of sync with Stripe:

```bash
# Via API
POST /api/billing/sync-subscription

# Via database
sqlite3 backend/database.sqlite \
  "SELECT * FROM subscriptions WHERE tenant_id = '...';"
```

## API Endpoints

### User Billing API

**Get Available Plans**
```
GET /api/billing/plans
Returns: List of plans with features and current status
```

**Get Billing Summary**
```
GET /api/billing/summary
Returns: {
  plan: { id, name, features, pricing },
  usage: { whatsapp_sent, email_sent, sms_sent },
  limits: { whatsapp, email, sms },
  remaining: { whatsapp, email, sms },
  subscription: { status, current_period_end, cancel_at_period_end },
  subscription_cancelled_at,
  subscription_cancellation_reason
}
```

**Create Checkout Session**
```
POST /api/billing/checkout-session
Body: { plan_key: "growth" }
Returns: { url: "https://checkout.stripe.com/..." }
```

**Create Billing Portal Session**
```
POST /api/billing/portal-session
Returns: { url: "https://billing.stripe.com/..." }
```

**List Invoices**
```
GET /api/billing/invoices
Returns: [ { id, amount, currency, status, download_url, created_at } ]
```

**Download Invoice**
```
GET /api/billing/invoices/:invoiceId/download
Returns: PDF binary stream
```

### Admin Billing API

**Assign Plan to Tenant**
```
PATCH /api/admin/tenants/:tenantId
Body: { planId: "growth" }
```

**Set Quota Override**
```
PATCH /api/admin/tenants/:tenantId/quota-override
Body: {
  wa_messages_override: 1000,
  emails_override: 5000,
  sms_override: 500
}
```

**Get Tenant Billing**
```
GET /api/admin/tenants/:tenantId/billing
Returns: Billing summary, subscription info, invoices
```

## Webhooks

Stripe sends webhook events for:

**customer.subscription.created**
- Triggered when user completes checkout
- Plan detection from product name
- Database subscription created
- Tenant plan updated

**customer.subscription.updated**
- Plan change, cancellation, reactivation
- Status updates (active → past_due, etc)
- Period updates

**customer.subscription.deleted**
- Subscription cancelled from Stripe
- Updated to "canceled" status
- Cancellation email sent

**invoice.paid**
- Payment received
- Invoice saved to database
- PDF generated
- Payment confirmation email sent

**invoice.payment_failed**
- Payment declined
- Grace period starts
- Failure notification email sent

## Troubleshooting

### Plan Not Updating After Upgrade

**Issue**: User upgrades but plan stays the same

**Solution**:
1. Check webhook was received: Look for "POST /webhooks/stripe 200" in logs
2. Check product name: Should be "Growth Plan", "Starter Plan", etc.
3. Verify Stripe price ID is correct
4. Check tenant subscription: `SELECT * FROM subscriptions WHERE tenant_id = '...';`

### Webhook Signature Verification Fails (401)

**Issue**: Webhooks returning 401 Unauthorized

**Cause**: Incorrect signature verification

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` in `.env` matches Stripe Dashboard
2. Check webhook URL is correct: `/webhooks/billing/stripe`
3. Restart backend after changing secret
4. Stripe signs: `timestamp.payload` as HMAC-SHA256

### Invoice PDF Not Generated

**Issue**: Invoice download fails or PDF is empty

**Solution**:
1. Check invoice storage setting: `INVOICE_STORAGE=local` (default)
2. Verify invoices directory exists: `backend/invoices/`
3. Check disk space and permissions
4. For cloud storage: Verify cloud credentials in `.env`

### Tenant Has NULL stripe_price_id

**Issue**: Tenant can't upgrade to paid plans

**This is normal** if tenant is on free plan. Only paid plans have price IDs.

**To fix**: Assign any paid plan to tenant via admin UI, then price will sync.

## Development

### Local Testing

1. Start backend: `npm start` (port 5173)
2. Start frontend: `npm run dev` (port 3173)
3. Test Stripe flow:
   - Use Stripe test card: 4242 4242 4242 4242
   - Any future expiry date
   - Any 3-digit CVC

### Testing Webhooks Locally

Use ngrok to expose localhost to internet:

```bash
# In new terminal
ngrok http 5173

# In Stripe Dashboard:
# Webhook URL: https://your-ngrok-url/webhooks/billing/stripe
# Copy webhook secret from there to STRIPE_WEBHOOK_SECRET in .env
```

### Debugging Webhooks

```bash
# Check webhook processing log
sqlite3 backend/database.sqlite \
  "SELECT * FROM webhook_processing_log WHERE created_at > datetime('now', '-1 hour');"

# Check subscriptions created
sqlite3 backend/database.sqlite \
  "SELECT tenant_id, plan_key, status FROM subscriptions LIMIT 10;"

# Check invoices saved
sqlite3 backend/database.sqlite \
  "SELECT tenant_id, amount_total, status FROM invoices LIMIT 10;"
```

## Performance Considerations

- Stripe API calls are cached where possible
- Invoice PDFs are generated once and stored
- Webhook deduplication prevents double-processing
- Usage calculations are efficient (indexed queries)
- Plan limits queried on every message (optimized)

## Security

- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Tenant-scoped API access (all endpoints check tenant)
- ✅ Webhook deduplication (prevents double billing)
- ✅ Admin-only endpoints protected
- ✅ Secure invoice download (tenant verification)
- ✅ No payment data stored (all with Stripe)

## Future Enhancements

- [ ] Prorated billing for mid-cycle upgrades
- [ ] Automatic retry for failed payments
- [ ] Usage-based billing (overage charges)
- [ ] Multi-currency support
- [ ] Annual billing discounts
- [ ] Team billing with cost allocation
- [ ] Custom invoice templates
- [ ] Dunning management

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/services/stripe.js` | Stripe API integration |
| `backend/src/routes/billing.js` | Billing API endpoints |
| `backend/src/services/billingSummary.js` | Usage calculation |
| `backend/src/services/invoiceGenerator.js` | PDF generation |
| `backend/src/routes/webhooks.js` | Webhook handling |
| `backend/db/migrations/01*.sql` | Database schema |
| `frontend/src/pages/BillingPage.jsx` | User billing UI |
| `frontend/src/pages/admin/TenantBillingTab.jsx` | Admin billing UI |
| `backend/.env` | Configuration |

---

**Last Updated**: December 18, 2025
**Status**: Production Ready
**Version**: 1.0
