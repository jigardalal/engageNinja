# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EngageNinja** is an AI-first, WhatsApp-first customer engagement platform for SMBs and teams managing messaging at scale. It's a multi-tenant SaaS application with full RBAC (Role-Based Access Control), Stripe billing integration, and support for WhatsApp and Email channels.

**Stack**: React 18 + Vite (frontend), Express.js + PostgreSQL (backend), Stripe for billing, Claude API for AI features.

## Documentation Structure

All project documentation is organized in `/docs/` directory. **Key files to read:**

- **README.md** (root) - Project overview, quick start, and API reference
- **docs/DESIGN.md** - Design system, components, and styling
- **docs/DATABASE.md** - Database schema, migrations, and relationships
- **docs/BACKEND_SCRIPTS.md** - Setup and maintenance scripts (db-init, db-seed)
- **docs/TESTING.md** - Testing infrastructure and test categories
- **docs/README.md** - Full documentation index and navigation

**Current Status**: See **CURRENT_STATUS.md** (root) for latest configuration and project status.

## Build, Lint, and Test Commands

### Development

```bash
# Full dev stack (frontend + backend with auto-reload)
npm run dev

# Isolated servers (useful for testing with separate DB)
npm run dev:test              # Runs on ports 3174 (frontend) and 5174 (backend)

# Single service
npm run dev:backend           # Backend only (port 5173)
npm run dev:frontend          # Frontend only (port 3173)

# Initialize or reset database
npm run db:init              # Create schema + seed data
npm run db:seed              # Re-seed data only
npm run db:reset             # Full reset
npm run db:reset:test        # Reset test database
```

### Linting

```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

### Testing

```bash
# Backend webhook integration tests
npm run test:webhooks --prefix backend

# See docs/TESTING.md for full backend testing documentation
```

### Build and Production

```bash
npm run build               # Build frontend + backend
npm run start               # Start production server
```

## Project Architecture

### Directory Structure

```
engageninja/
├── backend/                     # Express.js backend
│   ├── src/
│   │   ├── index.js            # Express app setup with middleware, routes, error handling
│   │   ├── db.js               # PostgreSQL database connection (async/await with pg)
│   │   ├── middleware/         # Auth and RBAC enforcement
│   │   ├── routes/             # API endpoints (auth, contacts, campaigns, templates, etc.)
│   │   ├── services/           # Business logic (WhatsApp, Email, Stripe, messageQueue, etc.)
│   │   └── utils/              # Audit logging, global tags sync, subscription checks
│   ├── db/
│   │   ├── migrations/         # Sequential SQL migrations (001_schema.sql, 002_features_consolidated.sql)
│   │   └── seeds/              # Seed data for local development
│   └── scripts/                # Admin scripts (db-init, db-seed, test servers)
│
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── pages/              # Route-based page components (Dashboard, Contacts, Campaigns, etc.)
│   │   ├── components/         # Reusable UI components and domain-specific components
│   │   ├── context/            # React Context (AuthContext, ThemeContext)
│   │   ├── hooks/              # Custom hooks (useCampaignSSE, etc.)
│   │   ├── utils/              # API client, helpers
│   │   └── App.jsx             # Main router setup
│   └── vite.config.js
│
└── scripts/                     # Root-level automation
    ├── ui/                      # Puppeteer-based UI automation tests
    └── api/                     # API workflow and integration tests
