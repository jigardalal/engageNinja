# Journey: Edit Campaign (Draft State)

**Priority:** High
**User Type:** Authenticated user (member or admin)
**Frequency:** Occasional (before campaign send)
**Business Impact:** Allows campaign refinement before sending
**Preconditions:** User is authenticated, campaign exists in draft state

## Overview
Users edit campaigns while in draft state before sending. This allows testing message content, adjusting recipients, or changing schedule before campaign goes live.

## Steps

### 1. Navigate to Campaigns
- **From:** Dashboard or sidebar
- **Action:** Click "Campaigns" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-campaigns"]`
  - Fallback: `a:has-text("Campaigns")`
- **Expected Result:** Campaigns list loads
- **Assertions:**
  - Page URL is `/campaigns`
  - Campaign list shows

### 2. Locate Draft Campaign
- **From:** Campaigns list
- **Action:** Find campaign with "Draft" status
- **Selectors:**
  - Primary: `[data-testid="campaign-status-draft"]`
  - Fallback: `span:has-text("Draft")`
- **Expected Result:** Draft campaigns visible
- **Assertions:**
  - Draft badge shows on campaigns
  - Edit action available on draft campaigns

### 3. Click Edit Button
- **From:** Campaign row
- **Action:** Click "Edit" or pencil icon
- **Selectors:**
  - Primary: `[data-testid="campaign-edit-{campaignId}"]`
  - Fallback: `button:has-text("Edit")`
- **Expected Result:** Campaign edit form opens
- **Assertions:**
  - URL changes to `/campaigns/{id}/edit`
  - Current campaign values pre-populated
  - All fields editable

### 4. Edit Campaign Name
- **From:** Campaign edit form
- **Action:** Modify campaign name
- **Selectors:**
  - Primary: `[data-testid="campaign-name"]`
  - Fallback: `input[name="name"]`
- **Input Data:** `{name: "Summer Sale - Updated"}`
- **Expected Result:** Field updates
- **Assertions:**
  - New name displays

### 5. Edit Message Content
- **From:** Campaign edit form
- **Action:** Modify message text or template
- **Selectors:**
  - Primary: `[data-testid="campaign-message"]`
  - Fallback: `textarea[name="message"]`
- **Input Data:** `{message: "Updated message text..."}`
- **Expected Result:** Message updates
- **Assertions:**
  - New text displays
  - Preview updates

### 6. Edit Recipients
- **From:** Campaign edit form
- **Action:** Modify which contacts receive campaign
- **Selectors:**
  - Primary: `[data-testid="campaign-recipients"]`
  - Fallback: `button:has-text("Contacts")`
- **Input Data:** `{recipients: [1, 2, 3, 4, 5]}`
- **Expected Result:** Recipients updated
- **Assertions:**
  - Recipient count updates
  - Preview shows new count

### 7. Modify Schedule
- **From:** Campaign edit form
- **Action:** Change send time (if scheduled)
- **Selectors:**
  - Primary: `[data-testid="campaign-schedule-date"]`
  - Fallback: `input[type="datetime-local"]`
- **Input Data:** `{scheduledTime: "2024-07-15 14:00"}`
- **Expected Result:** Schedule updates
- **Assertions:**
  - New date/time displays
  - Schedule shows in form

### 8. Preview Updated Campaign
- **From:** Campaign edit form
- **Action:** Click "Preview" to see changes
- **Selectors:**
  - Primary: `[data-testid="campaign-preview"]`
  - Fallback: `button:has-text("Preview")`
- **Expected Result:** Preview modal opens
- **Assertions:**
  - Updated message shows
  - Updated recipient count shows
  - New schedule shows

### 9. Save Draft Changes
- **From:** Campaign edit form
- **Action:** Click "Save Draft" to save without sending
- **Selectors:**
  - Primary: `[data-testid="campaign-save-draft"]`
  - Fallback: `button:has-text("Save")`
- **Expected Result:** Changes saved
- **Assertions:**
  - Success message shows
  - Redirects to campaign detail page
  - Changes persist when reopening campaign

### 10. Send Campaign or Schedule
- **From:** Campaign edit form
- **Action:** Click "Send Now" or "Schedule" to finalize
- **Selectors:**
  - Primary: `[data-testid="campaign-send"]`
  - Fallback: `button:has-text("Send")`
- **Expected Result:** Campaign sent/scheduled
- **Assertions:**
  - Status changes from Draft to Sending/Scheduled
  - Campaign can no longer be edited
  - Messages begin sending

## Success Outcome
- Campaign changes are saved
- Campaign can be sent after editing
- Draft state allows safe experimentation
- Changes persist

## Error Cases

### Error 1: No Changes Made
- **Trigger:** User clicks save without modifying anything
- **Expected Behavior:** Optional - no-op or confirmation
- **Error Message:** (Optional) "No changes to save"
- **Recovery:** User makes changes or closes form

### Error 2: Invalid Message
- **Trigger:** User removes all message content
- **Expected Behavior:** Validation error
- **Error Message:** "Message cannot be empty"
- **Recovery:** User enters message

### Error 3: No Recipients
- **Trigger:** User removes all recipients
- **Expected Behavior:** Validation error
- **Error Message:** "Please select at least one recipient"
- **Recovery:** User selects recipients

### Error 4: Network Error During Save
- **Trigger:** Network fails
- **Expected Behavior:** Error message, form preserved
- **Error Message:** "Failed to save changes"
- **Recovery:** User retries save

### Error 5: Campaign No Longer Draft
- **Trigger:** Campaign status changed (e.g., sent by another user)
- **Expected Behavior:** Error, redirect to view mode
- **Error Message:** "This campaign can no longer be edited"
- **Recovery:** User views campaign in read-only mode

## Selector Improvements Needed
- Campaigns nav: Add `data-testid="nav-campaigns"`
- Draft status badge: Add `data-testid="campaign-status-draft"`
- Edit button: Add `data-testid="campaign-edit-{campaignId}"`
- Campaign name: Add `data-testid="campaign-name"`
- Message input: Add `data-testid="campaign-message"`
- Recipients selector: Add `data-testid="campaign-recipients"`
- Schedule date: Add `data-testid="campaign-schedule-date"`
- Preview button: Add `data-testid="campaign-preview"`
- Save draft: Add `data-testid="campaign-save-draft"`
- Send button: Add `data-testid="campaign-send"`

## Test Data Requirements
- Draft campaign with 1-2 changes needed
- Draft campaign with all fields to edit
- Campaign with recipients to modify
- Campaign with schedule to adjust
- Campaign close to send time
