# Journey: View Campaign Detail & Message Tracking

**Priority:** High
**User Type:** Authenticated user (member or admin)
**Frequency:** Multiple times per session (track active campaigns)
**Business Impact:** Campaign analytics and ROI measurement
**Preconditions:** User is authenticated, campaign exists

## Overview
Users view campaign details, track real-time message status, view analytics, and monitor delivery progress. This is critical for understanding campaign performance and troubleshooting issues.

## Steps

### 1. Navigate to Campaigns
- **From:** Dashboard or sidebar
- **Action:** Click "Campaigns" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-campaigns"]`
  - Fallback: `a:has-text("Campaigns")`
- **Expected Result:** Campaigns list page loads
- **Assertions:**
  - Page URL is `/campaigns`
  - Campaign list displays

### 2. Locate Campaign
- **From:** Campaigns list
- **Action:** Search or scroll to find campaign
- **Selectors:**
  - Primary: `[data-testid="campaigns-search"]`
  - Fallback: `input[placeholder*="Search"]`
- **Input Data:** `{searchTerm: "Summer Sale"}`
- **Expected Result:** Campaigns filtered
- **Assertions:**
  - Search results show matching campaigns
  - Target campaign visible

### 3. Click Campaign to View Details
- **From:** Campaigns list
- **Action:** Click on campaign row or name
- **Selectors:**
  - Primary: `[data-testid="campaign-row-{campaignId}"]`
  - Fallback: `tr:has-text("{campaignName}")`
- **Expected Result:** Campaign detail page opens
- **Assertions:**
  - URL changes to `/campaigns/{id}`
  - Campaign details load
  - Status and metrics display

### 4. View Campaign Overview
- **From:** Campaign detail page
- **Action:** Review campaign header and summary
- **Selectors:**
  - Primary: `[data-testid="campaign-detail-header"]`
  - Fallback: `div.campaign-header`
- **Expected Result:** Campaign information displays
- **Assertions:**
  - Campaign name shows
  - Status badge displays (Sending, Sent, Draft, Scheduled)
  - Send date/time shows
  - Total recipients count shows
  - Campaign type shows (WhatsApp/Email)

### 5. View Campaign Stats
- **From:** Campaign detail page
- **Action:** Review key metrics
- **Selectors:**
  - Primary: `[data-testid="campaign-stats"]`
  - Fallback: `div.stats-container`
- **Expected Result:** Campaign statistics display
- **Assertions:**
  - Sent count shows
  - Delivered count shows
  - Read count shows
  - Failed count shows
  - Delivery rate percentage shows
  - Read rate percentage shows

### 6. View Message Preview
- **From:** Campaign detail page
- **Action:** View the message that was/will be sent
- **Selectors:**
  - Primary: `[data-testid="campaign-preview"]`
  - Fallback: `div.message-preview`
- **Expected Result:** Message content displays
- **Assertions:**
  - Message text shows as it was sent
  - Personalization variables shown
  - Channel-appropriate formatting displays (WhatsApp bubble, Email layout)

### 7. View Message Status Table
- **From:** Campaign detail page
- **Action:** Scroll to message status details
- **Selectors:**
  - Primary: `[data-testid="message-status-table"]`
  - Fallback: `table.messages`
- **Expected Result:** Message table displays
- **Assertions:**
  - Each recipient listed
  - Status shows for each message (Sent, Delivered, Read, Failed)
  - Delivery time shows (if delivered)
  - Error reason shows (if failed)

### 8. Filter Messages by Status
- **From:** Message status table
- **Action:** Click status filter to show only specific status
- **Selectors:**
  - Primary: `[data-testid="status-filter-{status}"]`
  - Fallback: `button:has-text("{status}")`
- **Input Data:** `{statusFilter: "failed"}`
- **Expected Result:** Table filters to show only selected status
- **Assertions:**
  - Only messages with selected status display
  - Filter button shows active state
  - Message count updates

### 9. View Recipient Details
- **From:** Message status table
- **Action:** Click on recipient row to see details
- **Selectors:**
  - Primary: `[data-testid="message-row-{messageId}"]`
  - Fallback: `tr.message-row`
- **Expected Result:** Recipient details expand or modal opens
- **Assertions:**
  - Recipient phone/email displays
  - Full status timeline shows
  - Delivery timestamp shows
  - Read timestamp shows (if applicable)

