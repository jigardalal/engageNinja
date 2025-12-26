# PostgreSQL Migration Progress - Async/Await Refactoring

**Status**: IN PROGRESS - Phase 1 Complete, Phases 2-4 Remaining

**Last Updated**: 2025-12-26

**Target Completion**: Full async/await refactoring for all 405 database operations across 24 files

---

## Executive Summary

Converting EngageNinja from synchronous SQLite/deasync pattern to pure async/await PostgreSQL support.

**Progress**: 9% Complete (5 of 54 files refactored)
- **Total Files to Refactor**: 54 files
- **Total DB Operations**: ~405 to convert
- **Completed**: 5 files
- **Remaining**: 49 files

---

## Refactoring Pattern

All database operations follow this conversion pattern:

### Middleware Pattern (async middleware)
```javascript
// BEFORE (sync)
function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// AFTER (async)
function requireAdmin(req, res, next) {
  return async (req, res, next) => {
    try {
      const user = await db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}
```

### Route Handler Pattern (async route handlers)
```javascript
// BEFORE (sync)
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AFTER (async)
router.get('/:id', async (req, res) => {
  try {
    const item = await db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Transaction Pattern
```javascript
// BEFORE (SQLite only)
const insertStmt = db.prepare('INSERT INTO items VALUES (?, ?)');
const transaction = db.transaction((items) => {
  for (const item of items) {
    insertStmt.run(item.id, item.value);
  }
});
transaction(items);

