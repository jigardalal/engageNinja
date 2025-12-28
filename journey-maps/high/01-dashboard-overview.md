# Journey: Dashboard Overview & Quick Actions

**Priority:** High
**User Type:** Authenticated user (any role)
**Frequency:** Daily (first page after login)
**Business Impact:** Platform entry point, drives engagement, encourages key actions
**Preconditions:** User is authenticated, has active tenant selected

## Overview
The dashboard is the primary landing page showing key metrics, recent activity, and quick action CTAs. It surfaces important information and encourages users toward high-value actions (creating campaigns, adding contacts, upgrading plan).

## Steps

### 1. Land on Dashboard
- **From:** Login redirect or navigation click
- **Action:** Automatic redirect or click "Dashboard" nav item
- **Selectors:**
  - Primary: `[data-testid="nav-dashboard"]`
  - Fallback: `a:has-text("Dashboard")`
  - Recommendation: Add `data-testid="nav-dashboard"`
- **Expected Result:** Dashboard page loads
- **Assertions:**
  - Page URL is `/dashboard`
  - Dashboard container visible
  - Stats cards are present
  - Welcome message shows (for new users)

### 2. View Dashboard Stats
- **From:** Dashboard page
- **Action:** Page automatically displays key metrics
- **Selectors:**
  - Primary: `[data-testid="stat-contacts-total"]`
  - Fallback: `div.stats-container`
  - Recommendation: Add data-testid to each stat card
- **Expected Result:** Stats display with current values
- **Assertions:**
  - Contacts total shows correct count
  - Campaigns total shows correct count
  - Active sending count displays
  - Read rate percentage shows (if campaigns sent)

### 3. View Recent Campaigns
- **From:** Dashboard page
- **Action:** Scroll to recent campaigns section
- **Selectors:**
  - Primary: `[data-testid="recent-campaigns-list"]`
  - Fallback: `div.recent-campaigns`
  - Recommendation: Add `data-testid="recent-campaigns-list"`
- **Expected Result:** List of recent campaigns displays
- **Assertions:**
  - Recent campaigns appear in order (newest first)
  - Each campaign shows name, status, send date
  - Campaign click navigates to detail page
  - "View All" link visible if more than 5

### 4. View Plan Context Card
- **From:** Dashboard page
- **Action:** Review current plan information
- **Selectors:**
  - Primary: `[data-testid="plan-context-card"]`
  - Fallback: `div.plan-info`
  - Recommendation: Add `data-testid="plan-context-card"`
- **Expected Result:** Plan information displays
- **Assertions:**
  - Current plan name shows
  - Monthly usage displays
  - Quota remaining shows
  - Upgrade button visible (if not on highest plan)

### 5. View Welcome Carousel (New Users)
- **From:** Dashboard page (first-time users only)
- **Action:** Page displays onboarding carousel
- **Selectors:**
  - Primary: `[data-testid="welcome-carousel"]`
  - Fallback: `div.carousel`
  - Recommendation: Add `data-testid="welcome-carousel"`
- **Expected Result:** 3-step carousel displays
- **Assertions:**
  - Step 1: Platform features introduction
  - Step 2: Create first campaign instructions
  - Step 3: Pricing and upgrade information
  - Next/Previous buttons work
  - Skip button available

### 6. Click "Create Campaign" CTA
- **From:** Dashboard page
- **Action:** Click primary CTA to create campaign
- **Selectors:**
  - Primary: `[data-testid="dashboard-create-campaign"]`
  - Fallback: `button:has-text("Create Campaign")`
  - Recommendation: Add `data-testid="dashboard-create-campaign"`
- **Expected Result:** Navigates to campaign creation page
- **Assertions:**
  - URL changes to `/campaigns/new`
  - Campaign creation form loads

### 7. Click "View Contacts" CTA
- **From:** Dashboard page
- **Action:** Click CTA to view/manage contacts
- **Selectors:**
  - Primary: `[data-testid="dashboard-view-contacts"]`
  - Fallback: `button:has-text("View Contacts")`
  - Recommendation: Add `data-testid="dashboard-view-contacts"`
- **Expected Result:** Navigates to contacts page
- **Assertions:**
  - URL changes to `/contacts`
  - Contacts list loads

