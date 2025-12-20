# Phase 3 User Management Manual Testing Guide

## Overview
Comprehensive manual testing for Phase 3 user management system. Tests user invitations, role management, team operations, and owner protection mechanisms.

## Test Setup

### Prerequisites
- Backend running on `http://localhost:3001`
- Database seeded with test data from `db-seed.js`
- All Phase 2 RBAC protections active

### Test Users & Tenants
```
Demo Tenant Users:
- Owner: admin@engageninja.local / AdminPassword123 (owner)
- Admin: user@engageninja.local / UserPassword123 (admin)
- Member: member@engageninja.local / MemberPassword123 (member)
- Viewer: viewer@engageninja.local / ViewerPassword123 (viewer)

Beta Tenant Users:
- Owner: user@engageninja.local / UserPassword123 (owner of Beta)
- Member: switcher@engageninja.local / SwitcherPassword123 (member)

Platform Admin:
- platform.admin@engageninja.local / PlatformAdminPassword123
```

---

## Test Scenarios

### 1. User Listing & Discovery

#### Test 1.1: Owner Can List All Tenant Users
**Endpoint**: `GET /api/tenant/users`
**User**: admin@engageninja.local (owner)
**Steps**:
1. Login as admin@engageninja.local
2. Set active tenant to Demo
3. GET /api/tenant/users
4. **Verify**:
   - Status 200
   - Returns 4 users (admin, user, member, viewer)
   - Includes role summary: {owner: 1, admin: 1, member: 1, viewer: 1}
   - Users sorted by role hierarchy

#### Test 1.2: Admin Can List Tenant Users
**Endpoint**: `GET /api/tenant/users`
**User**: user@engageninja.local (admin of Demo)
**Expected**: 200 OK (admins can also list)

#### Test 1.3: Member Can List Tenant Users (Read-only)
**Endpoint**: `GET /api/tenant/users`
**User**: member@engageninja.local (member)
**Expected**: 200 OK (anyone can list members)

#### Test 1.4: Viewer Can List Tenant Users (Read-only)
**Endpoint**: `GET /api/tenant/users`
**User**: viewer@engageninja.local (viewer)
**Expected**: 200 OK (read access to user list)

---

### 2. User Invitations

#### Test 2.1: Viewer Cannot Invite Users
**Endpoint**: `POST /api/tenant/users/invite`
**User**: viewer@engageninja.local (viewer)
**Payload**: `{ "email": "newuser@example.com", "role": "member" }`
**Expected**: 403 Forbidden (admin+ required)
**Verify**: No invitation created in database

#### Test 2.2: Member Cannot Invite Users
**Endpoint**: `POST /api/tenant/users/invite`
**User**: member@engageninja.local (member)
**Payload**: `{ "email": "newuser@example.com", "role": "member" }`
**Expected**: 403 Forbidden (admin+ required)

#### Test 2.3: Admin CAN Invite New User
**Endpoint**: `POST /api/tenant/users/invite`
**User**: user@engageninja.local (admin of Demo)
**Payload**: `{ "email": "newuser1@example.com", "role": "member" }`
**Expected**:
- Status 201 Created
- Returns invitation_id and token
- Returns expires_at (7 days from now)
- Returns status_type: "pending_invitation"
**Verify**:
- Invitation created in user_invitations table
- Token is 64 characters (32 bytes hex)
- Expires_at is ~7 days in future

#### Test 2.4: Owner CAN Invite New User
**Endpoint**: `POST /api/tenant/users/invite`
**User**: admin@engageninja.local (owner of Demo)
**Payload**: `{ "email": "newuser2@example.com", "role": "admin" }`
**Expected**: Status 201 Created with invitation details

#### Test 2.5: Cannot Invite Invalid Email
**Endpoint**: `POST /api/tenant/users/invite`
**User**: admin@engageninja.local (owner)
**Payload**: `{ "email": "notanemail", "role": "member" }`
**Expected**:
- Status 400 Bad Request
- Error: "Invalid email"

#### Test 2.6: Cannot Invite Invalid Role
**Endpoint**: `POST /api/tenant/users/invite`
**User**: admin@engageninja.local (owner)
**Payload**: `{ "email": "newuser@example.com", "role": "superadmin" }`
**Expected**:
- Status 400 Bad Request
- Error: "Invalid role"
- Lists valid roles

#### Test 2.7: Cannot Invite Existing Tenant Member
**Endpoint**: `POST /api/tenant/users/invite`
**User**: admin@engageninja.local (owner)
**Payload**: `{ "email": "member@engageninja.local", "role": "admin" }`
**Expected**:
- Status 400 Bad Request
- Error: "User already in tenant"