// AFTER (PostgreSQL async)
await db.transaction(async (client) => {
  for (const item of items) {
    await client.prepare('INSERT INTO items VALUES (?, ?)').run(item.id, item.value);
  }
});
```

### Key Changes
1. Add `async` keyword to all function signatures that use db operations
2. Add `await` before all `db.prepare()`, `db.exec()`, `db.transaction()` calls
3. All middleware must return `async (req, res, next) => { ... }`
4. All route handlers must be `async (req, res) => { ... }`
5. Update error handling with try/catch for async errors
6. Change boolean comparisons from `1/0` to `true/false` for PostgreSQL
7. Change active/inactive checks to use implicit boolean: `WHERE active` instead of `WHERE active = 1`

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### Files Completed (5/5)

- ✅ **backend/package.json** - Dependencies updated
  - Removed: `deasync`, `better-sqlite3`
  - Added: `pg`, `supertest`
  - Status: COMPLETE

- ✅ **backend/src/db.js** - Database wrapper refactored
  - Pure async/await implementation
  - PostgreSQL-only with RDS optimizations
  - Transaction support implemented
  - Connection pooling configured
  - Status: COMPLETE

- ✅ **backend/src/db/migrator.js** - Migration runner refactored
  - All functions async/await
  - PostgreSQL-only SQL syntax
  - Proper migration tracking
  - Status: COMPLETE

- ✅ **backend/src/index.js** - Express app startup refactored
  - Async startup with database initialization
  - Proper error handling
  - Graceful shutdown with database cleanup
  - Status: COMPLETE

- ✅ **backend/src/middleware/rbac.js** - RBAC middleware refactored
  - All middleware async
  - Added validateTenantAccess helper
  - checkLastOwner is now async
  - Status: COMPLETE

---

## Phase 2: Application Layer Refactoring 🔄 IN PROGRESS

### Routes (11 files total, 0/11 complete)

**Critical Priority - High-Impact Features:**

1. ⏳ **backend/src/routes/auth.js** (24 db operations)
   - Signup, login, logout flows
   - Session management
   - Password hashing with bcrypt
   - User creation with tenant assignment
   - Changes needed:
     - Convert all route handlers to `async (req, res) => { ... }`
     - Await all db.prepare() calls
     - Update role checks to use implicit boolean for PostgreSQL
     - Await bcrypt operations (already async)
   - Status: PENDING
   - Dependencies: RBAC (✅ done)

2. ⏳ **backend/src/routes/contacts.js** (61 db operations)
   - Contact CRUD operations
   - Bulk operations with transactions
   - CSV import with transaction
   - Tag assignment with transaction
   - Changes needed:
     - Convert all handlers to async
     - Implement transaction patterns for bulk ops
     - Update CSV import to use async transaction
     - Fix boolean comparisons for PostgreSQL
   - Status: PENDING
   - Dependencies: RBAC (✅ done), db transactions (✅ done)

3. ⏳ **backend/src/routes/campaigns.js** (60 db operations)
   - Campaign CRUD operations
   - Message queue integration
   - Metrics and aggregation queries
   - SSE streaming endpoints
   - Changes needed:
     - Convert all handlers to async
     - Await message queue operations
     - Update aggregate queries for PostgreSQL GROUP BY requirements
     - Await SSE stream operations
   - Status: PENDING
   - Dependencies: RBAC (✅ done), messageQueue (⏳ pending)

4. ⏳ **backend/src/routes/webhooks.js** (30 db operations)
   - WhatsApp webhook handlers
   - Email webhook handlers
   - Message status updates
   - Signature verification
   - Changes needed:
     - Convert all handlers to async
     - Await all webhook processing
     - Update status update queries
   - Status: PENDING
   - Dependencies: None

**Medium Priority - Admin & Configuration:**

5. ⏳ **backend/src/routes/admin.js** (66 db operations)
   - Platform admin operations
   - Global tags management
   - Audit log access
   - User management
   - Changes needed:
     - Convert all handlers to async
     - Update GROUP BY clauses for PostgreSQL strictness
     - Fix boolean comparisons
     - Await all admin operations
   - Status: PENDING
   - Dependencies: RBAC (✅ done)

6. ⏳ **backend/src/routes/settings.js** (17 db operations)
   - Channel settings storage
   - Webhook URL configuration
   - Token management
   - Changes needed:
     - Convert all handlers to async
     - Fix boolean value comparisons
     - Await all queries
   - Status: PENDING
   - Dependencies: RBAC (✅ done)

7. ⏳ **backend/src/routes/templates.js** (16 db operations)
   - WhatsApp template management
   - Email template management
   - Template sync operations
   - Changes needed:
     - Convert all handlers to async
     - Update template sync with async operations
     - Await all queries
   - Status: PENDING
   - Dependencies: RBAC (✅ done)

8. ⏳ **backend/src/routes/billing.js** (7 db operations)
   - Stripe integration
   - Subscription management
   - Billing summary
   - Changes needed:
     - Convert all handlers to async
     - Await Stripe API calls
     - Await database queries
   - Status: PENDING
   - Dependencies: Stripe service (⏳ pending)

9. ⏳ **backend/src/routes/tenant.js** (4 db operations)
   - Tenant CRUD operations
   - Tenant switching
   - Changes needed:
     - Convert handlers to async
     - Await all queries
   - Status: PENDING
   - Dependencies: RBAC (✅ done)

10. ⏳ **backend/src/routes/tenant-users.js** (10 db operations)
    - User-tenant relationship management
    - Invite/remove operations
    - Changes needed:
      - Convert handlers to async
      - Await all queries
    - Status: PENDING
    - Dependencies: RBAC (✅ done), checkLastOwner (✅ done)

11. ⏳ **backend/src/routes/business-info.js** (10 db operations)
    - Business profile management
    - Changes needed:
      - Convert handlers to async
      - Await all queries
    - Status: PENDING
    - Dependencies: RBAC (✅ done)

### Services (4 files total, 0/4 complete)

**Critical Priority:**

1. ⏳ **backend/src/services/messageQueue.js** (13 db operations)
   - Background message processor
   - Queue polling and retry logic
   - Provider integration
   - Changes needed:
     - Convert startMessageProcessor to async
     - Await all queue operations
     - Await provider send operations
     - Update locking mechanism with async queries
   - Status: PENDING
   - Blocks: campaigns.js, webhooks.js

2. ⏳ **backend/src/services/stripe.js** (2 db operations)
   - Stripe webhook handler
   - Subscription lifecycle management
   - Changes needed:
     - Convert handlers to async
     - Await Stripe operations
   - Status: PENDING
   - Blocks: billing.js

3. ⏳ **backend/src/services/billingSummary.js** (4 db operations)
   - Usage tracking and quota calculations
   - Changes needed:
     - Convert functions to async
     - Await all queries
   - Status: PENDING
   - Blocks: billing.js

4. ⏳ **backend/src/services/messaging/providerFactory.js** (2 db operations)
   - Channel provider configuration
   - Changes needed:
     - Convert functions to async
     - Await all queries
   - Status: PENDING

### Middleware (1 file remaining)

- ⏳ **backend/src/middleware/auth.js**
  - Session validation
  - Note: May not need refactoring if no direct db operations
  - Status: PENDING

### Utilities (3 files total, 0/3 complete)

**Important - Used Throughout Codebase:**

1. ⏳ **backend/src/utils/audit.js** (6 db operations) - CRITICAL
   - Separate database connection (needs to use shared pool)
   - Audit logging for all operations
   - Changes needed:
     - Remove separate db connection
     - Use shared db instance from ../db
     - Convert all functions to async
     - Update all audit log calls to await
   - Status: PENDING
   - Note: This file is used by many routes, impacts all route refactoring
   - Blocks: All routes that use audit logging

2. ⏳ **backend/src/utils/subscriptionChecks.js** (5 db operations)
   - Quota enforcement
   - Billing checks
   - Changes needed:
     - Convert all functions to async
     - Await all queries
     - Update all callers to await these functions
   - Status: PENDING
   - Blocks: campaigns.js, webhooks.js

3. ⏳ **backend/src/utils/globalTags.js** (2 db operations)
   - Global tag synchronization
   - Changes needed:
     - Convert all functions to async
     - Await all queries
   - Status: PENDING
   - Blocks: admin.js (global tags operations)

---

## Phase 3: Database Scripts 📝 NOT STARTED

Scripts require refactoring but lower priority (not in critical path):

- ⏳ **backend/scripts/db-seed.js** (42 db operations)
  - Seed data generation
  - Status: PENDING

- ⏳ **backend/scripts/db-init.js** (7 db operations)
  - Database initialization
  - Status: PENDING

- ⏳ **backend/scripts/db-reset.js** (4 db operations)
  - Database reset utility
  - Status: PENDING

- ⏳ **backend/scripts/seed-twilio-sms.js** (2 db operations)
  - Twilio SMS channel seeding
  - Status: PENDING

---

## Phase 4: Comprehensive API Testing 🧪 NOT STARTED

Create full API test suite covering all endpoints (~500+ test cases).

### Test Files to Create

- ⏳ `backend/tests/integration/test-auth-api.js` - Auth endpoints
- ⏳ `backend/tests/integration/test-contacts-api.js` - Contact CRUD
- ⏳ `backend/tests/integration/test-campaigns-api.js` - Campaign lifecycle
- ⏳ `backend/tests/integration/test-templates-api.js` - Template management
- ⏳ `backend/tests/integration/test-settings-api.js` - Settings
- ⏳ `backend/tests/integration/test-billing-api.js` - Billing
- ⏳ `backend/tests/integration/test-webhooks-api.js` - Webhooks
- ⏳ `backend/tests/integration/test-admin-api.js` - Admin operations
- ⏳ `backend/tests/integration/test-tenant-api.js` - Tenant management
- ⏳ `backend/tests/integration/run-all-tests.js` - Test orchestrator

### NPM Scripts to Add

```json
{
  "test:api": "node backend/tests/integration/run-all-tests.js",
  "test:api:full": "npm run db:reset:test && npm run test:api"
}
```

---

## Refactoring Checklist

When refactoring each file, follow this checklist:

- [ ] Add `async` keyword to function signatures
- [ ] Add `await` to all `db.prepare()` calls
- [ ] Add `await` to all `db.exec()` calls
- [ ] Add `await` to all `db.transaction()` calls
- [ ] Update error handling with try/catch if not already present
- [ ] Change boolean comparisons:
  - `WHERE active = 1` → `WHERE active` (implicit true)
  - `WHERE active = 0` → `WHERE NOT active` (implicit false)
  - `UPDATE table SET active = 1` → `UPDATE table SET active = true`
  - `UPDATE table SET active = 0` → `UPDATE table SET active = false`
- [ ] For middleware: ensure function returns async middleware `async (req, res, next) => { ... }`
- [ ] For routes: ensure route handler is `async (req, res) => { ... }`
- [ ] Update all callers of functions that are now async to use `await`
- [ ] Run linting: `npm run lint`
- [ ] Verify no `db.__type === 'sqlite'` conditionals remain
- [ ] Verify no remaining references to `deasync`

---

## Dependencies Between Files

This shows which files can be done independently and which depend on others:

```
✅ db.js (foundation)
  └─ ✅ migrator.js (depends on db.js)
  └─ ✅ index.js (depends on db.js, migrator.js)
  └─ ✅ rbac.js middleware (depends on db.js)
      └─ ALL route files (depend on rbac.js)

