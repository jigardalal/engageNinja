# Journey: Tenant/Workspace Selection

**Priority:** Critical
**User Type:** Authenticated user with multiple tenants
**Frequency:** Once per login (for users with multiple workspaces)
**Business Impact:** Enables multi-tenant access - critical for SMB teams managing multiple clients
**Preconditions:** User is authenticated, has access to 2+ tenants

## Overview
Users with multiple workspaces must select which tenant/workspace they want to work in. This is critical for the multi-tenant architecture of EngageNinja where users can be part of multiple organizations.

## Steps

### 1. Navigate to Tenant Selection Page
- **From:** Login page (redirect after authentication)
- **Action:** Automatic redirect to `/tenants`
- **Selectors:** N/A (automatic redirect)
- **Expected Result:** Tenant selection page loads
- **Assertions:**
  - Page URL is `/tenants`
  - Tenant selection page is visible
  - All available tenants are displayed
  - Each tenant shows relevant information (name, plan, role)

### 2. View Available Workspaces
- **From:** Tenant selection page
- **Action:** Page automatically displays list of available workspaces
- **Selectors:**
  - Primary: `[data-testid="tenant-card"]`
  - Fallback: `div.tenant-option`
  - Recommendation: Add `data-testid="tenant-card"` to each workspace card
- **Expected Result:** All workspaces are visible with information
- **Assertions:**
  - Number of visible tenant cards matches number of accessible tenants
  - Each card shows tenant name
  - Each card shows user's role (owner/admin/member/viewer)
  - Each card shows plan tier (Free/Starter/Growth/Pro/Enterprise)
  - Each card is clickable

### 3. Select Workspace
- **From:** Tenant selection page
- **Action:** Click on a workspace card to select it
- **Selectors:**
  - Primary: `[data-testid="tenant-card-{tenantId}"]`
  - Fallback: `div.tenant-option:has-text("{tenantName}")`
  - Recommendation: Add data-testid with tenant ID for clarity
- **Input Data:** `{selectedTenantId: 123}`
- **Expected Result:** Selected workspace becomes active
- **Assertions:**
  - Selected tenant card shows active/selected state
  - Loading state appears on selected card

### 4. Switch to Dashboard
- **From:** Tenant selection page (after selection)
- **Action:** Wait for backend to process tenant selection
- **Expected Result:** Redirect to dashboard for selected workspace
- **Assertions:**
  - URL changes to `/dashboard`
  - Dashboard displays data for selected workspace
  - Active tenant context is set correctly
  - Navigation shows selected workspace name

## Success Outcome
- User has selected a workspace/tenant
- Session now has active tenant context
- User can access all features within selected workspace
- Navigation menus show selected workspace
- User can switch to different workspace at any time

## Alternative Paths

### Path 1: Direct Navigation to Dashboard
- **Trigger:** User navigates directly to `/dashboard` without explicit tenant selection
- **Outcome:** If user has only 1 tenant, auto-select and show dashboard
- **Steps:** System auto-selects single available tenant, shows dashboard

### Path 2: Tenant Switching
- **Trigger:** User wants to switch workspaces while already working
- **Outcome:** Workspace selection occurs without full logout
- **Steps:** Navigate to tenant switcher in navigation, select new workspace

## Error Cases

### Error 1: No Accessible Tenants
- **Trigger:** User is authenticated but has no accessible tenants
- **Expected Behavior:** Error message displayed, offer workspace creation
- **Selector:** `[data-testid="no-tenants-error"]`
- **Error Message:** "You don't have access to any workspaces. Create a new one or contact an admin"
- **Recovery:** User creates new workspace or contacts admin

### Error 2: Tenant Access Revoked
- **Trigger:** User's access to a workspace was revoked while on this page
- **Expected Behavior:** Workspace is no longer visible or is marked as unavailable
- **Selector:** `[data-testid="tenant-access-revoked"]`
- **Error Message:** "Your access to this workspace has been revoked"
- **Recovery:** User selects different workspace or contacts admin

### Error 3: Network Error During Selection
- **Trigger:** Network fails when user tries to select workspace
- **Expected Behavior:** Error message, workspace selection remains possible
- **Selector:** `[data-testid="tenant-selection-error"]`
- **Error Message:** "Failed to select workspace. Please try again"
- **Recovery:** User retries selection

### Error 4: Workspace Deleted
- **Trigger:** A workspace the user has access to is deleted while viewing list
- **Expected Behavior:** Workspace is removed from list or marked as deleted
- **Selector:** `[data-testid="tenant-deleted-info"]`
- **Error Message:** "This workspace has been deleted"
- **Recovery:** User selects different workspace

### Error 5: Session Expired During Selection
- **Trigger:** Session expires between displaying tenants and selection submission
- **Expected Behavior:** User is redirected to login
- **Selector:** N/A (redirect)
- **Error Message:** N/A (automatic redirect)
- **Recovery:** User logs in again

## Selector Improvements Needed
- Tenant card container: Add `data-testid="tenant-card-{tenantId}"`
- Tenant name: Add `data-testid="tenant-name-{tenantId}"`
- Tenant role badge: Add `data-testid="tenant-role-{tenantId}"`
- Tenant plan badge: Add `data-testid="tenant-plan-{tenantId}"`
- Tenant selection button: Add `data-testid="tenant-select-{tenantId}"`
- No tenants error: Add `data-testid="no-tenants-error"`
- Create workspace button: Add `data-testid="create-workspace-button"`
- Tenant switcher dropdown: Add `data-testid="tenant-switcher"`

## Test Data Requirements
- User with 2 accessible tenants
- User with 3+ accessible tenants
- User with 1 tenant (should auto-select)
- User with tenant where they're owner
- User with tenant where they're admin
- User with tenant where they're member
- User with tenant where they're viewer
- User with no accessible tenants
- Deleted tenant in system
- Workspace with Free plan
- Workspace with Paid plan
