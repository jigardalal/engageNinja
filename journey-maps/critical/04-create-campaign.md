# Journey: Create Campaign

**Priority:** Critical
**User Type:** Authenticated user (member or admin)
**Frequency:** Multiple times per session (core feature)
**Business Impact:** Primary product feature - campaigns are core value delivery
**Preconditions:** User is authenticated, has active tenant, has at least 1 contact or can proceed without

## Overview
Campaign creation is the core business flow. Users create campaigns by selecting contacts, choosing a template or writing messages, selecting channels (WhatsApp/Email), and configuring delivery settings.

## Steps

### 1. Navigate to Campaigns Page
- **From:** Dashboard or navigation menu
- **Action:** Click "Campaigns" in sidebar or navigate to `/campaigns`
- **Selectors:**
  - Primary: `[data-testid="nav-campaigns"]`
  - Fallback: `a:has-text("Campaigns")`
  - Recommendation: Add `data-testid="nav-campaigns"`
- **Expected Result:** Campaigns list page loads
- **Assertions:**
  - Page URL is `/campaigns`
  - Campaign list is visible
  - "Create Campaign" button is visible

### 2. Start New Campaign
- **From:** Campaigns page
- **Action:** Click "Create Campaign" or "+ New Campaign" button
- **Selectors:**
  - Primary: `[data-testid="create-campaign-button"]`
  - Fallback: `button:has-text("Create Campaign")`
  - Recommendation: Add `data-testid="create-campaign-button"`
- **Expected Result:** Redirected to campaign creation form
- **Assertions:**
  - URL is `/campaigns/new`
  - Campaign creation form is visible with all sections

### 3. Enter Campaign Name
- **From:** Campaign creation page
- **Action:** Fill in campaign name field
- **Selectors:**
  - Primary: `[data-testid="campaign-name"]`
  - Fallback: `input[placeholder*="Campaign"]`
  - Recommendation: Add `data-testid="campaign-name"`
