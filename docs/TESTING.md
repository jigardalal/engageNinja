# Backend Testing Suite

Comprehensive testing infrastructure for EngageNinja backend, organized by test category.

## Directory Structure

```
tests/
├── rbac/                    # Role-Based Access Control & User Management
│   ├── phase2-rbac.test.js          # Jest test suite for RBAC middleware
│   ├── verify-phase2.js             # Automated verification script (59 checks)
│   ├── manual-phase2-test.md        # Manual testing guide for Phase 2
│   ├── phase3-user-management.test.js  # Jest test suite for user management
│   ├── verify-phase3.js             # Automated verification script (35 checks)
│   └── manual-phase3-test.md        # Manual testing guide for Phase 3
│
├── integration/             # API Integration Tests
│   ├── auth.test.js                 # Authentication and session tests
│   ├── webhooks.test.js             # Webhook endpoint tests
│   └── email-webhooks.test.js       # Email webhook integration tests
│
├── database/                # Database & Schema Tests
│   └── verify-db.js                 # Database schema and integrity checks
│
└── README.md                # This file
```

## Test Categories

### 1. RBAC Tests (`rbac/`)

**Purpose**: Verify role-based access control, user management, and audit logging

#### Automated Verification Scripts
- `verify-phase2.js` - Validates RBAC middleware and route protection (59 checks)
  ```bash
  node tests/rbac/verify-phase2.js
  ```
  - Database schema validation
  - Test data with diverse roles
  - Middleware verification
  - Audit logging verification
  - Route protection checks

- `verify-phase3.js` - Validates user management system (35 checks)
  ```bash
  node tests/rbac/verify-phase3.js
  ```
  - User invitations table
  - Tenant-users routes
  - Auth endpoints
  - Database integrity

#### Jest Test Suites
- `phase2-rbac.test.js` - RBAC middleware testing (requires Jest setup)
  ```bash
  jest tests/rbac/phase2-rbac.test.js
  ```
  - Settings routes RBAC (4 tests)
  - Campaign routes RBAC (4 tests)
  - Contacts routes RBAC (3 tests)
  - Template routes RBAC (3 tests)
  - Audit logging verification (3 tests)
  - Role hierarchy validation (4 tests)
  - Middleware error handling (2 tests)

- `phase3-user-management.test.js` - User management testing (requires Jest setup)
  ```bash
  jest tests/rbac/phase3-user-management.test.js
  ```
  - User listing (4 tests)
  - User invitations (7 tests)
  - Role management (7 tests)
  - User removal (7 tests)
  - Auth /me endpoint (4 tests)
  - Audit logging (3 tests)
  - Cross-tenant isolation (1 test)

#### Manual Testing Guides
- `manual-phase2-test.md` - Step-by-step manual testing for Phase 2
  - 30+ test scenarios
  - Expected outcomes
  - Audit log verification
  - Role hierarchy tests

- `manual-phase3-test.md` - Step-by-step manual testing for Phase 3
  - 50+ test scenarios
  - Permission boundary tests
  - Invitation flow validation
  - Owner protection verification

### 2. Integration Tests (`integration/`)

**Purpose**: Test API endpoints and cross-module interactions

- `auth.test.js` - Authentication flows
  - Signup/login/logout
  - Session management
  - Token validation

- `webhooks.test.js` - Webhook endpoints
  - WhatsApp webhook handling
  - Signature verification
  - Message routing

- `email-webhooks.test.js` - Email webhook integration
  - Email delivery webhooks
  - Event processing
  - Error handling

### 3. Database Tests (`database/`)

**Purpose**: Validate database schema and data integrity

- `verify-db.js` - Schema and integrity checks
  ```bash
  node tests/database/verify-db.js
  ```
  - Table existence
  - Column types and constraints
  - Foreign key relationships
  - Index presence

## Running Tests

### Quick Verification (No Setup Required)
```bash
# Verify RBAC system is properly implemented
node backend/tests/rbac/verify-phase2.js

# Verify user management system is properly implemented
node backend/tests/rbac/verify-phase3.js

# Verify database schema
node backend/tests/database/verify-db.js
```

### Manual Testing
1. Start backend: `npm run dev` (from backend dir)
2. Follow the manual testing guide:
   - `backend/tests/rbac/manual-phase2-test.md`
   - `backend/tests/rbac/manual-phase3-test.md`
3. Use provided test credentials:
   ```
   Owner: admin@engageninja.local / AdminPassword123
   Admin: user@engageninja.local / UserPassword123
   Member: member@engageninja.local / MemberPassword123
   Viewer: viewer@engageninja.local / ViewerPassword123
   Platform Admin: platform.admin@engageninja.local / PlatformAdminPassword123
   ```

