# Phase 4 Manual Testing Guide
## Platform Admin System

**Test Date:** 2025-12-16
**Test Version:** 1.0
**Scope:** Full Phase 4 Platform Admin functionality

---

## Test Prerequisites

### Setup
1. Ensure database is seeded with test data:
   ```bash
   cd backend
   node scripts/db-seed.js
   ```

2. Platform admin user credentials:
   ```
   Email: platform.admin@engageninja.local
   Password: PlatformAdminPassword123
   ```

3. Backend server running:
   ```bash
   npm start
   # or
   node src/index.js
   ```

### Test Tenant & Users (from seed data)
- **Demo Tenant** (owner: owner@engageninja.local)
  - owner@engageninja.local (owner role)
  - admin@engageninja.local (admin role)
  - member@engageninja.local (member role)
  - viewer@engageninja.local (viewer role)

- **Beta Tenant** (owner: admin@engageninja.local)
  - admin@engageninja.local (owner role)

---

## Section 1: Authentication & Authorization

### Test 1.1: Platform Admin Login
**Objective:** Verify platform admin can log in

**Steps:**
1. Login with `platform.admin@engageninja.local`
2. Verify session is created with `role_global = 'platform_admin'`

**Expected Result:** ✓ Login successful, session created

---

### Test 1.2: Non-Admin Cannot Access Admin Routes
**Objective:** Verify role-based access control

**Steps:**
1. Login as `member@engageninja.local` (member role, not platform admin)
2. Try to access `GET /api/admin/tenants`
3. Expect 403 Forbidden response

**Expected Result:** ✓ 403 error, access denied

---

### Test 1.3: Unauthenticated Access Denied
**Objective:** Verify authentication requirement

**Steps:**
1. Without logging in, make request to `GET /api/admin/tenants`
2. Expect 401 Unauthorized response

**Expected Result:** ✓ 401 error, must be logged in

---

## Section 2: Tenant Management

### Test 2.1: List All Tenants
**Objective:** Verify platform admin can list all tenants

**Steps:**
1. Login as platform admin
2. Call `GET /api/admin/tenants`
3. Verify response includes both Demo and Beta tenants
4. Verify user counts are accurate

**Expected Result:** ✓ Returns list with user_count per tenant

---

### Test 2.2: Filter Tenants by Status
**Objective:** Verify filtering functionality

**Steps:**
1. Call `GET /api/admin/tenants?status=active`
2. Verify only active tenants returned
3. Call `GET /api/admin/tenants?status=suspended`
4. Verify different results

**Expected Result:** ✓ Filtering works correctly

---

### Test 2.3: Search Tenants by Name
**Objective:** Verify search functionality

**Steps:**
1. Call `GET /api/admin/tenants?search=Demo`
2. Verify returns Demo Tenant
3. Call `GET /api/admin/tenants?search=Beta`
4. Verify returns Beta Tenant

**Expected Result:** ✓ Search returns matching tenants

---

### Test 2.4: Pagination
**Objective:** Verify pagination metadata

**Steps:**
1. Call `GET /api/admin/tenants?limit=1&offset=0`
2. Verify response includes pagination object
3. Verify has `total`, `limit`, `offset`, `pages` fields
4. Verify correct number of results returned

**Expected Result:** ✓ Pagination metadata correct

---

### Test 2.5: Get Tenant Details
**Objective:** Verify detailed tenant information

**Steps:**
1. Get Demo Tenant ID from list endpoint
2. Call `GET /api/admin/tenants/{tenantId}`
3. Verify includes tenant details, plan name, user list
4. Verify user counts in metrics section

**Expected Result:** ✓ Returns complete tenant information

---

### Test 2.6: Get Non-Existent Tenant
**Objective:** Verify error handling

**Steps:**
1. Call `GET /api/admin/tenants/nonexistent-id`
2. Expect 404 Not Found

**Expected Result:** ✓ 404 error returned

---

### Test 2.7: Create New Tenant (No Owner)
**Objective:** Verify tenant creation

