# Journey: Export Contacts & Campaign Data

**Priority:** Medium
**User Type:** Authenticated user (member or admin)
**Frequency:** Monthly (regular data backup/reporting)
**Business Impact:** Data portability and reporting
**Preconditions:** User is authenticated, has active tenant, data exists

## Overview
Users export contacts, campaigns, and messages to CSV or other formats for external analysis, backup, or reporting purposes.

## Steps

### 1. Navigate to Contacts Page
- **From:** Sidebar
- **Action:** Click "Contacts" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-contacts"]`
  - Fallback: `a:has-text("Contacts")`
- **Expected Result:** Contacts list loads
- **Assertions:**
  - Page URL is `/contacts`
  - Contacts table visible
  - Export button visible

### 2. Click Export Button
- **From:** Contacts page
- **Action:** Click "Export" or "Download"
- **Selectors:**
  - Primary: `[data-testid="export-contacts-button"]`
  - Fallback: `button:has-text("Export")`
- **Expected Result:** Export options modal appears
- **Assertions:**
  - Modal shows export format options
  - Filter options available (optional)

### 3. Select Export Format
- **From:** Export modal
- **Action:** Choose file format (CSV, Excel, JSON)
- **Selectors:**
  - Primary: `[data-testid="export-format-csv"]`
  - Fallback: `button:has-text("CSV")`
- **Input Data:** `{format: "csv"}`
- **Expected Result:** Format selected
- **Assertions:**
  - Selected format highlighted
  - Format-specific options appear

### 4. Select Data to Export (Optional)
- **From:** Export modal
- **Action:** Choose which fields to include
- **Selectors:**
  - Primary: `[data-testid="export-field-phone"]`
  - Fallback: `input[type="checkbox"]`
- **Input Data:** `{fields: ["phone", "email", "name", "tags"]}`
- **Expected Result:** Fields selected
- **Assertions:**
  - Checkboxes show selected fields
  - Preview shows which columns will export

### 5. Filter Data to Export (Optional)
- **From:** Export modal
- **Action:** Apply filters (e.g., only contacts with specific tag)
- **Selectors:**
  - Primary: `[data-testid="export-filter-tag"]`
  - Fallback: `select[name="filter"]`
- **Input Data:** `{filterBy: "tag", filterValue: "premium"}`
- **Expected Result:** Filters applied
- **Assertions:**
  - Filter shows applied
  - Preview updates with filtered data

### 6. Start Export
- **From:** Export modal
- **Action:** Click "Export" button
- **Selectors:**
  - Primary: `[data-testid="start-export-button"]`
  - Fallback: `button:has-text("Export")`
- **Expected Result:** Export begins
- **Assertions:**
  - Progress indicator appears
  - Export status shows (e.g., "Preparing 500 contacts...")

### 7. Download Exported File
- **From:** Export completion
- **Action:** Download the exported file
- **Selectors:**
  - Primary: `[data-testid="download-export-button"]`
  - Fallback: `a:has-text("Download")`
- **Expected Result:** File download initiates
- **Assertions:**
  - Download triggered in browser
  - File appears in downloads folder
  - File name includes timestamp/export type

### 8. Export Campaigns (Alternative Path)
- **From:** Campaigns page
- **Action:** Click export on campaigns
- **Selectors:**
  - Primary: `[data-testid="export-campaigns-button"]`
  - Fallback: `button:has-text("Export")`
- **Expected Result:** Campaign export options show
- **Assertions:**
  - Campaign-specific fields available
  - Same export flow as contacts

## Success Outcome
- Data exported in requested format
- File downloaded successfully
- Data can be imported into external systems
- Backup created

## Error Cases

### Error 1: Export Too Large
- **Trigger:** Export exceeds size limit
- **Error Message:** "Export too large. Please filter data or split export"
- **Recovery:** User applies filters or exports in batches

### Error 2: No Data to Export
- **Trigger:** Filter results in 0 records
- **Error Message:** "No data matches your filters"
- **Recovery:** User adjusts filters

### Error 3: Export Failed
- **Trigger:** Backend export process fails
- **Error Message:** "Export failed. Please try again"
- **Recovery:** User retries

### Error 4: Network Error
- **Trigger:** Network interrupted during download
- **Error Message:** "Download interrupted"
- **Recovery:** User retries download

## Selector Improvements Needed
- Export contacts button: Add `data-testid="export-contacts-button"`
- Export format options: Add `data-testid="export-format-{format}"`
- Field selectors: Add `data-testid="export-field-{field}"`
- Filter selector: Add `data-testid="export-filter-{filterType}"`
- Start export button: Add `data-testid="start-export-button"`
- Download button: Add `data-testid="download-export-button"`
- Export campaigns: Add `data-testid="export-campaigns-button"`

## Test Data Requirements
- 1, 100, 1000+ contacts to export
- Contacts with/without tags
- Different export formats
- Various field combinations
- Filtered vs. unfiltered exports