```

### Key Architecture Patterns

#### Multi-Tenancy with RBAC

- **User-Tenant Association**: Each user can belong to multiple tenants with different roles
- **Role Hierarchy** (tenant level): `viewer` (0) < `member` (1) < `admin` (2) < `owner` (3)
- **Global Roles**: Platform admins have `system_admin`, `platform_admin`, or `platform_support` roles
- **Session Context**: Active tenant ID stored in `req.session.activeTenantId` and enforced via `validateTenantAccess` middleware
- **RBAC Enforcement**: `requireTenantRole(role)` middleware checks role hierarchy and membership status

**Key Files**:
- `backend/src/middleware/rbac.js`: Role checking with hierarchy validation
- `backend/src/middleware/auth.js`: Session-based authentication
- `backend/db/migrations/001_schema.sql`: Complete schema including `user_tenants`, RBAC, billing, and all features

#### Database Layer

- **PostgreSQL** only (no SQLite support for development or production)
- **Async/Await API**: All queries are non-blocking with `pg` library
- **Connection Pooling**: Max 20 connections with AWS RDS optimizations
- **Migration System**: Auto-runs on startup via `backend/src/db/migrator.js`
- **Foreign Keys**: Enforced at database level

**Schema Highlights**:
- `users`: Platform users with global role and active status
- `tenants`: Multi-tenant workspaces with plan and subscription tracking
- `user_tenants`: Junction table with role-based access (owner/admin/member/viewer)
- `contacts`, `campaigns`, `messages`: Tenant-scoped data
- `whatsapp_templates`, `email_templates`: Channel-specific templates
- `usage_counters`, `subscriptions`: Billing and usage tracking
- `audit_logs`: Compliance logging for all tenant operations
- `global_tags`, `tenant_tags`: Tag hierarchies with status/archival

**Key Files**:
- `backend/src/db.js`: Database initialization
- `backend/db/migrations/`: Sequential migration files
- `backend/src/db/migrator.js`: Migration runner

#### Message Delivery Architecture

- **Queue-Based Sending**: Messages queued in `messages` table with `status` field
- **Background Processor**: `backend/src/services/messageQueue.js` polls queued messages and sends via provider
- **Webhook Ingestion**: `/webhooks/whatsapp` and `/webhooks/email` receive provider status updates
- **SSE Streaming**: Frontend subscribes to real-time message status updates via `/api/campaigns/{id}/sse`
- **Provider Integration**: `backend/src/services/whatsapp.js` and `backend/src/services/emailService.js` handle sending

**Status Flow**: `queued` → `sending` → `sent` / `failed` → `delivered` / `read`

**Key Files**:
- `backend/src/services/messageQueue.js`: Message queue processor
- `backend/src/services/metricsEmitter.js`: SSE event emitter
- `backend/src/routes/webhooks.js`: Webhook handlers

#### Billing and Subscription

- **Stripe Integration**: `backend/src/services/stripe.js` handles webhook events and subscription lifecycle
- **Usage Tracking**: `usage_counters` table tracks monthly message usage per tenant and channel
- **Plan Limits**: `plans` table defines quota per tier (WhatsApp messages, email messages, max users, contacts limit, etc.)
- **Subscription Status**: `subscriptions` table tracks `status` (active, cancelled, incomplete, etc.) and cancellation date
- **Billing Summary**: `/api/billing/summary` returns usage and remaining quota for current month

**Key Files**:
- `backend/src/services/stripe.js`: Stripe provider and webhook handler
- `backend/src/services/billingProvider.js`: Abstract billing interface
- `backend/src/routes/billing.js`: Billing API endpoints
- `backend/db/migrations/010_billing_tables.sql`: Billing schema

#### Frontend State Management

- **React Context**: `AuthContext` manages user/tenant session; `ThemeContext` manages UI theme
- **Hooks**: Custom hooks like `useCampaignSSE` encapsulate SSE subscription logic
- **API Client**: `src/utils/api.js` wraps fetch with error handling and tenant context
- **Protected Routes**: `ProtectedRoute` component enforces authentication and active tenant selection

**Key Files**:
- `frontend/src/context/AuthContext.jsx`: Session state and tenant switching
- `frontend/src/utils/api.js`: API client wrapper
- `frontend/src/components/ProtectedRoute.jsx`: Route protection

#### Conversion Optimization System (4 Phases)

The application includes a comprehensive **4-phase conversion optimization system** designed to increase free-to-paid conversion by 15-25%. Each phase builds on the previous to create a complete funnel optimization experience.

**Phase 1: Quick Wins & Foundation** (+5-10% conversion lift)
- **Usage Alerts**: Color-coded warnings at 70%, 80%, 90% usage thresholds
- **Plan Context Card**: Dashboard card showing current plan + usage + next tier
- **Contact Limit Alerts**: Warning when approaching contact limits
- **Empty State Upgrades**: Contextual upgrade hints in empty UI states
- **Key Files**: `frontend/src/components/billing/UsageAlert.jsx`, `PlanContextCard.jsx`, `ContactLimitAlert.jsx`

**Phase 2: Feature Lock Infrastructure** (+10-15% conversion lift)
- **FeatureLock Component**: Wraps premium features with lock overlay + modal
- **useFeatureAccess Hook**: Centralized plan tier checking (free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4)
- **Upgrade Banners**: Flexible compact and full-card variants for prompts
- **Feature-Specific Locks**: Scheduled sending (Starter+), bulk actions (Growth+), resend workflows (Starter+)
- **Key Files**: `frontend/src/components/billing/FeatureLock.jsx`, `frontend/src/hooks/useFeatureAccess.js`, `UpgradeBanner.jsx`

**Phase 3: Engagement & Growth Features** (+8-12% conversion lift)
- **Milestone Celebrations**: Toast notifications at campaign/contact/message milestones with localStorage persistence
- **Usage Projections**: Real-time calculations predicting if user will exceed limits month-end
- **Welcome Carousel**: 3-step onboarding for new users (features → first campaign → paid plans)
- **Plan Comparison Widget**: Side-by-side current vs next tier with new feature highlighting
- **Key Files**: `frontend/src/hooks/useMilestoneCelebrations.js`, `frontend/src/components/billing/UsageProjection.jsx`, `WelcomeCarousel.jsx`, `PlanComparisonWidget.jsx`

**Phase 4: Analytics & Optimization** (+5-8% conversion lift)
- **Event Tracking**: `frontend/src/utils/conversionTracking.js` for tracking all user interactions
- **Conversion Copy**: `frontend/src/constants/conversionCopy.js` with centralized messaging for consistency
- **A/B Testing Framework**: `frontend/src/utils/abTesting.js` with 6 predefined tests ready to deploy
- **Analytics Endpoints**: `backend/src/routes/analytics.js` with metrics, funnel, and A/B test reporting
- **Email Automation**: `backend/src/services/conversionEmails.js` for triggered emails (usage warnings, milestones, feature locks)
- **Database Schema**: `backend/db/migrations/011_conversion_analytics.sql` with event tracking tables

**Integration Points**:
- Dashboard: Milestone tracking + welcome carousel for new users
- Usage Page: Projection widget + plan comparison + upgrade banners
- Campaign Detail: Feature locks on send/resend buttons
- Campaigns List: Feature lock on bulk archive action
- Analytics: Real-time event tracking to `/api/analytics/events`

**Key Concepts**:
- **Non-blocking tracking**: Events sent via fire-and-forget, won't affect UX if analytics down
- **Deterministic A/B tests**: Same variant per user session across browser instances
- **Smart email triggers**: 24-48 hour cooldowns per event type to prevent spam
- **localStorage persistence**: Dismissal state, milestone tracking, welcome carousel status
- **Plan tier checking**: Simple (string-based) or full (with useFeatureAccess hook)

## Common Development Tasks

### Adding a New Tenant API Endpoint

1. Create a new route file in `backend/src/routes/` or add to existing
2. Import route in `backend/src/index.js` and mount on `app.use()`
3. Use `validateTenantAccess` middleware to enforce tenant context
4. Use `requireTenantRole('member')` or similar to enforce RBAC
5. Use `req.tenantId` to scope queries to current tenant
6. Return errors with appropriate HTTP status codes

Example:
```javascript
const { validateTenantAccess, requireTenantRole } = require('../middleware/rbac');