#### Test 2.8: Direct Addition of Existing User
**Scenario**: User exists in system but not in this tenant
**Setup**:
1. Have switcher@engageninja.local (only in Beta)
2. Admin invites switcher to Demo tenant
**Endpoint**: `POST /api/tenant/users/invite`
**Payload**: `{ "email": "switcher@engageninja.local", "role": "member" }`
**Expected**:
- Status 201 Created
- status_type: "direct_addition"
- Returns user_id (not invitation_id)
- User immediately added to Demo tenant

---

### 3. Role Management

#### Test 3.1: Only Owner Can Change Roles
**Endpoint**: `PATCH /api/tenant/users/:userId/role`
**Test Permission Levels**:
- Viewer: 403 Forbidden
- Member: 403 Forbidden
- Admin: 403 Forbidden
- Owner: 200 OK

#### Test 3.2: Owner CAN Promote Member to Admin
**Endpoint**: `PATCH /api/tenant/users/:userId/role`
**User**: admin@engageninja.local (owner)
**Target**: member@engageninja.local (current role: member)
**Payload**: `{ "role": "admin" }`
**Expected**:
- Status 200 OK
- Returns updated user with new role: "admin"
- user_tenants.role updated in database
- Audit log created with old_role and new_role

#### Test 3.3: Owner CAN Demote Admin to Member
**Endpoint**: `PATCH /api/tenant/users/:userId/role`
**Payload**: `{ "role": "member" }`
**Expected**: Status 200 OK with new role

#### Test 3.4: Cannot Change to Invalid Role
**Endpoint**: `PATCH /api/tenant/users/:userId/role`
**Payload**: `{ "role": "superuser" }`
**Expected**:
- Status 400 Bad Request
- Error: "Invalid role"

#### Test 3.5: Cannot Target Non-Existent User
**Endpoint**: `PATCH /api/tenant/users/00000000-0000-0000-0000-000000000000/role`
**Expected**:
- Status 404 Not Found
- Error: "User is not a member of this tenant"

#### Test 3.6: Last Owner Protection - Cannot Demote Only Owner
**Scenario**: Demo tenant has only one owner (admin@engageninja.local)
**Endpoint**: `PATCH /api/tenant/users/:userId/role`
**Target**: admin@engageninja.local
**Payload**: `{ "role": "admin" }`
**Expected**:
- Status 400 Bad Request
- Error: "Cannot remove last owner"

#### Test 3.7: Can Promote Member to Owner (replaces last owner)
**Scenario**: After adding second user, promote them to owner
**Steps**:
1. Invite newuser@example.com as member
2. Accept invitation (login as newuser)
3. As original owner, promote newuser to owner
4. Demote original owner to admin
**Expected**:
- Original owner demoted successfully
- newuser is now owner
- Tenant still has owner

---

### 4. User Removal

#### Test 4.1: Only Owner Can Remove Users
**Endpoint**: `DELETE /api/tenant/users/:userId`
**Permission Tests**:
- Viewer: 403 Forbidden
- Member: 403 Forbidden
- Admin: 403 Forbidden
- Owner: 200 OK

#### Test 4.2: Owner CAN Remove Member
**Endpoint**: `DELETE /api/tenant/users/:userId`
**User**: admin@engageninja.local (owner)
**Target**: member@engageninja.local
**Expected**:
- Status 200 OK
- Confirmation message with user email and role
- User deleted from user_tenants (no longer appears in list)

#### Test 4.3: Owner CAN Remove Admin
**Endpoint**: `DELETE /api/tenant/users/:userId`
**Target**: user@engageninja.local (admin)
**Expected**: Status 200 OK

#### Test 4.4: Cannot Remove Self
**Endpoint**: `DELETE /api/tenant/users/:userId`
**User**: admin@engageninja.local (owner)
**Target**: admin@engageninja.local (self)
**Expected**:
- Status 400 Bad Request
- Error: "Cannot remove yourself from the tenant"

#### Test 4.5: Cannot Remove Only Owner
**Scenario**: admin@engageninja.local is the only owner
**Endpoint**: `DELETE /api/tenant/users/:userId`
**Target**: admin@engageninja.local
**Expected**:
- Status 400 Bad Request
- Error: "Cannot remove last owner"

#### Test 4.6: Last Owner Protection After Ownership Transfer
**Scenario**: Transfer ownership, then try to remove both
**Steps**:
1. Promote viewer to owner
2. Try to remove admin (original owner)
3. Try to remove viewer (new owner)
**Expected**: Can remove admin, cannot remove viewer

