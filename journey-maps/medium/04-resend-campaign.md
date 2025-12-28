# Journey: Resend Campaign to Failed Recipients

**Priority:** Medium
**User Type:** Authenticated user (member or admin)
**Frequency:** Occasional (troubleshooting deliveries)
**Business Impact:** Message reliability and completeness
**Preconditions:** User is authenticated, campaign exists with failed messages

## Overview
Users resend campaigns to recipients where delivery failed or resend to new audiences. This is useful for troubleshooting and reaching additional contacts.

## Steps

### 1. Navigate to Campaign Detail
- **From:** Campaigns list
- **Action:** Click on completed campaign to view details
- **Selectors:**
  - Primary: `[data-testid="campaign-row-{campaignId}"]`
  - Fallback: `tr:has-text("{campaignName}")`
- **Expected Result:** Campaign detail page loads
- **Assertions:**
  - URL is `/campaigns/{id}`
  - Campaign details show
  - Stats display

### 2. Review Failed Messages
- **From:** Campaign detail page
- **Action:** Locate failed message section
- **Selectors:**
  - Primary: `[data-testid="failed-messages-section"]`
  - Fallback: `div.failed-messages`
- **Expected Result:** Failed messages display
- **Assertions:**
  - Failed count shows
  - Failed messages listed
  - Failure reasons visible

### 3. Click Resend Failed
- **From:** Campaign detail page
- **Action:** Click "Resend Failed" button
- **Selectors:**
  - Primary: `[data-testid="resend-failed-button"]`
  - Fallback: `button:has-text("Resend Failed")`
- **Expected Result:** Resend confirmation dialog opens
- **Assertions:**
  - Dialog shows number of failed messages
  - Confirms which contacts will receive resend
  - Resend button visible

### 4. Review Resend Summary
- **From:** Resend confirmation dialog
- **Action:** Review what will be resent
- **Selectors:**
  - Primary: `[data-testid="resend-summary"]`
  - Fallback: `div.summary`
- **Expected Result:** Summary displays
- **Assertions:**
  - Number of recipients shows
  - Message content shows
  - Resend time shows
  - Confirm button available

### 5. Confirm Resend
- **From:** Resend confirmation dialog
- **Action:** Click "Confirm" to proceed
- **Selectors:**
  - Primary: `[data-testid="confirm-resend"]`
  - Fallback: `button:has-text("Confirm")`
- **Expected Result:** Resend starts
- **Assertions:**
  - Dialog closes
  - Loading indicator appears
  - Progress shows

### 6. Monitor Resend Progress
- **From:** Campaign detail page (after resend)
- **Action:** Watch failed messages being resent
- **Selectors:**
  - Primary: `[data-testid="resend-progress"]`
  - Fallback: `div.progress`
- **Expected Result:** Progress updates
- **Assertions:**
  - Progress bar shows
  - Messages update from "Resending" to "Sent/Delivered"
  - Failed count decreases

### 7. View Resend Complete
- **From:** Campaign detail page
- **Action:** Review completed resend results
- **Selectors:**
  - Primary: `[data-testid="resend-complete-message"]`
  - Fallback: `div.success-message`
- **Expected Result:** Resend completion message shows
- **Assertions:**
  - "X messages resent successfully" message
  - Remaining failed count (if any)
  - Updated stats show

## Alternative Path: Resend to New Audience

### 1. Create New Campaign from Template
- **From:** Campaign detail page
- **Action:** Click "Resend to New Audience"
- **Selectors:**
  - Primary: `[data-testid="resend-to-new-audience"]`
  - Fallback: `button:has-text("New Audience")`
- **Expected Result:** Campaign creation form opens with template
- **Assertions:**
  - Message content pre-filled
  - Channel pre-selected
  - Recipient selector empty (ready for new audience)

### 2. Select New Recipients
- **From:** Campaign creation form
- **Action:** Select new audience for campaign
- **Selectors:**
  - Primary: `[data-testid="campaign-recipients"]`
  - Fallback: `button:has-text("Recipients")`
- **Input Data:** `{recipients: [100, 101, 102]}`
- **Expected Result:** New recipients selected
- **Assertions:**
  - Recipient count shows new number
  - Different from original campaign

### 3. Send to New Audience
- **From:** Campaign creation form
- **Action:** Send campaign to new audience
- **Selectors:**
  - Primary: `[data-testid="campaign-send"]`
  - Fallback: `button:has-text("Send")`
- **Expected Result:** Campaign sent
- **Assertions:**
  - New campaign created
  - Status shows "Sending"
  - Original campaign unchanged

## Success Outcome
- Failed messages are resent
- Delivery rate improved
- User can track resend success
- Campaign reach expanded (if resending to new audience)

## Error Cases

### Error 1: No Failed Messages
- **Trigger:** User clicks resend but no failures
- **Error Message:** "No failed messages to resend"
- **Recovery:** User views other campaign actions

### Error 2: All Resends Succeed Immediately
- **Trigger:** All failed messages succeed on retry
- **Expected Behavior:** Success message, stats update
- **Error Message:** "All messages resent successfully!"
- **Recovery:** N/A - success

### Error 3: Some Resends Still Fail
- **Trigger:** Resend attempted but some fail again
- **Expected Behavior:** Partial success message
- **Error Message:** "X messages sent, Y still failed"
- **Recovery:** User can try again or investigate reason

### Error 4: Network Error During Resend
- **Trigger:** Network fails during resend
- **Expected Behavior:** Error message, no partial send
- **Error Message:** "Resend failed. Please try again"
- **Recovery:** User retries resend

### Error 5: Campaign No Longer Available
- **Trigger:** Campaign deleted by another user
- **Expected Behavior:** Error message
- **Error Message:** "Campaign no longer available"
- **Recovery:** User returns to campaigns list

## Selector Improvements Needed
- Campaign detail: Add `data-testid="campaign-detail-header"`
- Failed messages: Add `data-testid="failed-messages-section"`
- Resend failed button: Add `data-testid="resend-failed-button"`
- Resend summary: Add `data-testid="resend-summary"`
- Confirm resend: Add `data-testid="confirm-resend"`
- Progress indicator: Add `data-testid="resend-progress"`
- Complete message: Add `data-testid="resend-complete-message"`
- Resend new audience: Add `data-testid="resend-to-new-audience"`

## Test Data Requirements
- Campaign with failed messages (20-50% failure rate)
- Campaign with all failed messages
- Campaign with no failures
- Campaign with mix of delivery failures and timeout
- Campaign sent long ago (to test resend on old data)
- New audience contacts for resend alternative
