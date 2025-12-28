# Testing Suite

Comprehensive testing infrastructure for EngageNinja, covering backend unit/integration tests and UI automation.

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

## UI Automation Testing

### Ports
- Frontend: http://localhost:3173
- Backend: http://localhost:5173

### Quick Test Scripts

Manual/ad-hoc scripts for quick API checks against the dev servers:

- `test-backend-health.js` – checks /health and login flow
- `test-basic.js` – health check only
- `test-5173-correct.js` / `test-5173-cors.js` – login/CORS against backend 5173
- `test-login.js`, `test-login-verify.js`, `test-login-response.js`, `test-login-verbose.js`, `test-auth-manual.js` – login helpers
- `test-campaign-create.js`, `test-endpoint-exists.js`, `test-settings-api.js` – CRUD/API spot checks
- `test-cors-login.js` – proxy/CORS via frontend
- `test-webhooks.js`, `test-webhook-integration.js` – webhook endpoints
- `test-metrics-api.js` – campaign metrics

**Preferred flow**: use `test-backend-health.js` for quick sanity; others are legacy/debug helpers.

**Run scripts**: From `scripts/manual-tests` directory:
```bash
cd scripts/manual-tests
node test-backend-health.js
```

---

## UI E2E Test Coverage Report

### New Tests Added

#### 1. settings-whatsapp-connect.js
Tests the WhatsApp connection dialog in Settings to catch UI rendering bugs.

**What it tests:**
- ✓ Connect button is visible in dialog footer (catches missing footer buttons)
- ✓ Dialog renders all required input fields
- ✓ Text colors follow theme CSS variables (not hardcoded)
- ✓ Form labels are visible and properly styled
- ✓ Cancel button works and closes dialog
- ✓ Access Token field displays correctly
- ✓ Phone Number ID field displays correctly

**Bug it caught:**
- Missing Connect button in dialog footer due to Dialog component not handling footer prop

**Run:** `node scripts/ui/settings-whatsapp-connect.js`

---

#### 2. templates-view-preview.js
Tests the complete template view and preview functionality to catch template display bugs.

**What it tests:**
- ✓ View button on templates list navigates to detail page
- ✓ Template detail page displays all data (name, status, language, category)
- ✓ Status badge displays with proper contrast (catches green-on-green issue)
- ✓ WhatsApp preview displays template content (not blank)
- ✓ Text colors use CSS variables for theme compatibility
- ✓ Back button navigates correctly
- ✓ Template metadata is visible and readable

**Bugs it catches:**
- View button not working/route not defined
- Template detail page showing blank preview
- Status badge with poor contrast (green text on green background)
- Template content not displaying in preview
- Hardcoded text colors instead of theme variables

**Run:** `node scripts/ui/templates-view-preview.js`

---

### All Existing UI Tests

1. **smoke.js** - Basic app functionality smoke test
2. **contacts-crud.js** - Contact management operations
3. **whatsapp-campaign.js** - WhatsApp campaign creation flow
4. **email-campaign.js** - Email campaign creation flow
5. **settings-templates.js** - Basic template settings
6. **settings-connect-email.js** - Email provider connection
7. **campaign-mapping-persistence.js** - Campaign variable mapping
8. **campaign-archive-filter.js** - Campaign filtering/archiving
9. **campaign-resend-duplicate.js** - Campaign resend operations
10. **contacts-bulk-tags.js** - Bulk tag operations
11. **campaign-button-vars.js** - Campaign button variables
12. **campaign-metrics-card.js** - Campaign metrics display
13. **settings-whatsapp-connect.js** - WhatsApp dialog UI validation
14. **templates-view-preview.js** - Template view and preview functionality

### Test Architecture

All tests use **Puppeteer Core** for browser automation:
- Open headless Chrome/Chromium
- Simulate user interactions (clicks, typing, navigation)
- Verify UI elements render correctly
- Take screenshots on failure for debugging
- Check CSS styling and computed values
- Verify navigation and routing

### Run UI Tests

```bash
# Test WhatsApp dialog
node scripts/ui/settings-whatsapp-connect.js

# Test template view/preview
node scripts/ui/templates-view-preview.js

# Run all UI tests
node scripts/ui/run-all.js
```

### Environment Variables
```bash
BASE_URL=http://localhost:3173
TEST_EMAIL=admin@engageninja.local
TEST_PASSWORD=AdminPassword123
CHROME_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome  # macOS
# or
CHROME_PATH=/usr/bin/google-chrome  # Linux
```

---

**Last Updated**: 2025-12-28
**Status**: Phases 1-3 Complete (50% progress)
