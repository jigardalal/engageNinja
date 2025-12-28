# UI/UX Consistency Fix Plan

## Overview

This plan addresses the critical UI/UX issues identified in `docs/UI_UX_CONSISTENCY_REPORT.md`:

| Issue | Description | Pages Affected |
|-------|-------------|----------------|
| #27 | Toast notifications missing | 12+ pages |
| #28 | DataTable standard not enforced | 6 pages |

**Reference Report:** `docs/UI_UX_CONSISTENCY_REPORT.md`

## Execution Order

**Phase 1 FIRST:** Add toast notifications to ALL pages
**Phase 2 SECOND:** Migrate pages to DataTable (after Phase 1 complete)

This approach ensures:
- User feedback is fixed across the app first (highest impact)
- DataTable migrations can be done cleanly without mixing concerns
- Progress is trackable per phase

---

## Prerequisites

Before starting, verify these are working:

- [ ] Toast system exists at `frontend/src/components/ui/toast/`
- [ ] `<Toaster />` is in `frontend/src/main.jsx`
- [ ] DataTable component exists at `frontend/src/components/DataTable.jsx`
- [ ] Import pattern: `import { toast, DataTable } from '../components/ui'`

---

## Phase 1: Toast Notifications

### Toast Pattern Reference

```jsx
// Import
import { toast } from '../components/ui'

// Success
toast({
  title: 'Action completed',
  description: 'Details here',
  variant: 'success'
})

// Error
toast({
  title: 'Action failed',
  description: error.message || 'Please try again',
  variant: 'error'
})
```

**Variants:** `success`, `error`, `warning`, `default`

---

### 1.1 ContactsPage.jsx

**File:** `frontend/src/pages/ContactsPage.jsx`

**Operations to add toast:**

- [ ] **Create contact** (in CreateContactModal)
  - Location: `frontend/src/components/CreateContactModal.jsx`
  - Find: Success Alert around line 154-156
  - Replace Alert with toast, keep modal close behavior
  - Success: `"Contact created"` / `"${name} added to contacts"`
  - Error: `"Failed to create contact"` / `error.message`

- [ ] **Delete contact** (row action)
  - Location: `ContactsPage.jsx` line 294-296 (currently just console.log!)
  - Add actual delete API call with toast
  - Success: `"Contact deleted"`
  - Error: `"Failed to delete contact"`

- [ ] **Import CSV** (after completion)
  - Location: `frontend/src/components/CSVImportModal.jsx`
  - After `onImportComplete` callback, add toast
  - Success: `"${count} contacts imported"`
  - Partial: `"${imported} imported, ${failed} failed"` (warning variant)

- [ ] **Export CSV**
  - Location: `ContactsPage.jsx` - find `handleExportCSV` function
  - Success: `"Contacts exported"`
  - Error: `"Export failed"`

- [ ] **Fetch error** (optional enhancement)
  - Location: `fetchContacts()` catch block
  - Error: `"Failed to load contacts"`

---

### 1.2 CampaignsPage.jsx

**File:** `frontend/src/pages/CampaignsPage.jsx`

**Operations to add toast:**

- [ ] **Add toast import**
  - Add `toast` to imports from `'../components/ui'`

- [ ] **Bulk archive**
  - Location: `confirmBulkArchive()` function around line 144-164
  - After successful archive, add toast
  - Success: `"${count} campaigns archived"`
  - Error: `"Failed to archive campaigns"` / `error.message`

- [ ] **Delete campaign** (if exists)
  - Find delete handler, add toast
  - Success: `"Campaign deleted"`
  - Error: `"Failed to delete campaign"`

- [ ] **Send campaign** (if inline)
  - Find send handler
  - Success: `"Campaign sent"` or `"Campaign queued"`
  - Error: `"Failed to send campaign"`

---

### 1.3 TemplatesPage.jsx

**File:** `frontend/src/pages/TemplatesPage.jsx`

**Operations to add toast:**

