# PostgreSQL Compatibility Issues & Solutions

## Overview

The EngageNinja backend was originally built for SQLite but has been migrated to support PostgreSQL RDS. This document outlines the issues discovered during this migration and solutions for fixing them.

## Critical Issues

### 1. **deasync Library Timeout Issues** (BLOCKER)

**Issue**: Database queries hang indefinitely and cause connection timeouts
- Symptom: `Connection terminated due to connection timeout` errors
- Occurs: When making any database query through the Express API
- Root Cause: The `deasync` library (used to make async PostgreSQL queries synchronous) doesn't handle connection pooling/timeouts properly with PostgreSQL

**Location**: `backend/src/db.js` - All database operations use deasync

**Files Affected**:
- `backend/src/db.js` - Database adapter wrapping async queries with deasync
- All route files using `db.prepare().run()` and `db.prepare().get()`

**Current Workaround**:
```javascript
// Current implementation wraps async queries synchronously
// This causes infinite loops and timeouts with PostgreSQL
const deasync = require('deasync');

function run(sql, params) {
  let result;
  let done = false;

  dbPool.query(sql, params, (err, res) => {
    if (err) throw err;
    result = res;
    done = true;
  });

  deasync.loopWhile(() => !done);
  return result;
}
```

**Long-term Solution**:
Replace deasync with proper async/await throughout the codebase:
```javascript
async function handleRequest(req, res) {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

---

### 2. **SQL Syntax Compatibility** (FIXED)

**Issue**: SQLite-specific SQL syntax not compatible with PostgreSQL

**Affected Statements**:

#### INSERT OR IGNORE / INSERT OR REPLACE
- **SQLite**: `INSERT OR IGNORE INTO table VALUES (...)`
- **PostgreSQL**: `INSERT INTO table VALUES (...) ON CONFLICT DO NOTHING`
- **PostgreSQL**: `INSERT INTO table VALUES (...) ON CONFLICT (column) DO UPDATE SET ...`

**Files Fixed**:
- `backend/src/routes/auth.js` - Line 385
- `backend/src/routes/contacts.js` - Lines 3 instances
- `backend/src/routes/templates.js` - Line 293
- `backend/src/routes/settings.js` - Lines 459, 479, 625, 634
- `backend/src/routes/admin.js` - Line 498
- `backend/src/routes/webhooks.js` - Line 1194
- `backend/src/utils/globalTags.js` - Line 11

**Fix Applied**:
```javascript
// Before (SQLite):
INSERT OR IGNORE INTO user_tenants (user_id, tenant_id, role, active, created_at)
VALUES (?, ?, 'admin', 1, CURRENT_TIMESTAMP)

// After (PostgreSQL):
INSERT INTO user_tenants (user_id, tenant_id, role, active, created_at)
VALUES (?, ?, 'admin', true, CURRENT_TIMESTAMP)
ON CONFLICT (user_id, tenant_id) DO NOTHING
```

---

### 3. **Boolean Type Coercion** (FIXED)

**Issue**: PostgreSQL strictly enforces boolean types; SQLite coerces 0/1

**Affected Code**:

#### Integer 0/1 used instead of boolean true/false

- **SQLite**: Accepts `0` and `1` for boolean columns
- **PostgreSQL**: Requires explicit `true`/`false` literals

**Files Fixed**:
- `backend/src/routes/auth.js` - Lines 519, 525 (comparisons)
- `backend/src/routes/settings.js` - Lines 459, 479, 625, 634, 725, 785
- `backend/scripts/db-seed.js` - 6 instances
- `backend/src/routes/admin.js` - Multiple comparisons changed to use `WHERE active` instead of `WHERE active = 1`

**Fix Applied**:
```javascript
// Before (SQLite):
db.prepare(`UPDATE table SET is_enabled = 1 WHERE id = ?`).run(id);
if (user.active === 1) { ... }

// After (PostgreSQL):
db.prepare(`UPDATE table SET is_enabled = true WHERE id = ?`).run(id);
if (Boolean(user.active)) { ... }
```

---

### 4. **SQL Operator Strictness** (FIXED)

**Issue**: PostgreSQL requires explicit operators; SQLite is lenient with type comparisons

**Affected Code**:
- Boolean comparisons: `WHERE active = 1` fails in PostgreSQL
- Solution: Use `WHERE active` (implicit true) or explicit cast `WHERE active::boolean`

**Files Fixed**:
- `backend/src/routes/admin.js` - Multiple comparisons

---

### 5. **GROUP BY Clause Strictness** (FIXED)

**Issue**: PostgreSQL requires all non-aggregated columns in GROUP BY; SQLite is lenient

**Error**: `column "xyz" must appear in the GROUP BY clause or be subject to an aggregate function`

**Files Fixed**:
- `backend/src/routes/admin.js` - Lines 133, 1659 - Added missing columns to GROUP BY

**Fix Applied**:
```javascript
// Before (SQLite - lenient):
SELECT tenant_id, plan_id, COUNT(*) as total FROM table GROUP BY tenant_id

