# EngageNinja Brownfield Requirements — Billing/Payments + SMS (v0.1)
_Last updated: 2025-12-16_

This document covers **only what's missing** (brownfield delta), assuming the product already has:
- Multi-tenancy (users ↔ tenants), tenant-scoped campaigns/contacts/templates/channels
- Cookie-session auth, server-resolved tenant context
- WhatsApp Cloud + SES (and "provider abstraction" pattern)

---

## 1) Why we need Billing now
Your pricing is driven by **message/email volume**, so billing must support:
- Subscription plan + monthly limits
- Metered usage (WA messages, emails, SMS)
- Overages (block vs bill) per plan
- Global selling (US + India + Middle East next)

---

## 2) Payments strategy for global selling

### 2.1 Approach (MVP)
Implement **Billing Provider Abstraction** (exactly like channels):

**BillingProvider interface**
- createCustomer(tenant)
- createCheckoutSession(plan, tenant, returnUrls)
- createBillingPortalSession(tenant)
- handleWebhook(event)
- getSubscriptionStatus(tenant)
- (optional) createInvoice / applyCredits

**Phase 1 (MVP):**
- Use **Stripe** as the default billing provider for all regions (globally).
- India expansion: start with Stripe globally; add region-specific adapters (Razorpay, etc.) in Phase 2 if needed.

### 2.2 Server regions
Not required for MVP.
- Start with **one primary region** (simple ops).
- Add **regional deployment** only if you need:
  - latency-sensitive delivery (less true for WhatsApp/Email/SMS)
  - **data residency** commitments (Enterprise, Phase 2+)
  - regulatory constraints for storing PII in certain countries

---

## 3) Billing functional requirements

### 3.1 Plans, limits, and usage
Plans define:
- monthly included limits:
  - wa_messages_included
  - emails_included
  - sms_included
- hard enforcement policy:
  - **Hard cap**: block sending when exceeded (MVP standard)
- per-tenant quota overrides:
  - Admin can override limits for individual tenants (support/special cases)

**MVP approach:** Hard cap enforcement with per-tenant override support.

### 3.2 Subscription lifecycle
Tenant owner/admin can:
- Start trial (if enabled)
- Upgrade/downgrade plan (effective immediately or next cycle)
- Cancel subscription (end of period; keep read-only access after)
- View invoices/receipts
- Update payment method

Platform admin can:
- Set plan/limits for a tenant (support operation)
- Override limits per tenant (already supported)
- Suspend tenant (payment failure / abuse)
- Apply credits (optional, Phase 2)

### 3.3 Dunning / failed payments (MVP)
Define states:
- `active`
- `past_due`
- `unpaid`
- `canceled`
- `trialing`

Behavior:
- When `past_due`: show warnings, allow limited access (no sending)
- When `unpaid`: block sending + show billing CTA
- Always keep read-only access to historical metrics

### 3.4 Taxes
**Out of scope for MVP.** Defer to Phase 2+.
- Show taxes line item if billing provider calculates it.
- Store "billing country" and "business vs individual" flag for future tax accuracy.

---

## 4) Billing UI requirements (in-app)
Add a **Billing** section (tenant-scoped):
- Current plan
- Usage this month (WA/Email/SMS)
- Limits and remaining quota
- Upgrade/Downgrade CTA
- Payment method status (masked)
- Invoices list (download links)
- Billing portal link (provider-hosted is fine for MVP)

Add a **Paywall modal** when user hits limit:
- "You reached your monthly limit (X/Y). Upgrade to continue."
- Upgrade button + contact sales link

---

## 5) Billing data model (delta)
Add tables (logical; SQLite now, Postgres later):

### 5.1 `billing_customers`
- tenant_id (PK/FK)
- provider (stripe | ...)
- provider_customer_id
- created_at, updated_at

### 5.2 `subscriptions`
- id
- tenant_id
- provider
- provider_subscription_id
- plan_key (free/starter/growth/pro/enterprise)
- status (trialing/active/past_due/unpaid/canceled)
- current_period_start, current_period_end
- cancel_at_period_end (bool)
- created_at, updated_at