**Steps:**
1. Call `POST /api/admin/tenants` with body:
   ```json
   {
     "name": "Test Tenant 1"
   }
   ```
2. Verify 201 response with tenantId
3. Query database to confirm tenant created

**Expected Result:** ✓ Tenant created successfully

---

### Test 2.8: Create Tenant with Existing User as Owner
**Objective:** Verify owner assignment for existing users

**Steps:**
1. Call `POST /api/admin/tenants` with body:
   ```json
   {
     "name": "Test Tenant 2",
     "ownerEmail": "owner@engageninja.local"
   }
   ```
2. Verify 201 response
3. Verify user_tenants table shows this user as owner of new tenant
4. Verify audit log created

**Expected Result:** ✓ Tenant created with owner assigned, audit logged

---

### Test 2.9: Create Tenant with New User Email
**Objective:** Verify invitation creation for new users

**Steps:**
1. Call `POST /api/admin/tenants` with body:
   ```json
   {
     "name": "Test Tenant 3",
     "ownerEmail": "newuser@example.com"
   }
   ```
2. Verify 201 response with invitation object
3. Verify invitation record in database
4. Verify token is present and unique
5. Verify expiration is 30 days from now

**Expected Result:** ✓ Invitation created for new user

---

### Test 2.10: Create Tenant with Invalid Data
**Objective:** Verify input validation

**Steps:**
1. Call `POST /api/admin/tenants` with empty body
2. Expect 400 Bad Request
3. Call with empty name string
4. Expect 400 Bad Request

**Expected Result:** ✓ Validation errors returned

---

### Test 2.11: Update Tenant Status
**Objective:** Verify tenant status changes

**Steps:**
1. Get Demo Tenant ID
2. Call `PATCH /api/admin/tenants/{tenantId}` with body:
   ```json
   {
     "status": "suspended"
   }
   ```
3. Verify response success
4. Call `GET /api/admin/tenants/{tenantId}`
5. Verify status is now 'suspended'
6. Verify audit log created

**Expected Result:** ✓ Status updated and audited

---

### Test 2.12: Update Tenant Plan
**Objective:** Verify plan changes

**Steps:**
1. Get Demo Tenant ID
2. Call `PATCH /api/admin/tenants/{tenantId}` with body:
   ```json
   {
     "planId": "growth_plan_id"
   }
   ```
3. Verify plan updated in database

**Expected Result:** ✓ Plan updated

---

### Test 2.13: Update Tenant Limits
**Objective:** Verify limits configuration

**Steps:**
1. Call `PATCH /api/admin/tenants/{tenantId}` with body:
   ```json
   {
     "limits": {
       "monthly_contacts": 10000,
       "concurrent_campaigns": 5
     }
   }
   ```
2. Verify limits stored as JSON
3. Verify retrieved correctly from database

**Expected Result:** ✓ Limits updated and stored

---

### Test 2.14: Update Tenant Metadata
**Objective:** Verify metadata storage

**Steps:**
1. Call `PATCH /api/admin/tenants/{tenantId}` with body:
   ```json
   {
     "metadata": {
       "industry": "technology",
       "country": "US"
     }
   }
   ```
2. Verify metadata stored and retrieved correctly

**Expected Result:** ✓ Metadata updated

---

### Test 2.15: Update Tenant with Invalid Status
**Objective:** Verify validation

**Steps:**
1. Call `PATCH /api/admin/tenants/{tenantId}` with body:
   ```json
   {
     "status": "invalid_status"
   }
   ```
2. Expect 400 Bad Request

**Expected Result:** ✓ Invalid status rejected

---

## Section 3: User Management

### Test 3.1: List All Users
**Objective:** Verify user listing

**Steps:**
1. Call `GET /api/admin/users`
2. Verify returns all users from seed data
3. Verify each user includes tenant_count

**Expected Result:** ✓ Returns complete user list

---

### Test 3.2: Search Users
**Objective:** Verify user search

