# PostgreSQL Migration - Complete SQLite Removal Plan

## Overview

Complete the PostgreSQL migration by converting all remaining files to async/await and removing all SQLite dependencies and references.

**Current State:** Phase 1 complete (5 files) - Core infrastructure (db.js, migrator.js, index.js, rbac.js)

**Remaining Work:** 49 files across 9 phases

## Critical Files Requiring Changes

### Top Priority (BLOCKERS)
1. `/backend/src/utils/audit.js` - **CRITICAL BLOCKER**
   - Currently: Creates separate SQLite connection (lines 6-21)
   - Fix: Remove better-sqlite3, use shared async db from `../db`
   - Blocks: ALL routes (used everywhere)

2. `/backend/src/utils/subscriptionChecks.js`
   - Convert all functions to async, add await to 5 DB operations
   - Blocks: campaigns.js, webhooks.js

3. `/backend/src/services/messageQueue.js`
   - Convert to async, add await to 13 DB operations
   - **Revenue-critical** background processor
   - Blocks: campaigns.js, webhooks.js

### High Complexity Routes
4. `/backend/src/routes/campaigns.js` (60+ ops)
   - Multiple synchronous db.prepare() calls
   - Complex transaction patterns to convert
   - SSE streaming endpoint

5. `/backend/src/routes/contacts.js` (61+ ops)
   - Bulk operations with transactions
   - CSV import with large transactions

## Implementation Phases

### Phase 1: Critical Utilities (2-3 hours)
**Must complete first - blocks all other work**

1. **audit.js** (CRITICAL)
   - Remove lines 6-21 (better-sqlite3 connection)
   - Add: `const db = require('../db');`
   - Convert functions to async:
     - `async function logAudit()` - await line 51-66
     - `async function getAuditLogs()` - await line 212
     - `async function getAuditStats()` - await lines 236, 245
     - `async function cleanupOldAuditLogs()` - await lines 275, 294
   - Update callers throughout codebase to: `await logAudit(...)`

2. **subscriptionChecks.js**
   - Convert 4 functions to async
   - Add await to 5 DB operations
   - Update callers to await

3. **globalTags.js**
   - Convert to async
   - Add await to 2 DB operations

**Success Criteria:** Manual test auth flow with audit logging working

### Phase 2: Background Services (3-4 hours)

1. **providerFactory.js** - Convert to async (2 ops)
2. **messageQueue.js** - Convert to async (13 ops), update markCampaignIfComplete calls
3. **stripe.js** - Convert to async (2 ops)
4. **billingSummary.js** - Convert to async (4 ops)

**Success Criteria:** Full campaign send test passes

### Phase 3: Simple Routes (2-3 hours)

Can be done in parallel after Phase 1:
- **tenant.js** (4 ops)
- **business-info.js** (10 ops)
- **auth.js** (24 ops) - Update `await logAudit()`, bcrypt already async
- **tenant-users.js** (10 ops) - Update `await checkLastOwner()`

**Pattern:**
```javascript
// Add async + await
router.get('/:id', async (req, res) => {
  const result = await db.prepare(sql).get(...);
  await logAudit({...}); // Update audit calls
  res.json(result);
});
```

### Phase 4: Medium Routes (3-4 hours)

- **settings.js** (17 ops) - Fix boolean: `is_enabled = 1` → `is_enabled = true`
- **templates.js** (16 ops)
- **billing.js** (7 ops) - Await stripe service calls
- **admin.js** (66 ops) - Fix GROUP BY clauses, await globalTags

### Phase 5: Complex Routes with Transactions (6-8 hours)

**Critical Transaction Pattern Change:**
```javascript
// OLD SQLite pattern (REMOVE):
const transaction = db.transaction((items) => {
  for (const item of items) {
    insertStmt.run(item);
  }
});
transaction(items);

// NEW PostgreSQL pattern:
await db.transaction(async (txDb) => {
  for (const item of items) {
    await txDb.prepare('INSERT...').run(item);
  }
});
```

**Files:**
1. **contacts.js** (61 ops) - CSV import, bulk operations
2. **campaigns.js** (60 ops) - Campaign send, metrics, SSE
3. **webhooks.js** (30 ops) - Status updates

**Success Criteria:**
- CSV import of 100+ contacts works
- Campaign send to 50+ recipients works
- Webhook processing works

### Phase 6: Database Scripts (2-3 hours)

Convert to async main() pattern:
- **db-seed.js** (42 ops)
- **db-init.js** (7 ops)
- **db-reset.js** (4 ops)
- **seed-twilio-sms.js** (2 ops)