#### Test 4.7: Cannot Remove Non-Existent User
**Endpoint**: `DELETE /api/tenant/users/00000000-0000-0000-0000-000000000000`
**Expected**:
- Status 404 Not Found
- Error: "User is not a member of this tenant"

---

### 5. Invitation Acceptance

#### Test 5.1: User Can Accept Pending Invitation
**Endpoint**: `POST /api/auth/accept-invite`
**Setup**:
1. As owner, invite newuser3@example.com as member
2. Copy invitation_token from response
3. Create account: POST /api/auth/signup with newuser3@example.com (include `firstName`, `companyName`, `email`, `password`, optional `lastName`/`phone`)
**Payload**: `{ "invitation_token": "<token>" }`
**Expected**:
- Status 200 OK
- Returns tenant_id, tenant_name, role
- User now member of that tenant
- Invitation deleted from database

#### Test 5.2: Cannot Accept Invitation for Different Email
**Endpoint**: `POST /api/auth/accept-invite`
**Setup**:
1. Invite newuser4@example.com
2. Copy token
3. Create account with differentuser@example.com
**Payload**: `{ "invitation_token": "<token>" }`
**Expected**:
- Status 403 Forbidden
- Error: "This invitation is for a different email address"

#### Test 5.3: Cannot Accept Expired Invitation
**Setup**: Manually update user_invitations to past date
**Endpoint**: `POST /api/auth/accept-invite`
**Expected**:
- Status 400 Bad Request
- Error: "This invitation has expired"

#### Test 5.4: Cannot Accept Invalid Token
**Endpoint**: `POST /api/auth/accept-invite`
**Payload**: `{ "invitation_token": "invalid" }`
**Expected**:
- Status 404 Not Found
- Error: "Invalid or expired invitation token"

#### Test 5.5: Cannot Accept Twice
**Setup**: Accept valid invitation
**Endpoint**: `POST /api/auth/accept-invite`
**Payload**: Use same token again
**Expected**:
- Status 404 Not Found
- Error: "Invalid or expired invitation token"
- (Token was deleted after first acceptance)

---

### 6. Auth Endpoint - GET /api/auth/me

#### Test 6.1: Includes role_global
**Endpoint**: `GET /api/auth/me`
**User**: admin@engageninja.local (owner with no platform role)
**Expected**:
- role_global: "none" (or null)
- Status 200

#### Test 6.2: Includes Per-Tenant Roles
**Endpoint**: `GET /api/auth/me`
**User**: user@engageninja.local (admin of Demo, owner of Beta)
**Expected**:
- tenants array with each tenant having role field
- Demo: role "admin"
- Beta: role "owner"

#### Test 6.3: Includes active_tenant_role
**Endpoint**: `GET /api/auth/me`
**User**: admin@engageninja.local
**Active Tenant**: Demo
**Expected**:
- active_tenant_role: "owner"
- Matches role in tenants array for active tenant

#### Test 6.4: Platform Admin Has role_global
**Endpoint**: `GET /api/auth/me`
**User**: platform.admin@engageninja.local
**Expected**:
- role_global: "platform_admin"
- Status 200

#### Test 6.5: User With Multiple Tenants
**Endpoint**: `GET /api/auth/me`
**User**: user@engageninja.local (2 tenants)
**Expected**:
- tenants array has 2 entries
- Each has correct role
- active_tenant_id can be null (must_select_tenant true)
- active_tenant_role is null when no active tenant

---

### 7. Cross-Tenant Isolation

#### Test 7.1: Cannot Invite Across Tenants
**Setup**:
- Login as admin of Demo tenant
- Try to add/modify user in Beta tenant
**Endpoint**: `POST /api/tenant/users/invite` with Beta tenant context
**Expected**: User sees only their own tenant's users

#### Test 7.2: Owner of One Tenant Cannot Manage Another
**Endpoint**: `PATCH /api/tenant/users/:userId/role`
**User**: user@engageninja.local (owner of Beta, admin of Demo)
**Active Tenant**: Beta
**Target**: Try to modify user from Demo tenant
**Expected**: Cannot access (403 or 404)

#### Test 7.3: Invitations Scoped to Specific Tenant
**Setup**: Invite user to Demo, then try to use token to join Beta
**Expected**: Token invalid for other tenants

---

### 8. Audit Logging Verification