router.get('/', validateTenantAccess, requireTenantRole('member'), async (req, res) => {
  const data = await db.prepare('SELECT * FROM table WHERE tenant_id = ?').all(req.tenantId);
  res.json(data);
});
```

### Running a Single Test

```bash
# Backend webhook integration test
npm run test:webhooks --prefix backend

```

### Working with Database Migrations

1. Add new migration file in `backend/db/migrations/` with incremental number (e.g., `003_new_feature.sql`)
2. Write SQL using PostgreSQL syntax; migrations auto-run on backend startup
3. To test locally, reset database: `npm run db:reset`
4. For test environment: `npm run db:reset:test`

**Note**: Only 2 migration files are used: `001_schema.sql` (core schema) and `002_features_consolidated.sql` (features)

### Handling Webhook Signatures

- **WhatsApp**: Signature verification uses per-tenant tokens/secrets from `tenant_channel_settings` table
- **Enable verification**: Set `ENABLE_WEBHOOK_VERIFICATION=true` in `backend/.env`
- **Test verification**: Run `npm run test:webhooks --prefix backend` while backend is running
- Missing tenant secrets will cause verification to fail; no fallback to env values

### Message Status and SSE

- Messages use SSE for real-time frontend updates during campaigns
- Backend emits events via `metricsEmitter.emit('message-status', { campaign_id, ... })`
- Frontend subscribes using `useCampaignSSE` hook
- Connection automatically closes when campaign completes or page unmounts

### Global Tags vs Tenant Tags

- **Global Tags**: Managed by platform admins in admin console; synced to tenant tags
- **Tenant Tags**: Tenant admins manage their own tags with status (active/archived) and member access gating
- **Sync Endpoint**: `/api/admin/global-tags/sync/{tenantId}` copies global tags into tenant context
- **Audit Logged**: All tag operations create audit log entries for compliance

## Testing Strategy

### Backend Testing

See **docs/TESTING.md** for comprehensive backend testing documentation covering:
- RBAC tests (role-based access control verification)
- Integration tests (API endpoint validation)
- Database tests (schema and integrity checks)
- Webhook signature verification

## Important Notes

### Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/engageninja`)
- `PORT` or `BACKEND_PORT`: Server port (default 5173)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Frontend URL for CORS (default `http://localhost:3173`)
- `SESSION_SECRET`: Secret for session signing
- `SESSION_TIMEOUT_DAYS`: Session expiry (default 30)
- `ENABLE_WEBHOOK_VERIFICATION`: Enable signature verification for webhooks
- `STRIPE_SECRET_KEY`: Stripe API key for billing
- External service credentials (Meta WhatsApp, SES, Claude API, Brevo, etc.)