### Automated Jest Tests (When Jest Is Configured)
```bash
# Run all tests
jest

# Run specific test suite
jest tests/rbac/phase2-rbac.test.js

# Run with coverage
jest --coverage

# Watch mode
jest --watch
```

## Test Coverage

### Phase 2: RBAC Middleware (100% Verified)
- ✅ 59/59 verification checks passing
- ✅ All routes protected with role enforcement
- ✅ Audit logging integrated
- ✅ Middleware functions verified

### Phase 3: User Management (100% Verified)
- ✅ 35/35 verification checks passing
- ✅ 6 endpoints fully implemented
- ✅ Invitation system validated
- ✅ Owner protection enforced
- ✅ Audit logging comprehensive

### Phase 4: Platform Admin (Pending)
- Tests to be added once Phase 4 is implemented

### Phase 5: Frontend Role System (Pending)
- Frontend tests to be added in `/frontend/tests/`

### Phase 6: Integration & Security (Pending)
- Full integration test suite to be added

## Test Metrics

| Category | Tests | Verification | Status |
|----------|-------|--------------|--------|
| RBAC Phase 2 | 30+ | 59/59 ✓ | ✅ Complete |
| User Mgmt Phase 3 | 40+ | 35/35 ✓ | ✅ Complete |
| Integration | 10+ | TBD | ⏳ In Progress |
| Database | 5+ | Auto | ✅ Complete |

## Test Scenarios

### RBAC Testing
- ✅ Role hierarchy enforcement
- ✅ Permission boundaries
- ✅ Route protection
- ✅ Audit logging
- ✅ Cross-tenant isolation
- ✅ Error handling

### User Management Testing
- ✅ Invitation creation
- ✅ Invitation acceptance
- ✅ Role assignment
- ✅ Role changes
- ✅ User removal
- ✅ Owner protection
- ✅ Self-removal prevention

### Integration Testing
- ⏳ API endpoint validation
- ⏳ Session management
- ⏳ Webhook handling
- ⏳ Cross-module flows

## Verification Checklist

Before deploying, ensure:
- [ ] Run `verify-phase2.js` - all checks pass
- [ ] Run `verify-phase3.js` - all checks pass
- [ ] Run `verify-db.js` - all checks pass
- [ ] Execute manual Phase 2 tests (or Jest suite if configured)
- [ ] Execute manual Phase 3 tests (or Jest suite if configured)
- [ ] Review audit logs for comprehensive logging

## Adding New Tests

When adding new tests:

1. **Determine category**: rbac / integration / database / other
2. **Create test file**: `tests/{category}/feature-name.test.js`
3. **Add verification**: Include verification checks in automated script
4. **Document**: Add manual testing guide if needed
5. **Update this README**: Add entry to directory structure

## Tips for Test Execution

### Manual Testing
- Use provided test credentials
- Follow step-by-step scenarios
- Check audit logs for action verification
- Test both success and failure cases

### Automated Verification
- Run scripts sequentially for comprehensive validation
- Scripts are idempotent (safe to run multiple times)
- Exit code 0 = all checks passed
- Exit code 1 = failures detected

### Debugging Tests
- Enable debug logging: `DEBUG_AUDIT=true node tests/...`
- Check database directly: `sqlite3 database.sqlite`
- Review audit logs: `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;`

## Test Data

All tests use seeded data from `backend/scripts/db-seed.js`:

**Users**:
- admin@engageninja.local (owner of Demo Tenant)
- user@engageninja.local (admin of Demo, owner of Beta)
- member@engageninja.local (member of Demo)
- viewer@engageninja.local (viewer of Demo)
- platform.admin@engageninja.local (platform admin)

**Tenants**:
- Demo Tenant (Growth plan)
- Beta Tenant (Starter plan)

## Troubleshooting

### Verification Script Fails
```bash
# Reseed database
node backend/scripts/db-seed.js

# Try verification again
node backend/tests/rbac/verify-phase3.js
```

### Manual Tests Don't See Changes
- Ensure backend is running: `npm run dev`
- Check activeTenantId is set in session
- Verify user has required role for operation

### Audit Logs Are Empty
- Audit logs only populate when operations are performed
- Run manual tests or API calls to generate logs
- Query database: `SELECT COUNT(*) FROM audit_logs;`

## Contact & Questions

For test-related issues:
1. Check the relevant README in test category
2. Review manual testing guide for expected behavior
3. Check verification script output for specific failures
4. Review audit logs for operation details

---

**Last Updated**: 2025-12-16
**Status**: Phases 1-3 Complete (50% progress)