**Steps:**
1. Call `GET /api/admin/users?search=owner`
2. Verify returns owner@engageninja.local
3. Call `GET /api/admin/users?search=admin`
4. Verify returns admin@engageninja.local

**Expected Result:** ✓ Search returns matching users

---

### Test 3.3: Filter Users by Active Status
**Objective:** Verify active status filtering

**Steps:**
1. Call `GET /api/admin/users?active=true`
2. Verify all returned users have active=1
3. Call `GET /api/admin/users?active=false`
4. Verify returns inactive users

**Expected Result:** ✓ Filtering works correctly

---

### Test 3.4: Filter Users by Platform Role
**Objective:** Verify role filtering

**Steps:**
1. Call `GET /api/admin/users?role=platform_admin`
2. Verify returns only platform.admin@engageninja.local
3. Verify has role_global='platform_admin'

**Expected Result:** ✓ Role filtering works

---

### Test 3.5: User Pagination
**Objective:** Verify pagination

**Steps:**
1. Call `GET /api/admin/users?limit=2&offset=0`
2. Verify returns 2 users
3. Verify pagination metadata included

**Expected Result:** ✓ Pagination works correctly

---

### Test 3.6: Get User Details
**Objective:** Verify detailed user information

**Steps:**
1. Get owner@engageninja.local user ID
2. Call `GET /api/admin/users/{userId}`
3. Verify includes user details and all tenant memberships
4. Verify tenants include role and joined_at

**Expected Result:** ✓ Returns detailed user information

---

### Test 3.7: Get Non-Existent User
**Objective:** Verify error handling

**Steps:**
1. Call `GET /api/admin/users/nonexistent-id`
2. Expect 404 Not Found

**Expected Result:** ✓ 404 error

---

### Test 3.8: Deactivate User
**Objective:** Verify user deactivation

**Steps:**
1. Get owner@engageninja.local user ID
2. Call `PATCH /api/admin/users/{userId}` with body:
   ```json
   {
     "active": false
   }
   ```
3. Verify 200 response
4. Call `GET /api/admin/users/{userId}`
5. Verify active is false
6. Verify audit log created

**Expected Result:** ✓ User deactivated and logged

---

### Test 3.9: Reactivate User
**Objective:** Verify user reactivation

**Steps:**
1. Call `PATCH /api/admin/users/{userId}` with body:
   ```json
   {
     "active": true
   }
   ```
2. Verify user reactivated

**Expected Result:** ✓ User reactivated

---

### Test 3.10: Prevent Self-Deactivation
**Objective:** Verify safety check

**Steps:**
1. Login as platform.admin@engageninja.local
2. Get current user ID from session
3. Try to deactivate self with `PATCH /api/admin/users/{userId}`
4. Expect 400 Bad Request with self-deactivation error

**Expected Result:** ✓ Self-deactivation prevented

---

### Test 3.11: Assign User to Tenant
**Objective:** Verify user assignment

**Steps:**
1. Create test user or use existing one
2. Get user ID and a tenant ID (Demo Tenant)
3. Call `POST /api/admin/users/{userId}/tenants/{tenantId}/assign` with body:
   ```json
   {
     "role": "member"
   }
   ```
4. Verify 201 response
5. Verify user_tenants record created
6. Verify audit log created

**Expected Result:** ✓ User assigned to tenant

---

### Test 3.12: Assign User Already in Tenant
**Objective:** Verify duplicate prevention

**Steps:**
1. Try to assign owner@engageninja.local to Demo Tenant (already there)
2. Expect 400 Bad Request with duplicate error

**Expected Result:** ✓ Duplicate assignment prevented

---

### Test 3.13: Assign with Invalid Role
**Objective:** Verify role validation

**Steps:**
1. Try to assign user with invalid role like "superuser"
2. Expect 400 Bad Request

**Expected Result:** ✓ Invalid role rejected

---

### Test 3.14: Assign to Non-Existent Tenant
**Objective:** Verify error handling