```javascript
const db = require('../src/db');
async function main() {
  await db.prepare(sql).run(...);
  await db.close();
  process.exit(0);
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

### Phase 7: SQLite Removal (1-2 hours)

**Delete physical files:**
```bash
rm backend/database.sqlite
rm backend/database.test.sqlite
rm backend/database.sqlite\ 10-56-26-282.sqlite
```

**Remove from dependencies:**
- backend/package.json - Remove better-sqlite3 (if present)

**Update configs:**
- backend/.env.example - Remove DATABASE_PATH, add DATABASE_URL example
- Root package.json - Remove DATABASE_PATH from npm scripts (lines 11, 17)
- .gitignore - Keep *.sqlite* patterns for safety

**Delete migration tracking docs:**
- POSTGRESQL_MIGRATION_PROGRESS.md
- POSTGRESQL_MIGRATION_OVERVIEW.md
- POSTGRESQL_ISSUES.md

### Phase 8: Test Migration (2-3 hours)

**Update 13+ test files using better-sqlite3:**
- backend/tests/security/*.test.js (4 files)
- backend/tests/rbac/*.test.js (6 files)
- backend/tests/integration/*.js (2 files)
- backend/tests/database/verify-db.js

**Pattern:**
```javascript
// Remove: const Database = require('better-sqlite3');
// Use: Test via API or shared db instance
const request = require('supertest');
const app = require('../../src/index');
```

**Test Database Setup:**
```bash
createdb engageninja_test
export DATABASE_URL="postgresql://localhost:5432/engageninja_test"
npm run db:reset:test
```

### Phase 9: Documentation (1-2 hours)

**Update files:**
1. **CLAUDE.md**
   - Replace "SQLite" with "PostgreSQL" (multiple locations)
   - Update database layer section
   - Update environment variables (remove DATABASE_PATH)
   - Update dependencies section

2. **README.md**
   - Update stack description
   - Update database setup instructions
   - Update environment configuration

3. **backend/scripts/README.md** - Update DATABASE_PATH references
4. **backend/tests/README.md** - Update testing instructions

## Refactoring Checklist (Per File)

- [ ] Add `async` keyword to route handlers: `async (req, res) => {}`
- [ ] Add `async` keyword to middleware factories: `return async (req, res, next) => {}`
- [ ] Add `await` before all `db.prepare()` calls
- [ ] Add `await` before all `db.exec()` calls
- [ ] Add `await` before all `db.transaction()` calls
- [ ] Update transaction pattern: Use `txDb` not `db` inside transaction
- [ ] Update utility calls: `await logAudit()`, `await checkLastOwner()`, etc.
- [ ] Fix boolean values: `1/0` → `true/false`
- [ ] Fix WHERE clauses: `active = 1` → `active`, `active = 0` → `NOT active`
- [ ] Test the feature manually after refactoring

## Testing Strategy

**After each phase:**
- Manual smoke test of affected features
- Verify no errors in console

**Final validation:**
- [ ] User signup/login
- [ ] Contact import (CSV)
- [ ] Campaign send (WhatsApp/Email/SMS)
- [ ] Webhook processing
- [ ] Template sync
- [ ] Billing summary
- [ ] Admin operations

## Git Commit Strategy

Group by phase:
```
feat(postgres): convert critical utilities to async/await (audit, subscriptionChecks, globalTags)
feat(postgres): convert background services to async/await (messageQueue, stripe, billing)
feat(postgres): convert simple routes to async/await (tenant, auth, business-info)
feat(postgres): convert medium routes to async/await (settings, templates, admin, billing)
feat(postgres): convert complex routes with transactions (contacts, campaigns, webhooks)
feat(postgres): convert database scripts to async/await
chore(postgres): remove all SQLite dependencies and references

BREAKING CHANGE: SQLite is no longer supported. PostgreSQL is required.

docs(postgres): update all documentation for PostgreSQL-only architecture
test(postgres): migrate all tests to PostgreSQL
```

## Estimated Timeline

- Phase 1 (Critical Utilities): 2-3 hours
- Phase 2 (Services): 3-4 hours
- Phase 3 (Simple Routes): 2-3 hours
- Phase 4 (Medium Routes): 3-4 hours
- Phase 5 (Complex Routes): 6-8 hours
- Phase 6 (Scripts): 2-3 hours
- Phase 7 (Cleanup): 1-2 hours
- Phase 8 (Tests): 2-3 hours
- Phase 9 (Docs): 1-2 hours

**Total: 22-32 hours of focused development**

## Risk Mitigation

**High-Risk Features:**
- Message queue (revenue-critical)
- Campaign send (revenue-critical)
- Auth flows (security-critical)

**Strategy:**
- Test thoroughly after each phase
- Keep Phase 1 commit as rollback point
- Deploy in phases if possible

## Success Criteria

- [ ] All 49 files converted to async/await
- [ ] No better-sqlite3 references
- [ ] No .sqlite files in repo
- [ ] All docs reference PostgreSQL only
- [ ] All tests passing
- [ ] Manual smoke test of all major features passing
- [ ] Clean `npm install` with no SQLite deps

## Next Steps

1. Review this plan document
2. Decide which phases to execute:
   - **All phases** (complete migration in one go)
   - **Phase 1-5** (just the code refactoring)
   - **Phase 1 only** (critical utilities first)
3. Signal ready to proceed with specific phase(s)
4. Monitor progress and test after each phase