**Frontend** (`frontend/.env`):
- `VITE_BACKEND_URL`: Backend API URL (default inferred from port)

### Session and Authentication

- Session-based with HTTP-only cookies
- Session stored in memory (not persisted; resets on server restart)
- Active tenant ID stored in `req.session.activeTenantId`
- User must select a tenant after login; tenant context required for all tenant-scoped routes

### Error Handling

- Express error handler middleware catches all errors and returns JSON with statusCode, message, stack (dev only)
- Return explicit error responses: `res.status(400).json({ error: 'message' })`
- RBAC violations return 403; missing auth returns 401; validation errors return 400

### Port Configuration

- Frontend: 3173 (default), configurable via `FRONTEND_PORT` or `VITE_PORT`
- Backend: 5173 (default), configurable via `BACKEND_PORT` or `PORT`
- Test environment: Frontend 3174, Backend 5174 (via `npm run dev:test`)

### Message Queue Processing

- Messages are queued on campaign send, with initial status `queued`
- `backend/src/services/messageQueue.js` runs as background job on startup
- Processes batches of queued messages; respects rate limiting per provider
- Failed messages retry; check `attempts` and `status_reason` fields in database

### Audit Logging

- All tenant operations (create, update, delete) logged to `audit_logs` table via `backend/src/utils/audit.js`
- Includes: action, resource type, resource ID, user ID, changes (JSON), timestamp, tenant context
- Used for compliance and debugging
- Platform admin can view audit logs in admin console