**Steps:**
1. Try to assign user to nonexistent tenant
2. Expect 404 Not Found

**Expected Result:** ✓ 404 error

---

### Test 3.15: Assign Non-Existent User
**Objective:** Verify error handling

**Steps:**
1. Try to assign nonexistent user to tenant
2. Expect 404 Not Found

**Expected Result:** ✓ 404 error

---

## Section 4: Audit Logging

### Test 4.1: View Audit Logs
**Objective:** Verify audit log retrieval

**Steps:**
1. Call `GET /api/admin/audit-logs`
2. Verify returns list of audit logs
3. Verify each log includes timestamp, actor, action, etc.

**Expected Result:** ✓ Audit logs returned

---

### Test 4.2: Filter Logs by Tenant
**Objective:** Verify tenant filtering

**Steps:**
1. Get Demo Tenant ID
2. Call `GET /api/admin/audit-logs?tenantId={tenantId}`
3. Verify all returned logs have matching tenant_id

**Expected Result:** ✓ Filtering works

---

### Test 4.3: Filter Logs by User
**Objective:** Verify user filtering

**Steps:**
1. Get owner@engageninja.local user ID
2. Call `GET /api/admin/audit-logs?userId={userId}`
3. Verify all returned logs have matching actor_user_id

**Expected Result:** ✓ Filtering works

---

### Test 4.4: Filter Logs by Action
**Objective:** Verify action filtering

**Steps:**
1. Call `GET /api/admin/audit-logs?action=tenant.create`
2. Verify only tenant creation logs returned

**Expected Result:** ✓ Filtering works

---

### Test 4.5: Filter Logs by Date Range
**Objective:** Verify date range filtering

**Steps:**
1. Call with startDate and endDate parameters
2. Verify only logs in range returned

**Expected Result:** ✓ Date filtering works

---

### Test 4.6: Audit Log Pagination
**Objective:** Verify pagination

**Steps:**
1. Call `GET /api/admin/audit-logs?limit=10&offset=0`
2. Verify returns 10 logs maximum
3. Verify pagination metadata

**Expected Result:** ✓ Pagination works

---

### Test 4.7: Audit Log Limit (500 Max)
**Objective:** Verify limit enforcement

**Steps:**
1. Call with `limit=1000`
2. Verify capped at 500 results

**Expected Result:** ✓ Limit enforced

---

### Test 4.8: Parse Metadata JSON
**Objective:** Verify metadata parsing

**Steps:**
1. Call `GET /api/admin/audit-logs`
2. Verify metadata is returned as object (not string)

**Expected Result:** ✓ JSON parsed correctly

---

### Test 4.9: Audit Stats
**Objective:** Verify statistics endpoint

**Steps:**
1. Call `GET /api/admin/audit-logs/stats`
2. Verify includes actionStats (action counts)
3. Verify includes actorStats (top actors)
4. Verify includes summary (total_logs, platform_actions, tenant_actions)

**Expected Result:** ✓ Stats endpoint works

---

### Test 4.10: Verify Tenant Creation is Audited
**Objective:** Verify specific audit event

**Steps:**
1. Create new tenant via `POST /api/admin/tenants`
2. Query `GET /api/admin/audit-logs?action=tenant.create`
3. Verify log entry created with correct metadata

**Expected Result:** ✓ Event audited correctly

---

### Test 4.11: Verify User Assignment is Audited
**Objective:** Verify specific audit event

**Steps:**
1. Assign user to tenant
2. Query `GET /api/admin/audit-logs?action=admin.user_assign`
3. Verify log includes user and tenant IDs

**Expected Result:** ✓ Event audited correctly

---

## Section 5: Platform Configuration

### Test 5.1: Get Configuration Settings
**Objective:** Verify config retrieval

**Steps:**
1. Call `GET /api/admin/config`
2. Verify returns configuration object
3. Verify values are parsed (not stringified)

**Expected Result:** ✓ Config returned correctly

---