- **Input Data:** `{name: "Summer Sale 2024"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - Input value is "Summer Sale 2024"
  - Character count shows (if implemented)

### 4. Select Campaign Type/Channel
- **From:** Campaign creation page
- **Action:** Choose channel: WhatsApp or Email
- **Selectors:**
  - Primary: `[data-testid="campaign-channel-{channel}"]`
  - Fallback: `button:has-text("{channel}")`
  - Recommendation: Add `data-testid="campaign-channel-whatsapp"`, `data-testid="campaign-channel-email"`
- **Input Data:** `{channel: "whatsapp"}`
- **Expected Result:** Channel is selected, UI updates to show channel-specific options
- **Assertions:**
  - Selected channel shows active state
  - Appropriate templates and fields appear for channel

### 5. Select Recipients/Contacts
- **From:** Campaign creation page
- **Action:** Choose contacts to receive campaign
- **Options:**
  - a) Select specific contacts individually
  - b) Select contact group/tag
  - c) Select all contacts
- **Selectors:**
  - Primary: `[data-testid="campaign-contacts-selector"]`
  - Fallback: `button:has-text("Select Contacts")`
  - Recommendation: Add `data-testid="campaign-contacts-selector"`
- **Input Data:** `{contactIds: [1, 2, 3]}`
- **Expected Result:** Contacts are selected, count shown
- **Assertions:**
  - Contact count displays correctly
  - Selected contacts are highlighted or marked
  - Recipient preview shows

### 6. Select or Create Message Template
- **From:** Campaign creation page
- **Action:** Either:
  - a) Select existing template
  - b) Create new message inline
- **Selectors:**
  - Primary: `[data-testid="campaign-template-selector"]`
  - Fallback: `select[name="template"]`
  - Recommendation: Add `data-testid="campaign-template-selector"`, `data-testid="campaign-custom-message"`
- **Input Data:** `{templateId: 5}` or `{messageText: "Hello {{firstName}}..."}`
- **Expected Result:** Template is selected or message text appears
- **Assertions:**
  - Template preview shows if template selected
  - Message text displays for custom message
  - Personalization variables highlighted

### 7. Configure Delivery Settings
- **From:** Campaign creation page
- **Action:** Set delivery preferences
- **Options:**
  - Schedule delivery (date/time)
  - Send immediately
  - Recurring schedule (if applicable)
- **Selectors:**
  - Primary: `[data-testid="campaign-schedule-{type}"]`
  - Fallback: `input[type="datetime-local"]`
  - Recommendation: Add `data-testid="campaign-delivery-type"`, `data-testid="campaign-schedule-date"`
- **Input Data:** `{deliveryType: "immediate"}` or `{scheduledTime: "2024-06-15 10:00"}`
- **Expected Result:** Delivery settings are configured
- **Assertions:**
  - Selected delivery type shows active state
  - Date/time picker shows if scheduled

### 8. Preview Campaign
- **From:** Campaign creation page
- **Action:** Click "Preview" button to see what contacts will receive
- **Selectors:**
  - Primary: `[data-testid="campaign-preview"]`
  - Fallback: `button:has-text("Preview")`
  - Recommendation: Add `data-testid="campaign-preview"`
- **Expected Result:** Preview modal/panel shows message as recipients will see it
- **Assertions:**
  - Preview shows personalized message
  - Contact count displayed
  - Channel-appropriate formatting shown

### 9. Submit Campaign
- **From:** Campaign creation page
- **Action:** Click "Send" or "Schedule" button (depending on delivery type)
- **Selectors:**
  - Primary: `[data-testid="campaign-submit"]`
  - Fallback: `button:has-text("Send Campaign")`
  - Recommendation: Add `data-testid="campaign-submit"`
- **Expected Result:** Campaign submission starts, loading state appears
- **Assertions:**
  - Submit button shows loading state
  - Button is disabled

### 10. Campaign Created Successfully
- **From:** Campaign creation page (after submission)
- **Action:** Wait for backend processing
- **Expected Result:** Redirected to campaign detail page or campaigns list
- **Assertions:**
  - URL changes to `/campaigns/{campaignId}`
  - Campaign status shows (e.g., "Sending", "Scheduled", "Sent")
  - Campaign appears in campaigns list

## Success Outcome
- Campaign is created in database with status "queued" or "scheduled"
- Campaign detail page shows campaign configuration
- Messages begin sending (if immediate) or wait for scheduled time
- User can track campaign progress

## Error Cases

### Error 1: No Campaign Name
- **Trigger:** User tries to submit without entering campaign name
- **Expected Behavior:** Validation error
- **Error Message:** "Campaign name is required"
- **Recovery:** User enters campaign name

### Error 2: No Contacts Selected
- **Trigger:** User tries to submit without selecting any recipients
- **Expected Behavior:** Validation error
- **Error Message:** "Please select at least one contact"
- **Recovery:** User selects contacts

### Error 3: No Message/Template
- **Trigger:** User tries to submit without message or template
- **Expected Behavior:** Validation error
- **Error Message:** "Please select a template or write a message"
- **Recovery:** User selects template or enters message

### Error 4: Insufficient Quota
- **Trigger:** Campaign recipients exceed monthly quota for plan
- **Expected Behavior:** Blocking error with upgrade prompt
- **Error Message:** "This campaign would exceed your monthly message quota. Upgrade to send"
- **Recovery:** User upgrades plan or reduces recipients

### Error 5: No Contacts Available
- **Trigger:** User has no contacts in workspace
- **Expected Behavior:** Error or empty state, prompt to create contacts
- **Error Message:** "No contacts available. Add contacts to your workspace first"
- **Recovery:** User creates contacts or imports CSV

### Error 6: Network Error
- **Trigger:** Network fails during submission
- **Expected Behavior:** Error message, form state preserved
- **Error Message:** "Network error. Please check your connection and try again"
- **Recovery:** User retries

## Selector Improvements Needed
- Campaign name input: Add `data-testid="campaign-name"`
- Channel selector: Add `data-testid="campaign-channel-whatsapp"`, `data-testid="campaign-channel-email"`
- Contact selector: Add `data-testid="campaign-contacts-selector"`
- Template selector: Add `data-testid="campaign-template-selector"`
- Custom message input: Add `data-testid="campaign-custom-message"`
- Schedule type buttons: Add `data-testid="campaign-delivery-type"`
- Date/time input: Add `data-testid="campaign-schedule-date"`
- Preview button: Add `data-testid="campaign-preview"`
- Submit button: Add `data-testid="campaign-submit"`
- Error containers: Add `data-testid="campaign-error"`

## Test Data Requirements
- Campaign with 1, 10, 100+ contacts
- Campaign using existing template
- Campaign with custom message text
- Campaign with personalization variables
- Immediate send campaign
- Scheduled campaign
- User at quota limit
- User under quota limit
- User with no contacts
- WhatsApp and Email channels