### Subscription Checks

- `backend/src/utils/subscriptionChecks.js` enforces plan limits before operations
- Called before sending campaigns, adding contacts, etc.
- Returns available quota and enforces hard limits per plan
- Billing summary endpoint shows real-time usage vs quota

### Performance Considerations

- **Async DB**: PostgreSQL with async/await queries and connection pooling (max 20 connections)
- **Message Queue**: Batched processing; tune batch size and rate in `messageQueue.js`
- **SSE Scaling**: Each connected client holds open connection; consider switching to WebSockets or pub/sub for high concurrency
- **Indexes**: Critical queries have indexes; check `backend/db/migrations/001_schema.sql` for composite indexes on frequently filtered columns

## Debugging Tips

1. **Check backend logs**: Look for request method, path, status code, duration
2. **Inspect database**: Use CLI `psql postgresql://engageninja:engageninja@localhost:5433/engageninja` to query tables directly
3. **Enable webhook verification logs**: Set `ENABLE_WEBHOOK_VERIFICATION=true` and check console output
4. **Test SSE connection**: Open browser DevTools → Network tab → filter for `/sse` endpoints
5. **Verify tenant context**: Check `req.session.activeTenantId` in middleware
6. **Review migrations**: If schema issues, check `backend/db/migrations/` for migration order and FK constraints

## Key Dependencies

**Backend**:
- `express@4.18.2`: Web framework
- `pg@8.x`: PostgreSQL driver with async/await support
- `bcrypt@5.1.1`: Password hashing
- `express-session@1.17.3`: Session management
- `stripe@14.25.0`: Stripe SDK for billing
- `csv-parser@3.2.0`: CSV import support

**Frontend**:
- `react@18.2.0`: UI framework
- `vite@5.0.8`: Build tool
- `tailwindcss@3.4.1`: Utility CSS
- `react-router-dom@6.20.1`: Client-side routing
- `react-quill@2.0.0`: Rich text editor

## Recent Major Changes

(Based on recent commits)

- **Conversion Optimization System (4 Phases)**: Complete free-to-paid conversion optimization (Latest)
  - Phase 1: Usage alerts, plan context card, contact limit alerts (+5-10% lift)
  - Phase 2: Feature lock infrastructure, useFeatureAccess hook, upgrade banners (+10-15% lift)
  - Phase 3: Milestone celebrations, usage projections, welcome carousel, plan comparison (+8-12% lift)
  - Phase 4: Event tracking, analytics endpoints, A/B testing framework, email automation (+5-8% lift)
  - Total: 21 new files, 8 modified, 3,500+ lines of conversion-optimized code
  - Expected combined impact: 15-25% increase in free-to-paid conversion
- **PostgreSQL Migration Complete**: Full migration from SQLite to PostgreSQL async/await (9 phases, 160+ files)
  - All backend routes converted to async/await (90+ routes)
  - All database scripts refactored (db-init, db-reset, db-seed, seed-twilio-sms)
  - All test files migrated to PostgreSQL patterns
  - SQLite artifacts removed, PostgreSQL-only architecture implemented
- **Stripe Billing Integration**: Full subscription lifecycle, webhook handling, invoice generation (Session 26-28)
- **Configurable Invoice Modes**: HTML-based PDF generation with template support (Session 28)
- **Consolidated Billing Docs**: BILLING.md for comprehensive billing system overview (Session 26)
- **Cloud Storage Config**: Preparation for file uploads and document storage (Session 26)
- **RBAC Phase 4**: Comprehensive role-based access control finalized (Session 25)