### Test 5.2: Update Configuration Setting
**Objective:** Verify config updates

**Steps:**
1. Call `PATCH /api/admin/config/audit_retention_days` with body:
   ```json
   {
     "value": 365
   }
   ```
2. Verify 200 response
3. Verify value updated in database
4. Verify audit log created

**Expected Result:** ✓ Config updated and logged

---

### Test 5.3: Create New Configuration Setting
**Objective:** Verify new settings can be added

**Steps:**
1. Call `PATCH /api/admin/config/new_setting_key` with body:
   ```json
   {
     "value": "test_value"
   }
   ```
2. Verify created if not exists
3. Verify retrieved in subsequent GET

**Expected Result:** ✓ New setting created

---

### Test 5.4: Config Missing Value
**Objective:** Verify validation

**Steps:**
1. Call `PATCH /api/admin/config/test_key` with empty body
2. Expect 400 Bad Request

**Expected Result:** ✓ Validation error

---

## Section 6: Platform Statistics

### Test 6.1: Get Platform Statistics
**Objective:** Verify stats endpoint

**Steps:**
1. Call `GET /api/admin/stats`
2. Verify includes:
   - tenants (count)
   - users (count)
   - active_users (count)
   - platform_admins (count)
   - campaigns (count)
   - contacts (count)
   - audit_logs (count)

**Expected Result:** ✓ All stats returned

---

### Test 6.2: Statistics Accuracy
**Objective:** Verify counts are correct

**Steps:**
1. Call `GET /api/admin/stats`
2. Manually count records in database
3. Verify stats match actual counts

**Expected Result:** ✓ Counts accurate

---

## Section 7: Integration Scenarios

### Test 7.1: Create Tenant and Assign Owner
**Objective:** Full workflow

**Steps:**
1. Create new tenant with owner email
2. Verify tenant created
3. Verify owner assigned or invitation sent
4. Verify audit logs created for all actions

**Expected Result:** ✓ Workflow complete with audit trail

---

### Test 7.2: Manage Tenant Members
**Objective:** Full workflow

**Steps:**
1. Create tenant
2. Assign multiple users with different roles
3. Update user roles via tenant management
4. Verify audit logs track all changes

**Expected Result:** ✓ Complete member management works

---

### Test 7.3: Audit Trail Completeness
**Objective:** Verify audit covers all actions

**Steps:**
1. Perform various admin operations:
   - Create tenant
   - Update tenant
   - Assign user
   - Deactivate user
   - Update config
2. Query audit logs
3. Verify all operations logged with complete metadata

**Expected Result:** ✓ Audit trail complete

---

## Section 8: Error Scenarios

### Test 8.1: Malformed JSON
**Objective:** Verify error handling

**Steps:**
1. Send malformed JSON to any endpoint
2. Verify 400 Bad Request returned

**Expected Result:** ✓ Error handled gracefully

---

### Test 8.2: Missing Required Fields
**Objective:** Verify validation

**Steps:**
1. Create tenant without name
2. Expect 400 Bad Request

**Expected Result:** ✓ Validation enforced

---

### Test 8.3: Invalid Data Types
**Objective:** Verify type validation

**Steps:**
1. Send string where number expected
2. Verify proper error message

**Expected Result:** ✓ Type checking works

---

### Test 8.4: SQL Injection Attempt
**Objective:** Verify safety

**Steps:**
1. Search with value: `'; DROP TABLE tenants; --`
2. Verify no harm done, proper escaping

**Expected Result:** ✓ Input sanitized

---

## Section 9: Performance & Load

### Test 9.1: Large Tenant List
**Objective:** Verify pagination performance

**Steps:**
1. With many tenants, call `GET /api/admin/tenants?limit=50`
2. Verify response time < 1 second

**Expected Result:** ✓ Good performance

---

### Test 9.2: Large Audit Log
**Objective:** Verify filtering performance

**Steps:**
1. Query large audit log with filters
2. Verify response time < 2 seconds

**Expected Result:** ✓ Good performance

