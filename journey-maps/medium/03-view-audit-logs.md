# Journey: View Tenant Audit Logs

**Priority:** Medium
**User Type:** Authenticated admin user
**Frequency:** Occasional (compliance/troubleshooting)
**Business Impact:** Compliance and security auditing
**Preconditions:** User is authenticated, has admin role

## Overview
Admins view audit logs of all tenant operations for compliance, troubleshooting, and security purposes. Logs show who did what, when, and what changed.

## Steps

### 1. Navigate to Settings
- **From:** Navigation or sidebar
- **Action:** Click "Settings" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-settings"]`
  - Fallback: `a:has-text("Settings")`
- **Expected Result:** Settings page loads
- **Assertions:**
  - Page URL is `/settings`
  - Settings tabs visible

### 2. Click Audit Logs Tab
- **From:** Settings page
- **Action:** Click "Audit Logs" tab
- **Selectors:**
  - Primary: `[data-testid="settings-tab-audit"]`
  - Fallback: `button:has-text("Audit")`
- **Expected Result:** Audit logs page shows
- **Assertions:**
  - Tab is active
  - Logs table visible
  - Filters available

### 3. View Audit Logs List
- **From:** Audit logs page
- **Action:** Review audit log entries
- **Selectors:**
  - Primary: `[data-testid="audit-logs-table"]`
  - Fallback: `table.audit-logs`
- **Expected Result:** Audit logs display
- **Assertions:**
  - Each log shows: timestamp, user, action, resource type, resource name
  - Entries ordered newest first
  - Pagination or scroll loading

### 4. Filter by User
- **From:** Audit logs page
- **Action:** Filter logs by specific user
- **Selectors:**
  - Primary: `[data-testid="audit-filter-user"]`
  - Fallback: `select[name="user"]`
- **Input Data:** `{filterUser: "john@example.com"}`
- **Expected Result:** Logs filtered
- **Assertions:**
  - Only logs from selected user show
  - Filter shows applied

### 5. Filter by Action Type
- **From:** Audit logs page
- **Action:** Filter by action (create, update, delete)
- **Selectors:**
  - Primary: `[data-testid="audit-filter-action"]`
  - Fallback: `select[name="action"]`
- **Input Data:** `{filterAction: "delete"}`
- **Expected Result:** Logs filtered by action
- **Assertions:**
  - Only delete actions show
  - Count updates

### 6. Filter by Date Range
- **From:** Audit logs page
- **Action:** Set date range for logs
- **Selectors:**
  - Primary: `[data-testid="audit-filter-date"]`
  - Fallback: `input[type="date"]`
- **Input Data:** `{startDate: "2024-01-01", endDate: "2024-01-31"}`
- **Expected Result:** Logs in date range show
- **Assertions:**
  - Only logs from date range displayed

### 7. View Log Details
- **From:** Audit logs table
- **Action:** Click on log entry to see full details
- **Selectors:**
  - Primary: `[data-testid="audit-log-{logId}"]`
  - Fallback: `tr.audit-row`
- **Expected Result:** Log detail modal/panel opens
- **Assertions:**
  - Full log information shows
  - Changes shown in before/after format
  - IP address and user agent visible (if available)

### 8. Export Audit Logs
- **From:** Audit logs page
- **Action:** Click "Export" to download logs
- **Selectors:**
  - Primary: `[data-testid="export-audit-logs"]`
  - Fallback: `button:has-text("Export")`
- **Expected Result:** Export modal shows
- **Assertions:**
  - Format options available (CSV, JSON)
  - Download starts

## Success Outcome
- Admin can view complete audit trail
- Compliance requirements met
- Security issues can be identified
- User actions tracked

## Error Cases

### Error 1: No Logs Available
- **Trigger:** No matching logs for filters
- **Error Message:** "No audit logs match your filters"
- **Recovery:** User adjusts filters

### Error 2: Logs Loading Slow
- **Trigger:** Large date range or many entries
- **Expected Behavior:** Loading indicator, pagination
- **Error Message:** "Loading logs..."
- **Recovery:** User narrows date range or uses filters

### Error 3: Export Failed
- **Trigger:** Export generation fails
- **Error Message:** "Failed to export logs"
- **Recovery:** User retries

## Selector Improvements Needed
- Settings nav: Add `data-testid="nav-settings"`
- Audit tab: Add `data-testid="settings-tab-audit"`
- Logs table: Add `data-testid="audit-logs-table"`
- User filter: Add `data-testid="audit-filter-user"`
- Action filter: Add `data-testid="audit-filter-action"`
- Date filter: Add `data-testid="audit-filter-date"`
- Log row: Add `data-testid="audit-log-{logId}"`
- Export button: Add `data-testid="export-audit-logs"`

## Test Data Requirements
- Multiple audit log entries
- Logs spanning weeks/months
- Different action types (create, update, delete)
- Different resource types (campaign, contact, template)
- Multiple users