audit.js (utility, used everywhere)
  └─ Blocks: ALL route files until refactored
  └─ subscriptionChecks.js (depends on audit.js potentially)

messageQueue.js (service)
  └─ Blocks: campaigns.js, webhooks.js
  └─ Blocks: subscriptionChecks.js

subscriptionChecks.js (utility)
  └─ Blocks: campaigns.js, webhooks.js

Routes that can be done independently (after rbac.js):
  - auth.js (23 db ops)
  - tenant.js (4 db ops)
  - tenant-users.js (10 db ops)
  - business-info.js (10 db ops)
  - settings.js (17 db ops)
  - templates.js (16 db ops)

Routes that depend on services:
  - webhooks.js (30 db ops) - depends on subscriptionChecks
  - campaigns.js (60 db ops) - depends on messageQueue, subscriptionChecks
  - contacts.js (61 db ops) - depends on audit
  - admin.js (66 db ops) - depends on audit
  - billing.js (7 db ops) - depends on stripe, billingSummary

Recommended order for parallel work:
1. audit.js (blocks most work)
2. messageQueue.js (blocks campaigns, webhooks)
3. subscriptionChecks.js (blocks campaigns, webhooks)
4. Parallel: auth.js, tenant.js, tenant-users.js, business-info.js
5. Parallel: webhooks.js, campaigns.js, contacts.js, admin.js, settings.js, templates.js
6. billing.js (depends on stripe service)
```

---

## Testing Strategy

Once refactoring is complete, run tests with:

```bash
# Set PostgreSQL test database
export DATABASE_URL="postgresql://user:pass@rds-endpoint:5432/engageninja_test"

# Reset and test
npm run db:reset:test
npm run test:api:full
```

---

## Success Criteria

- [x] Core database layer fully async/await
- [x] Express app startup async
- [x] RBAC middleware async
- [ ] All 11 route files converted
- [ ] All 4 service files converted
- [ ] All 3 utility files converted
- [ ] All 4 script files converted
- [ ] Comprehensive API test suite created
- [ ] All ~500+ test cases passing
- [ ] No `deasync` references remaining
- [ ] No `better-sqlite3` references remaining
- [ ] No manual testing required for API layer

---

## Notes for Next Developer

1. **Start with**: audit.js utility (blocks most work)
2. **Then**: messageQueue.js and subscriptionChecks.js (block critical features)
3. **Then**: Parallel refactoring of remaining route files
4. **Finally**: API test suite creation and validation

Each file follows the same pattern documented above. The pattern is consistent across all file types.

---

## PostgreSQL Connection

All code assumes `DATABASE_URL` environment variable is set:
```bash
DATABASE_URL="postgresql://user:password@rds-endpoint:5432/database_name"
```

Connection pooling is configured in `backend/src/db.js` with:
- Max 20 connections
- 30 second idle timeout
- 5 second connection timeout
- SSL support for AWS RDS