### 10. View Campaign Analytics (if available)
- **From:** Campaign detail page
- **Action:** View analytics section
- **Selectors:**
  - Primary: `[data-testid="campaign-analytics"]`
  - Fallback: `div.analytics-section`
- **Expected Result:** Analytics charts/data display
- **Assertions:**
  - Delivery over time graph shows (if applicable)
  - Engagement metrics display
  - Response rate shows (if tracking responses)

### 11. Retry Failed Messages (if applicable)
- **From:** Campaign detail page
- **Action:** Click "Retry Failed" button
- **Selectors:**
  - Primary: `[data-testid="retry-failed-button"]`
  - Fallback: `button:has-text("Retry Failed")`
- **Expected Result:** Retry process starts
- **Assertions:**
  - Confirmation dialog appears
  - Retry button shows loading state
  - Status updates after retry

### 12. Export Campaign Data
- **From:** Campaign detail page
- **Action:** Click export button to download data
- **Selectors:**
  - Primary: `[data-testid="export-campaign-button"]`
  - Fallback: `button:has-text("Export")`
- **Expected Result:** Export options appear or download starts
- **Assertions:**
  - Export dialog or download trigger
  - File format options (CSV, JSON)
  - Download initiates

## Success Outcome
- User has complete visibility into campaign performance
- User can identify delivery issues and failures
- User can take corrective actions (retry, resend)
- Real-time status updates visible

## Alternative Paths

### Path 1: Active Campaign (Real-Time Updates)
- **Trigger:** Campaign still actively sending
- **Outcome:** Real-time SSE updates show new messages arriving
- **Steps:** Same as main flow, but with live updates

### Path 2: Completed Campaign
- **Trigger:** Campaign completed sending
- **Outcome:** Final metrics display, no changes expected
- **Steps:** Same main flow, read-only

### Path 3: Draft Campaign
- **Trigger:** Campaign not yet sent
- **Outcome:** Edit and send options available
- **Steps:** Different - shows edit/send/delete actions

## Error Cases

### Error 1: Campaign Not Found
- **Trigger:** Campaign ID doesn't exist or user doesn't have access
- **Expected Behavior:** 404 error or access denied message
- **Error Message:** "Campaign not found"
- **Recovery:** User returns to campaigns list

### Error 2: Real-Time Updates Fail
- **Trigger:** SSE connection drops during viewing
- **Expected Behavior:** Graceful fallback, manual refresh available
- **Error Message:** "Live updates paused. Click to refresh"
- **Recovery:** User clicks refresh button

### Error 3: Export Fails
- **Trigger:** Backend export fails
- **Expected Behavior:** Error message, retry available
- **Error Message:** "Failed to export campaign. Please try again"
- **Recovery:** User retries export

### Error 4: Network Error
- **Trigger:** Network connection lost
- **Expected Behavior:** Data already loaded, manual refresh available
- **Error Message:** "Connection lost. Pull to refresh"
- **Recovery:** User refreshes page

### Error 5: Access Denied
- **Trigger:** User's role changed and lost view access
- **Expected Behavior:** Access denied message
- **Error Message:** "You don't have permission to view this campaign"
- **Recovery:** User contacts admin

## Selector Improvements Needed
- Campaigns nav: Add `data-testid="nav-campaigns"`
- Campaigns search: Add `data-testid="campaigns-search"`
- Campaign row: Add `data-testid="campaign-row-{campaignId}"`
- Detail header: Add `data-testid="campaign-detail-header"`
- Campaign stats: Add `data-testid="campaign-stats"`
- Message preview: Add `data-testid="campaign-preview"`
- Status table: Add `data-testid="message-status-table"`
- Status filters: Add `data-testid="status-filter-{status}"`
- Message rows: Add `data-testid="message-row-{messageId}"`
- Analytics section: Add `data-testid="campaign-analytics"`
- Retry button: Add `data-testid="retry-failed-button"`
- Export button: Add `data-testid="export-campaign-button"`

## Test Data Requirements
- Active campaign (still sending)
- Completed campaign (all delivered)
- Campaign with mixed statuses (sent, delivered, failed)
- Campaign with 100+ messages
- Campaign with no failed messages
- Campaign with 20%+ failed messages
- WhatsApp campaign
- Email campaign
- Campaign by different user (permission testing)
