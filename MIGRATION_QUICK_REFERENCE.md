# PostgreSQL Migration - Quick Reference

## Current Status: 9% Complete

✅ Done: 5 files
⏳ Remaining: 49 files
Total DB Operations: ~405

---

## One-Line Summary Per File

### Core Infrastructure (✅ DONE)
- ✅ `backend/package.json` - Dependencies cleaned up
- ✅ `backend/src/db.js` - Full async/await, PostgreSQL only, pooling + transactions
- ✅ `backend/src/db/migrator.js` - Async migrations
- ✅ `backend/src/index.js` - Async startup with graceful shutdown
- ✅ `backend/src/middleware/rbac.js` - Async middleware with role checks

### Routes (⏳ PENDING)
- ⏳ `auth.js` (24 ops) - Authentication, signup/login
- ⏳ `contacts.js` (61 ops) - Contact CRUD, bulk, CSV import, transactions
- ⏳ `campaigns.js` (60 ops) - Campaign CRUD, messages, metrics, SSE
- ⏳ `webhooks.js` (30 ops) - WhatsApp/Email webhooks, status updates
- ⏳ `admin.js` (66 ops) - Admin ops, global tags, audit logs
- ⏳ `settings.js` (17 ops) - Channel settings, tokens
- ⏳ `templates.js` (16 ops) - Template management
- ⏳ `billing.js` (7 ops) - Stripe integration
- ⏳ `tenant.js` (4 ops) - Tenant CRUD
- ⏳ `tenant-users.js` (10 ops) - User-tenant relationships
- ⏳ `business-info.js` (10 ops) - Business profiles

### Services (⏳ PENDING)
- ⏳ `messageQueue.js` (13 ops) - Background message processor (CRITICAL)
- ⏳ `stripe.js` (2 ops) - Stripe webhooks
- ⏳ `billingSummary.js` (4 ops) - Quota calculations
- ⏳ `messaging/providerFactory.js` (2 ops) - Provider config

### Utilities (⏳ PENDING)
- ⏳ `audit.js` (6 ops) - Audit logging (BLOCKS MOST ROUTES)
- ⏳ `subscriptionChecks.js` (5 ops) - Quota checks (BLOCKS campaigns/webhooks)
- ⏳ `globalTags.js` (2 ops) - Tag sync

### Scripts (⏳ PENDING)
- ⏳ `db-seed.js` (42 ops)
- ⏳ `db-init.js` (7 ops)
- ⏳ `db-reset.js` (4 ops)
- ⏳ `seed-twilio-sms.js` (2 ops)

### Testing (⏳ PENDING)
- ⏳ Full API test suite (500+ test cases)

---

## Recommended Refactoring Order

```
1. audit.js           (blocks everything)
   ↓
2. messageQueue.js    (blocks campaigns, webhooks)
   subscriptionChecks.js (blocks campaigns, webhooks)
   ↓
3. Parallel work:
   - auth.js
   - tenant.js
   - tenant-users.js
   - business-info.js
   - settings.js
   - templates.js
   - webhooks.js
   - campaigns.js
   - contacts.js
   - admin.js
   ↓
4. stripe.js
   billingSummary.js
   billing.js
   ↓
5. Scripts (lower priority)
   ↓
6. Test suite (validates everything)
```

---

## Copy-Paste Refactoring Template

### For Route Files

```javascript
// 1. Add async to route handler
router.get('/endpoint', requireAuth, async (req, res) => {  // <- ADD ASYNC
  try {
    // 2. Add await to db calls
    const item = await db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);  // <- ADD AWAIT

    // 3. Update boolean comparisons
    // WHERE active = 1  →  WHERE active
    // WHERE active = 0  →  WHERE NOT active
    // SET active = 1    →  SET active = true

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. For transactions:
await db.transaction(async (client) => {  // <- ADD ASYNC, AWAIT
  for (const item of items) {
    await client.prepare('INSERT INTO items VALUES (?, ?)').run(...);  // <- ADD AWAIT
  }
});
```

### For Middleware

```javascript
// 1. Ensure function returns async middleware
function requireAdmin() {
  return async (req, res, next) => {  // <- ADD ASYNC
    try {
      // 2. Add await to db calls
      const user = await db.prepare('SELECT role FROM users WHERE id = ?').get(id);  // <- ADD AWAIT

      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}
```

### For Services/Utilities

```javascript
// 1. Add async to function
async function sendMessage(messageId) {  // <- ADD ASYNC
  try {
    // 2. Add await to db calls
    const message = await db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);  // <- ADD AWAIT

    // 3. Await any async operations
    const result = await provider.send(message);  // <- ADD AWAIT

    // 4. Update calls
    await db.prepare('UPDATE messages SET status = ? WHERE id = ?').run('sent', messageId);  // <- ADD AWAIT

    return result;
  } catch (error) {
    throw error;
  }
}

// When calling async functions:
const result = await sendMessage(id);  // <- ADD AWAIT to callers
```

---

## Boolean Comparison Quick Map

PostgreSQL is strict about booleans. SQLite coerces 0/1.

| SQLite | PostgreSQL |
|--------|-----------|
| `WHERE active = 1` | `WHERE active` |
| `WHERE active = 0` | `WHERE NOT active` |
| `WHERE active IS NULL` | `WHERE active IS NULL` |
| `WHERE active != 1` | `WHERE active IS false OR active IS NULL` |
| `SET active = 1` | `SET active = true` |
| `SET active = 0` | `SET active = false` |

---

## Testing After Each File

After refactoring each file, test the specific feature:

```bash
# Example for auth.js
node scripts/test-auth-flow.js

# Example for contacts.js
curl -X GET http://localhost:5174/api/contacts -H "Cookie: ..."
```

---

## Common Issues & Fixes

### Issue: "Cannot await non-Promise"
**Fix**: Ensure db operations have `await`: `await db.prepare(...).get()`

### Issue: "Middleware not executing"
**Fix**: Ensure middleware returns `async (req, res, next) => { ... }`

### Issue: "TypeError: db.transaction is not a function"
**Fix**: Check `backend/src/db.js` is properly loaded, or ensure you're calling it correctly:
```javascript
await db.transaction(async (client) => { ... })
```

### Issue: "active is not a boolean"
**Fix**: Update all boolean assignments to use `true/false` instead of `1/0`

---

## See Also

- `POSTGRESQL_MIGRATION_PROGRESS.md` - Detailed tracking and dependencies
- `backend/src/db.js` - API reference for database methods
- `backend/src/db/migrator.js` - Migration system
