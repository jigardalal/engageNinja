# Journey: View Analytics & Usage Dashboard

**Priority:** High
**User Type:** Authenticated admin user
**Frequency:** Weekly (regular business reviews)
**Business Impact:** Business intelligence, ROI tracking
**Preconditions:** User is authenticated, has admin role, campaigns exist

## Overview
Admins view usage analytics, campaign performance trends, and usage metrics. This enables data-driven decision making and helps identify optimization opportunities.

## Steps

### 1. Navigate to Usage/Analytics
- **From:** Navigation or settings
- **Action:** Click "Usage" or "Analytics" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-analytics"]` or `[data-testid="nav-usage"]`
  - Fallback: `a:has-text("Usage")` or `a:has-text("Analytics")`
- **Expected Result:** Analytics/Usage page loads
- **Assertions:**
  - Page URL is `/usage` or `/analytics`
  - Analytics dashboard displays

### 2. View Current Usage Summary
- **From:** Analytics page
- **Action:** Review month-to-date usage
- **Selectors:**
  - Primary: `[data-testid="usage-summary"]`
  - Fallback: `div.usage-summary`
- **Expected Result:** Usage metrics display
- **Assertions:**
  - WhatsApp messages sent this month
  - Email messages sent this month
  - Contacts used this month
  - Percentage of quota used shows

### 3. View Usage Charts
- **From:** Analytics page
- **Action:** Review usage trends over time
- **Selectors:**
  - Primary: `[data-testid="usage-chart"]`
  - Fallback: `canvas` or `svg.chart`
- **Expected Result:** Charts display usage trends
- **Assertions:**
  - Daily/weekly trend line appears
  - Multiple channels shown (WhatsApp, Email)
  - Legend shows what each line represents
  - Hovering shows data point values

### 4. View Campaign Performance
- **From:** Analytics page
- **Action:** Review campaign-level metrics
- **Selectors:**
  - Primary: `[data-testid="campaign-performance-table"]`
  - Fallback: `table.campaigns`
- **Expected Result:** Campaign list with metrics displays
- **Assertions:**
  - Each campaign shows delivery rate
  - Each campaign shows read rate
  - Each campaign shows ROI (if tracked)
  - Sortable by metric

### 5. Filter by Date Range
- **From:** Analytics page
- **Action:** Select date range for analysis
- **Selectors:**
  - Primary: `[data-testid="date-range-picker"]`
  - Fallback: `input[type="date"]`
- **Input Data:** `{startDate: "2024-01-01", endDate: "2024-01-31"}`
- **Expected Result:** Charts and data update
- **Assertions:**
  - Date inputs show selected dates
  - Charts update with new date range
  - Metrics recalculate

### 6. View Channel Breakdown
- **From:** Analytics page
- **Action:** See performance by channel (WhatsApp vs Email)
- **Selectors:**
  - Primary: `[data-testid="channel-breakdown"]`
  - Fallback: `div.channel-stats`
- **Expected Result:** Channel-specific metrics display
- **Assertions:**
  - WhatsApp metrics separate
  - Email metrics separate
  - Comparison available
  - Volume and performance shown

### 7. Download Analytics Report
- **From:** Analytics page
- **Action:** Export analytics data
- **Selectors:**
  - Primary: `[data-testid="download-analytics-button"]`
  - Fallback: `button:has-text("Download")`
- **Expected Result:** Download options appear
- **Assertions:**
  - Format options shown (CSV, PDF, Excel)
  - Download initiates

### 8. View Usage Projection
- **From:** Analytics page
- **Action:** See projected usage if current trend continues
- **Selectors:**
  - Primary: `[data-testid="usage-projection"]`
  - Fallback: `div.projection`
- **Expected Result:** Projection displays
- **Assertions:**
  - End-of-month projection shows
  - Warning if will exceed quota
  - Suggestion to upgrade if needed

### 9. Compare with Previous Period
- **From:** Analytics page
- **Action:** Toggle to compare metrics with previous period
- **Selectors:**
  - Primary: `[data-testid="compare-period-toggle"]`
  - Fallback: `button:has-text("Compare")`
- **Expected Result:** Comparison view enables
- **Assertions:**
  - Previous period data shows
  - Percentage change indicators appear
  - Trend arrows show up/down

## Success Outcome
- Admin has clear visibility into platform usage
- Performance trends are visible
- Quota utilization is understood
- Data-driven decisions can be made

## Error Cases

### Error 1: Data Not Loading
- **Trigger:** Analytics backend slow to respond
- **Expected Behavior:** Loading spinner, retry available
- **Error Message:** "Loading analytics..."
- **Recovery:** Auto-retry or user clicks refresh

### Error 2: Insufficient Data
- **Trigger:** No campaigns in selected date range
- **Expected Behavior:** Empty state with helpful message
- **Error Message:** "No campaigns in this period"
- **Recovery:** User changes date range

### Error 3: Export Failed
- **Trigger:** Report generation fails
- **Expected Behavior:** Error message, retry available
- **Error Message:** "Failed to generate report"
- **Recovery:** User retries

## Selector Improvements Needed
- Analytics nav: Add `data-testid="nav-analytics"` or `data-testid="nav-usage"`
- Usage summary: Add `data-testid="usage-summary"`
- Charts: Add `data-testid="usage-chart"`
- Campaign table: Add `data-testid="campaign-performance-table"`
- Date picker: Add `data-testid="date-range-picker"`
- Channel breakdown: Add `data-testid="channel-breakdown"`
- Download button: Add `data-testid="download-analytics-button"`
- Projection: Add `data-testid="usage-projection"`
- Compare toggle: Add `data-testid="compare-period-toggle"`

## Test Data Requirements
- Multiple campaigns with delivery history
- WhatsApp and Email campaign data
- Data spanning multiple months
- High-volume usage days
- Low-volume usage days
- Different plan tiers with different quotas