#### Test 8.1: USER_INVITE Action Logged
**Query**: `SELECT * FROM audit_logs WHERE action = 'user.invite' ORDER BY created_at DESC LIMIT 1`
**Expected**:
- actor_user_id: admin user's ID
- tenant_id: Demo tenant ID
- metadata contains: email, role, type ("pending_invitation" or "direct_addition")

#### Test 8.2: USER_ROLE_CHANGED Action Logged
**Query**: `SELECT * FROM audit_logs WHERE action = 'user.role_changed' ORDER BY created_at DESC LIMIT 1`
**Expected**:
- metadata contains: email, old_role, new_role
- Example: old_role: "member", new_role: "admin"

#### Test 8.3: USER_REMOVED Action Logged
**Query**: `SELECT * FROM audit_logs WHERE action = 'user.removed' ORDER BY created_at DESC LIMIT 1`
**Expected**:
- metadata contains: email, role
- actor_user_id is owner who removed

---

### 9. Error Handling & Validation

#### Test 9.1: Missing Required Fields
**Endpoint**: `POST /api/tenant/users/invite`
**Payload**: `{ "email": "user@example.com" }` (missing role)
**Expected**:
- Status 400 Bad Request
- Error mentions missing fields

#### Test 9.2: Malformed Requests
**Endpoint**: `PATCH /api/tenant/users/:userId/role`
**Payload**: `"not json"`
**Expected**:
- Status 400 Bad Request (or 500)
- Graceful error handling

#### Test 9.3: Database Integrity
**After Tests**: Run database integrity checks
- All users belong to existing tenants
- All invitations have valid roles
- All audit logs have valid references

---

## Manual Testing Checklist

### User Listing
- [ ] Owner lists users (4 expected)
- [ ] Admin lists users
- [ ] Member lists users
- [ ] Viewer lists users
- [ ] Role summary correct

### Invitations
- [ ] Viewer cannot invite (403)
- [ ] Member cannot invite (403)
- [ ] Admin CAN invite
- [ ] Owner CAN invite
- [ ] Invalid email rejected
- [ ] Invalid role rejected
- [ ] Duplicate invite rejected
- [ ] Direct addition works for existing users
- [ ] Token generated (64 chars)
- [ ] Expiration set to 7 days

### Role Management
- [ ] Viewer cannot change roles (403)
- [ ] Member cannot change roles (403)
- [ ] Admin cannot change roles (403)
- [ ] Owner CAN change roles
- [ ] Promote member to admin works
- [ ] Demote admin to member works
- [ ] Last owner protection works
- [ ] Cannot change to invalid role
- [ ] Non-existent user returns 404
- [ ] Audit log created

### User Removal
- [ ] Viewer cannot remove (403)
- [ ] Member cannot remove (403)
- [ ] Admin cannot remove (403)
- [ ] Owner CAN remove
- [ ] Cannot remove self
- [ ] Cannot remove last owner
- [ ] User removed from user_tenants
- [ ] Audit log created

### Invitations Acceptance
- [ ] Can accept valid invitation
- [ ] Cannot accept expired invitation
- [ ] Cannot accept with wrong email
- [ ] Cannot accept invalid token
- [ ] Cannot accept twice
- [ ] Invitation deleted after acceptance
- [ ] User added to tenant

### GET /api/auth/me
- [ ] Includes role_global
- [ ] Includes per-tenant roles
- [ ] Includes active_tenant_role
- [ ] Platform admin has platform role
- [ ] Multiple tenants show all roles

### Cross-Tenant Isolation
- [ ] Cannot invite across tenants
- [ ] Cannot modify other tenant's users
- [ ] Tokens scoped to tenant

### Audit Logging
- [ ] USER_INVITE logged with metadata
- [ ] USER_ROLE_CHANGED logged with old/new
- [ ] USER_REMOVED logged
- [ ] All actions have correct tenant_id
- [ ] All actions have correct actor_user_id

---

## Test Results Summary

**Date**: _______________
**Tester**: _______________

### Passed ✓
- [ ] All 9 test categories (50+ scenarios)

### Failed ✗
- [ ] None (all should pass)

### Issues Found
(Document any failures or unexpected behavior)

---

## Notes for QA

1. **Test Data**: Uses seeded users with specific roles
2. **Invitations**: Real tokens generated, expire in 7 days
3. **Owner Protection**: Business logic prevents breaking tenant
4. **Audit Trail**: Full compliance logging for all operations
5. **Email Validation**: Format-only (not verified, can use any format)
6. **Role Hierarchy**: viewer(0) < member(1) < admin(2) < owner(3)

---