### 8. Click "Upgrade Plan" CTA (if applicable)
- **From:** Dashboard page
- **Action:** Click upgrade CTA from plan context card
- **Selectors:**
  - Primary: `[data-testid="dashboard-upgrade-plan"]`
  - Fallback: `button:has-text("Upgrade")`
  - Recommendation: Add `data-testid="dashboard-upgrade-plan"`
- **Expected Result:** Navigates to billing upgrade flow
- **Assertions:**
  - URL changes to settings/billing
  - Upgrade options display

### 9. Dismiss Welcome Carousel (New Users)
- **From:** Dashboard page
- **Action:** Click "Skip" or "Close" on carousel
- **Selectors:**
  - Primary: `[data-testid="carousel-skip"]`
  - Fallback: `button:has-text("Skip")`
  - Recommendation: Add `data-testid="carousel-skip"`
- **Expected Result:** Carousel closes and is marked as seen
- **Assertions:**
  - Carousel disappears
  - State saved (doesn't reappear on refresh)

## Success Outcome
- User sees current status and key metrics
- Dashboard drives user to high-value actions
- New users understand platform capabilities
- User is engaged and ready to use platform

## Alternative Paths

### Path 1: Returning User (Dashboard Only)
- **Trigger:** User with previous activity
- **Outcome:** No welcome carousel, shows recent activity
- **Steps:** Steps 1-4, 6-7

### Path 2: First-Time User (With Onboarding)
- **Trigger:** New user within first 24 hours
- **Outcome:** Welcome carousel displays prominently
- **Steps:** All steps 1-9

### Path 3: Trial About to Expire
- **Trigger:** Trial user with <7 days left
- **Outcome:** Urgent upgrade banner displays
- **Steps:** All steps + urgent CTA

## Error Cases

### Error 1: Data Not Loading
- **Trigger:** Backend stats endpoint times out
- **Expected Behavior:** Skeleton loaders show, retry available
- **Selector:** `[data-testid="dashboard-loading-error"]`
- **Error Message:** "Unable to load dashboard. Retrying..."
- **Recovery:** Auto-retry after 3 seconds or click refresh

### Error 2: Stats Inconsistent
- **Trigger:** Backend returns inconsistent data
- **Expected Behavior:** Timestamp shown, "last updated" label
- **Selector:** `[data-testid="stats-last-updated"]`
- **Error Message:** "Stats last updated 5 minutes ago"
- **Recovery:** Manual refresh available

### Error 3: Insufficient Permissions
- **Trigger:** User's role changed and lost access to dashboard
- **Expected Behavior:** Dashboard shows limited view
- **Selector:** `[data-testid="dashboard-permission-error"]`
- **Error Message:** "You don't have permission to view this dashboard"
- **Recovery:** User contacts workspace admin

### Error 4: Session Expired
- **Trigger:** User's session expires while on dashboard
- **Expected Behavior:** Redirect to login
- **Selector:** N/A (redirect)
- **Error Message:** N/A
- **Recovery:** User logs in again

## Selector Improvements Needed
- Dashboard nav: Add `data-testid="nav-dashboard"`
- Stats container: Add `data-testid="stat-{metric}-{tenantId}"` for each metric
- Recent campaigns: Add `data-testid="recent-campaigns-list"`
- Recent campaign row: Add `data-testid="campaign-row-{campaignId}"`
- Plan card: Add `data-testid="plan-context-card"`
- Create campaign button: Add `data-testid="dashboard-create-campaign"`
- View contacts button: Add `data-testid="dashboard-view-contacts"`
- Upgrade button: Add `data-testid="dashboard-upgrade-plan"`
- Welcome carousel: Add `data-testid="welcome-carousel"`
- Carousel skip: Add `data-testid="carousel-skip"`
- Dashboard error: Add `data-testid="dashboard-error"`

## Test Data Requirements
- New user account (no campaigns or contacts)
- Active user with multiple campaigns
- User at quota limit
- User with trial expiring soon
- User on each plan tier (Free, Starter, Growth, Pro, Enterprise)
- User with admin vs. member role
- Tenant with 0, 1, 10, 100+ contacts
- Tenant with 0, 1, 10, 100+ campaigns