- [ ] **Add toast import**
  - Add `toast` to imports from `'../components/ui'`

- [ ] **Delete template**
  - Location: `handleDelete()` around line 98-135
  - Success: `"Template deleted"`
  - Error: `"Failed to delete template"`

- [ ] **Create version**
  - Location: `handleVersion()` around line 137-176
  - Success: `"Version created, redirecting..."` (before navigate)
  - Error: `"Failed to create version"`

- [ ] **Sync templates** (if on this page)
  - Success: `"${count} templates synced"`
  - Error: `"Sync failed"`

---

### 1.4 SettingsPage.jsx

**File:** `frontend/src/pages/SettingsPage.jsx`

**This page has 9+ operations using Alert - convert ALL to toast:**

- [ ] **Add toast import**
  - Add `toast` to imports

- [ ] **WhatsApp connect**
  - Location: `handleWhatsAppConnect()` around line 375
  - Replace `setSuccessMessage`/Alert with toast
  - Success: `"WhatsApp connected"`
  - Error: `"Failed to connect WhatsApp"`

- [ ] **WhatsApp disconnect**
  - Location: `handleWhatsAppDisconnect()` around line 422
  - Success: `"WhatsApp disconnected"`
  - Error: `"Failed to disconnect"`

- [ ] **Email connect**
  - Location: `handleEmailConnect()` around line 492
  - Success: `"Email provider connected"`
  - Error: `"Failed to connect email"`

- [ ] **Email disconnect**
  - Location: `handleEmailDisconnect()` around line 538
  - Success: `"Email disconnected"`
  - Error: `"Failed to disconnect"`

- [ ] **SMS save**
  - Location: `handleSaveSmsSettings()` around line 250
  - Success: `"SMS settings saved"`
  - Error: `"Failed to save SMS settings"`

- [ ] **Template sync**
  - Location: `handleSyncTemplates()` around line 645
  - Success: `"${count} templates synced from Meta"`
  - Error: `"Template sync failed"`

- [ ] **Webhook test**
  - Location: `handleTestWebhook()` around line 284
  - Success: `"Webhook test passed"`
  - Error: `"Webhook test failed"`

- [ ] **WhatsApp validation**
  - Location: `handleValidateWhatsApp()` around line 315
  - Success: `"Credentials valid"`
  - Error: `"Invalid credentials"`

- [ ] **Email health check**
  - Location: `handleEmailHealth()` around line 602
  - Success: `"Email credentials verified"`
  - Error: `"Health check failed: ${details}"`

- [ ] **Remove Alert components** for success/error messages
  - Find and remove `{successMessage && <Alert>...}` patterns
  - Remove associated `setSuccessMessage` / `setTimeout` cleanup

---

### 1.5 TeamPage.jsx

**File:** `frontend/src/pages/TeamPage.jsx`

- [ ] **Add toast import**

- [ ] **Invite member**
  - Success: `"Invitation sent to ${email}"`
  - Error: `"Failed to send invitation"`

- [ ] **Remove member**
  - Success: `"Member removed"`
  - Error: `"Failed to remove member"`

- [ ] **Update role**
  - Success: `"Role updated to ${role}"`
  - Error: `"Failed to update role"`

---

### 1.6 TagsPage.jsx

**File:** `frontend/src/pages/TagsPage.jsx`

- [ ] **Add toast import**

- [ ] **Create tag**
  - Success: `"Tag created"`
  - Error: `"Failed to create tag"`

- [ ] **Update tag**
  - Success: `"Tag updated"`
  - Error: `"Failed to update tag"`

- [ ] **Archive tag**
  - Success: `"Tag archived"`
  - Error: `"Failed to archive tag"`

---

### 1.7 ProfilePage.jsx

**File:** `frontend/src/pages/ProfilePage.jsx`

- [ ] **Add toast import**

- [ ] **Update profile**
  - Success: `"Profile updated"`
  - Error: `"Failed to update profile"`