// After (PostgreSQL - strict):
SELECT tenant_id, plan_id, COUNT(*) as total FROM table GROUP BY tenant_id, plan_id
```

---

### 6. **Vite Proxy Cookie Handling** (PARTIALLY FIXED)

**Issue**: Session cookies not properly forwarded through Vite dev proxy

**Symptom**: 401 Unauthorized errors even when logged in through the proxy

**Location**: `frontend/vite.config.js`

**Current Config**:
```javascript
proxy: {
  '/api': {
    target: `http://localhost:5173`,
    changeOrigin: true,
    secure: false
  }
}
```

**Attempted Fix**: Added `cookieDomainRewrite` (caused issues, reverted)

**Proper Solution**:
- Use relative paths (no VITE_API_URL env var) to let the proxy handle cookies
- Or ensure proper CORS credentials configuration on both frontend and backend

---

## Environment Setup

### Working Configuration

**SQLite (Development)**:
```bash
DATABASE_PATH=./database.sqlite npm run dev
```
- ✅ Works reliably
- ✅ No deasync issues
- ✅ Suitable for local development

**PostgreSQL RDS (Production)**:
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname npm run dev
```
- ❌ deasync causes timeouts
- ❌ Requires refactoring to async/await
- ⚠️ Not currently viable for development without major changes

### Recommended Development Setup

Until the deasync issue is resolved:
```bash
# Development: Use SQLite
DATABASE_PATH=./database.sqlite npm run dev

# Production: Use PostgreSQL (requires async/await refactor)
```

---

## Recommended Fixes (Priority Order)

### Priority 1: Replace deasync (CRITICAL)
**Effort**: High (2-3 days)
**Impact**: Enables full PostgreSQL support

Steps:
1. Refactor `backend/src/db.js` to use async/await
2. Update all route handlers to use `async`/`await`
3. Remove deasync dependency
4. Test all API endpoints

Example:
```javascript
// Current: synchronous with deasync
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// After: async/await
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Priority 2: Connection Pool Configuration
**Effort**: Low (1 hour)
- Configure proper connection pooling for PostgreSQL
- Set connection timeouts
- Handle stale connections

### Priority 3: Migration System Improvements
**Effort**: Low (30 mins)
- Ensure migrations properly split SQL by statement boundaries
- Handle PostgreSQL procedural blocks correctly
- Add migration validation

### Priority 4: Complete Test Suite
**Effort**: Medium (1 day)
- Add unit tests for database operations
- Add integration tests for all API endpoints
- Test both SQLite and PostgreSQL

---

## Testing Guidelines

### Test with SQLite (Currently Works)
```bash
DATABASE_PATH=./database.sqlite npm run db:reset
npm run dev
# All features should work
```

### Test with PostgreSQL (Currently Broken)
```bash
DATABASE_URL=postgresql://localhost/engageninja_dev npm run db:reset
npm run dev
# Will timeout on first API call
```

### Reproducing deasync Timeout
1. Start backend with PostgreSQL
2. Open http://localhost:3173
3. Try to log in
4. Expected: Timeout after ~30 seconds
5. Actual: `Connection terminated due to connection timeout`

---

## Code Review Checklist for PostgreSQL Fixes

When implementing the deasync → async/await migration:

- [ ] All `db.prepare().run()` calls converted to `await db.query()`
- [ ] All `db.prepare().get()` calls converted to `await db.query()` with `.rows[0]`
- [ ] All route handlers converted to `async`
- [ ] Error handling updated for async errors
- [ ] No remaining `deasync` references
- [ ] Tested with PostgreSQL RDS
- [ ] Tested with SQLite (backward compatibility)
- [ ] Connection pooling configured
- [ ] Transaction support added if needed

---

## Related Files

**Database Layer**:
- `backend/src/db.js` - Core database adapter (needs refactor)
- `backend/db/migrator.js` - Migration runner
- `backend/db/migrations/` - All migration files (SQL is compatible, just needs async execution)

**Route Files** (all need async/await refactor):
- `backend/src/routes/auth.js`
- `backend/src/routes/contacts.js`
- `backend/src/routes/campaigns.js`
- `backend/src/routes/settings.js`
- `backend/src/routes/templates.js`
- `backend/src/routes/admin.js`
- `backend/src/routes/webhooks.js`
- And all others in `backend/src/routes/`

**Service Files**:
- `backend/src/services/messageQueue.js`
- `backend/src/services/stripe.js`
- `backend/src/services/billingProvider.js`

---

## References

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- deasync NPM: https://www.npmjs.com/package/deasync
- PostgreSQL vs SQLite differences: https://sqlite.org/differences.html