### 5.3 `invoices`
- id
- tenant_id
- provider
- provider_invoice_id
- amount_total, currency
- status (paid/open/void/uncollectible)
- hosted_invoice_url (optional)
- created_at

### 5.4 `usage_rollups` (extend existing usage)
- tenant_id
- period_start, period_end (month)
- wa_messages_sent
- emails_sent
- sms_sent
- updated_at

### 5.5 `plan_overrides` (per-tenant quota overrides)
- tenant_id
- plan_key
- wa_messages_override (nullable)
- emails_override (nullable)
- sms_override (nullable)
- created_by (admin user id)
- created_at, updated_at

### 5.6 `credits` (optional, Phase 2)
- tenant_id
- amount (in minor units) or "message credits"
- reason
- created_by
- created_at

---

## 6) Billing API contracts (delta)
Tenant-scoped:
- GET  /billing/summary
- POST /billing/checkout-session (plan_key)
- POST /billing/portal-session
- GET  /billing/invoices

Webhooks:
- POST /webhooks/billing/stripe

Platform admin:
- PATCH /admin/tenants/:id/plan (plan_key, limits overrides)
- POST  /admin/tenants/:id/credits (Phase 2)

---

## 7) Add SMS as a first-class channel (brownfield)

### 7.1 Product decision
Because WhatsApp adoption is lower in the US, SMS becomes a key channel for US-market fit.

**Phase 1 goal:** SMS broadcast campaigns (similar to WhatsApp campaigns: audience → send → delivery results).
**Phase 2+:** Journeys/automation, MMS, short links, keyword opt-in, etc.

### 7.2 SMS provider abstraction (Day-1)
Add a third channel type: `sms` with its own provider interface.

**SmsProvider interface**
- connect(tenant, credentials)
- getSenderIdentities(tenant) (phone numbers / sender IDs)
- sendSmsCampaign(tenant, text, recipients)
- parseWebhook(request) → delivery status events

**MVP provider:** AWS SNS (scalable, reliable, cost-effective).

### 7.3 Compliance (must-have even in MVP)
- **Opt-out** support: if a recipient replies "STOP", mark them opted-out for SMS.
- Store per-contact:
  - consent_sms (bool)
  - opt_out_sms (bool)
  - consent_source + timestamps
- Add "Include compliance footer" option for SMS templates (where required).
- Region differences (US TCPA/CTIA) are real; MVP provides opt-out mechanics and basic consent logging.

### 7.4 UI/UX (SMS)
- Tenant Settings → Channels → SMS
  - connect provider (AWS SNS)
  - select sending number (or sender ID)
- Campaigns → Create → Channel = SMS
  - message body with character counter
  - audience selection by tags
  - send
- Campaign detail:
  - sent/delivered/failed counters
  - (optional) click tracking later

### 7.5 Metering
- Count **sms_sent** separately for billing and plan caps.
- SMS cost is non-trivial; hard-cap is recommended (MVP standard).

---

## 8) Implementation sequence (so it doesn't drag)
**Week 1–2 (Billing MVP)**
1) Add billing provider abstraction + Stripe adapter
2) Add subscription/usage tables
3) Add billing UI: plan, usage, upgrade
4) Add Stripe webhooks → update subscription state
5) Enforce send-block on exceeded limits + paywall

**Week 2–3 (SMS MVP)**
1) Add SMS channel type + provider interface (AWS SNS)
2) Add SMS campaign create/send + basic delivery statuses
3) Add opt-out + consent fields
4) Add metering and plan caps

---

## 9) Key decisions (resolved)
1. ✓ Billing provider: **Stripe globally** for MVP; regional adapters Phase 2+
2. ✓ Plan policy: **Hard cap** (block over limits)
3. ✓ Per-tenant overrides: **Supported** (admin can override quota per tenant)
4. ✓ SMS provider: **AWS SNS**
5. ✓ Tax handling: **Deferred to Phase 2+** (MVP: taxes from provider only)
6. ✓ Regional deployment: **Deferred to Phase 2+** (single region MVP)