- [ ] **Change password**
  - Success: `"Password changed"`
  - Error: `"Failed to change password"`

---

### 1.8 CreateCampaignPage.jsx

**File:** `frontend/src/pages/CreateCampaignPage.jsx`

- [ ] **Add toast import**

- [ ] **Save draft**
  - Success: `"Draft saved"`
  - Error: `"Failed to save draft"`

- [ ] **Send campaign**
  - Success: `"Campaign sent to ${count} contacts"`
  - Error: `"Failed to send campaign"`

---

### 1.9 CreateTemplatePage.jsx

**File:** `frontend/src/pages/CreateTemplatePage.jsx`

- [ ] **Add toast import**

- [ ] **Create template**
  - Success: `"Template created"`
  - Error: `"Failed to create template"`

---

### 1.10 Admin Pages

**Files in `frontend/src/pages/admin/`:**

- [ ] **AdminUsersPage.jsx**
  - Update role: `"Role updated"`
  - Activate/deactivate: `"User ${action}d"`

- [ ] **AdminTagsPage.jsx**
  - Create/update/sync operations

- [ ] **TenantDetailPage.jsx**
  - Status update: `"Tenant status updated"`
  - Sync tags: `"Tags synced"`

---

## Phase 2: DataTable Migration

### DataTable Pattern Reference

```jsx
import { DataTable } from '../components/ui'
import { ArrowUpDown, Eye, Edit, Trash2 } from 'lucide-react'

// Sortable header helper
const sortHeader = (label) => ({ column }) => (
  <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] hover:bg-transparent px-0"
  >
    {label}
    <ArrowUpDown className="ml-1 h-4 w-4" />
  </Button>
)

// Column definitions
const columns = useMemo(() => [
  {
    accessorKey: 'name',
    header: sortHeader('Name'),
    cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
  },
  {
    accessorKey: 'status',
    header: sortHeader('Status'),
    cell: ({ row }) => <Badge>{row.original.status}</Badge>
  },
  {
    accessorKey: 'created_at',
    header: sortHeader('Created'),
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
  }
], [/* dependencies */])

// Row actions
const rowActions = useMemo(() => (row) => [
  { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/item/${row.id}`) },
  { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => handleEdit(row) },
  { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, variant: 'destructive', onClick: () => handleDelete(row) }
], [navigate])

// Render
<DataTable
  columns={columns}
  data={items}
  title="Items"
  description="Manage your items"
  searchPlaceholder="Filter items..."
  loading={loading}
  loadingMessage="Loading items..."
  emptyIcon={Package}
  emptyTitle="No items"
  emptyDescription="Create your first item to get started."
  rowActions={rowActions}