---

## Test Summary

**Total Test Cases:** 90+
**Categories Tested:**
- ✓ Authentication & Authorization (3 tests)
- ✓ Tenant Management (15 tests)
- ✓ User Management (15 tests)
- ✓ Audit Logging (11 tests)
- ✓ Configuration (4 tests)
- ✓ Statistics (2 tests)
- ✓ Integration (3 tests)
- ✓ Error Handling (4 tests)
- ✓ Performance (2 tests)

**Pass Criteria:** All tests must pass for Phase 4 completion

---

## Test Execution Checklist

```
Section 1: Authentication & Authorization
  [ ] Test 1.1: Platform Admin Login
  [ ] Test 1.2: Non-Admin Cannot Access
  [ ] Test 1.3: Unauthenticated Access Denied

Section 2: Tenant Management
  [ ] Test 2.1: List All Tenants
  [ ] Test 2.2: Filter by Status
  [ ] Test 2.3: Search Tenants
  [ ] Test 2.4: Pagination
  [ ] Test 2.5: Get Tenant Details
  [ ] Test 2.6: Non-Existent Tenant
  [ ] Test 2.7: Create Tenant (No Owner)
  [ ] Test 2.8: Create with Owner
  [ ] Test 2.9: Create with New User Email
  [ ] Test 2.10: Invalid Data
  [ ] Test 2.11: Update Status
  [ ] Test 2.12: Update Plan
  [ ] Test 2.13: Update Limits
  [ ] Test 2.14: Update Metadata
  [ ] Test 2.15: Invalid Status

Section 3: User Management
  [ ] Test 3.1: List All Users
  [ ] Test 3.2: Search Users
  [ ] Test 3.3: Filter by Status
  [ ] Test 3.4: Filter by Role
  [ ] Test 3.5: Pagination
  [ ] Test 3.6: Get User Details
  [ ] Test 3.7: Non-Existent User
  [ ] Test 3.8: Deactivate User
  [ ] Test 3.9: Reactivate User
  [ ] Test 3.10: Prevent Self-Deactivation
  [ ] Test 3.11: Assign User
  [ ] Test 3.12: Duplicate Assignment
  [ ] Test 3.13: Invalid Role
  [ ] Test 3.14: Non-Existent Tenant
  [ ] Test 3.15: Non-Existent User

Section 4: Audit Logging
  [ ] Test 4.1: View Audit Logs
  [ ] Test 4.2: Filter by Tenant
  [ ] Test 4.3: Filter by User
  [ ] Test 4.4: Filter by Action
  [ ] Test 4.5: Filter by Date
  [ ] Test 4.6: Pagination
  [ ] Test 4.7: Limit Enforcement
  [ ] Test 4.8: Metadata Parsing
  [ ] Test 4.9: Audit Stats
  [ ] Test 4.10: Verify Tenant Audited
  [ ] Test 4.11: Verify User Assignment Audited

Section 5: Platform Configuration
  [ ] Test 5.1: Get Config
  [ ] Test 5.2: Update Config
  [ ] Test 5.3: Create New Setting
  [ ] Test 5.4: Missing Value

Section 6: Platform Statistics
  [ ] Test 6.1: Get Statistics
  [ ] Test 6.2: Stats Accuracy

Section 7: Integration
  [ ] Test 7.1: Create & Assign Owner
  [ ] Test 7.2: Manage Members
  [ ] Test 7.3: Audit Trail

Section 8: Error Scenarios
  [ ] Test 8.1: Malformed JSON
  [ ] Test 8.2: Missing Fields
  [ ] Test 8.3: Invalid Types
  [ ] Test 8.4: SQL Injection

Section 9: Performance
  [ ] Test 9.1: Large List
  [ ] Test 9.2: Large Query
```

---

**Notes:**
- All tests should run against seeded test data
- Use platform.admin@engageninja.local for authentication
- Verify audit logs after each operation
- Check database directly to confirm changes persist
- Monitor error responses for security information leakage