/>
```

---

### 2.1 CampaignsPage.jsx (P0 - High Priority)

**File:** `frontend/src/pages/CampaignsPage.jsx`

**Current:** Basic table with manual pagination (lines 310-376)

**Migration steps:**

- [ ] **Import DataTable**
  - Add to imports: `DataTable` from `'../components/ui'`
  - Add icons: `ArrowUpDown, Eye, Edit, Trash2, Send` from `'lucide-react'`

- [ ] **Create sortHeader helper**
  - Copy pattern from reference above

- [ ] **Define columns with useMemo**
  - [ ] Name column (sortable)
  - [ ] Status column with Badge (sortable)
  - [ ] Channel column (sortable)
  - [ ] Recipients count column
  - [ ] Sent/Delivered/Read stats columns
  - [ ] Created date column (sortable)

- [ ] **Define rowActions with useMemo**
  - [ ] View: navigate to `/campaigns/${id}`
  - [ ] Edit: navigate to `/campaigns/${id}/edit` (if draft)
  - [ ] Send: trigger send (if draft)
  - [ ] Archive: trigger archive
  - [ ] Delete: trigger delete (destructive)

- [ ] **Replace table JSX with DataTable**
  ```jsx
  <DataTable
    columns={columns}
    data={campaigns}
    title="Campaigns"
    description="View and manage your messaging campaigns"
    searchPlaceholder="Search campaigns..."
    loading={loading}
    emptyIcon={Megaphone}
    emptyTitle="No campaigns"
    emptyDescription="Create your first campaign to start engaging contacts."
    rowActions={rowActions}
  />
  ```

- [ ] **Remove old code**
  - Remove manual Table components
  - Remove manual pagination state/UI
  - Remove manual search input (DataTable has built-in)
  - Keep filter selects if needed (status, channel)

---

### 2.2 TemplatesPage.jsx (P0 - High Priority)

**File:** `frontend/src/pages/TemplatesPage.jsx`

**Current:** Basic table with manual filters (lines 331-407)

**Migration steps:**

- [ ] **Import DataTable and icons**

- [ ] **Create sortHeader helper**

- [ ] **Define columns**
  - [ ] Name column (sortable)
  - [ ] Channel column with icon (sortable)
  - [ ] Category column (sortable)
  - [ ] Language column
  - [ ] Status column with Badge
  - [ ] Last modified date (sortable)

- [ ] **Define rowActions**
  - [ ] View: navigate to `/templates/${id}`
  - [ ] Edit: navigate to `/templates/${id}/edit`
  - [ ] Create version: trigger version modal
  - [ ] Delete: trigger delete (destructive)

- [ ] **Replace table with DataTable**

- [ ] **Keep filter selects** (status, language, category) above DataTable if needed

---

### 2.3 TenantsPage.jsx (P1)

**File:** `frontend/src/pages/TenantsPage.jsx`

- [ ] **Import DataTable and icons**
- [ ] **Define columns** (name, plan, status, users count, created)
- [ ] **Define rowActions** (View, Edit, Switch to tenant)
- [ ] **Replace table with DataTable**

---

### 2.4 admin/AuditLogPage.jsx (P1)

**File:** `frontend/src/pages/admin/AuditLogPage.jsx`

- [ ] **Import DataTable and icons**
- [ ] **Define columns** (timestamp, user, action, resource, details)
- [ ] **Define rowActions** (View details)
- [ ] **Replace table with DataTable**

---

### 2.5 InvoicesPage.jsx (P2)

**File:** `frontend/src/pages/InvoicesPage.jsx`

- [ ] **Import DataTable and icons**
- [ ] **Define columns** (invoice #, date, amount, status, period)
- [ ] **Define rowActions** (View, Download PDF)
- [ ] **Replace table with DataTable**

---

### 2.6 TagsPage.jsx (P2)

**File:** `frontend/src/pages/TagsPage.jsx`

**Current:** Card grid layout
**Decision:** Migrate to DataTable for consistency

- [ ] **Import DataTable and icons**

- [ ] **Define columns**
  - [ ] Name column with color indicator (sortable)
  - [ ] Status column with Badge (active/archived)
  - [ ] Contacts count column (sortable)
  - [ ] Created date column (sortable)

- [ ] **Define rowActions**
  - [ ] Edit: open edit modal
  - [ ] Archive/Restore: toggle status
  - [ ] Delete: trigger delete (destructive)

- [ ] **Replace card grid with DataTable**

- [ ] **Consider:** Add color preview in name column cell

---

## Phase 3: Cleanup & Verification

- [ ] **Run linter** on all modified files
  ```bash
  cd frontend && npm run lint
  ```

- [ ] **Test each page manually**
  - [ ] ContactsPage: Create, delete, import, export
  - [ ] CampaignsPage: View, archive, send
  - [ ] TemplatesPage: View, delete, version
  - [ ] SettingsPage: All channel operations
  - [ ] TeamPage: Invite, remove, role change
  - [ ] Admin pages: All operations

- [ ] **Verify toast appears** for each operation

- [ ] **Verify DataTable features work**
  - [ ] Sorting (click headers)
  - [ ] Search (type in search box)
  - [ ] Pagination (change page, change page size)
  - [ ] Row actions (click 3-dot menu)

---

## Progress Tracking

### Phase 1 Summary
| Page | Status | Notes |
|------|--------|-------|
| ContactsPage | [ ] | 5 operations |
| CampaignsPage | [ ] | 3-4 operations |
| TemplatesPage | [ ] | 3 operations |
| SettingsPage | [ ] | 10 operations (most work) |
| TeamPage | [ ] | 3 operations |
| TagsPage | [ ] | 3 operations |
| ProfilePage | [ ] | 2 operations |
| CreateCampaignPage | [ ] | 2 operations |
| CreateTemplatePage | [ ] | 1 operation |
| Admin pages | [ ] | 5+ operations |

### Phase 2 Summary
| Page | Priority | Status | Notes |
|------|----------|--------|-------|
| CampaignsPage | P0 | [ ] | Most used page |
| TemplatesPage | P0 | [ ] | Frequent use |
| TenantsPage | P1 | [ ] | Admin workflow |
| AuditLogPage | P1 | [ ] | Compliance |
| InvoicesPage | P2 | [ ] | Billing |
| TagsPage | P2 | [ ] | Card grid → DataTable |

---

## Error Recovery

If something goes wrong:

1. **Toast not appearing:**
   - Check `<Toaster />` is in `main.jsx`
   - Check import is correct: `import { toast } from '../components/ui'`
   - Check variant is valid: `success`, `error`, `warning`, `default`

2. **DataTable not rendering:**
   - Check columns are wrapped in `useMemo`
   - Check data is an array (not undefined)
   - Check column `accessorKey` matches data properties

3. **Sorting not working:**
   - Ensure `sortHeader` helper is defined
   - Ensure column uses `header: sortHeader('Label')`

4. **Row actions not appearing:**
   - Check `rowActions` is passed to DataTable
   - Check it's either an array OR a function returning array
   - If function, wrap in `useMemo` with dependencies

---

## Files Reference

**Toast System:**
- `frontend/src/components/ui/toast/use-toast.js`
- `frontend/src/components/ui/toast/toast.jsx`
- `frontend/src/main.jsx` (Toaster setup)

**DataTable:**
- `frontend/src/components/DataTable.jsx`
- `frontend/src/pages/admin/AdminUsersPage.jsx` (reference implementation)
- `frontend/src/pages/ContactsPage.jsx` (correct DataTable usage)
- `frontend/src/pages/TeamPage.jsx` (correct DataTable usage)

**Pages to Modify (Phase 1 - Toast):**
- `frontend/src/pages/ContactsPage.jsx`
- `frontend/src/pages/CampaignsPage.jsx`
- `frontend/src/pages/TemplatesPage.jsx`
- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/pages/TeamPage.jsx`
- `frontend/src/pages/TagsPage.jsx`
- `frontend/src/pages/ProfilePage.jsx`
- `frontend/src/pages/CreateCampaignPage.jsx`
- `frontend/src/pages/CreateTemplatePage.jsx`
- `frontend/src/pages/admin/AdminUsersPage.jsx`
- `frontend/src/pages/admin/AdminTagsPage.jsx`
- `frontend/src/pages/admin/TenantDetailPage.jsx`
- `frontend/src/components/CreateContactModal.jsx`
- `frontend/src/components/CSVImportModal.jsx`

**Pages to Modify (Phase 2 - DataTable):**
- `frontend/src/pages/CampaignsPage.jsx`
- `frontend/src/pages/TemplatesPage.jsx`
- `frontend/src/pages/TenantsPage.jsx`
- `frontend/src/pages/admin/AuditLogPage.jsx`
- `frontend/src/pages/InvoicesPage.jsx`
- `frontend/src/pages/TagsPage.jsx`

---

*Plan created: December 26, 2025*
*Reference: docs/UI_UX_CONSISTENCY_REPORT.md (Issues #27, #28)*
