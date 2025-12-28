# Journey: Edit Contact Information

**Priority:** High
**User Type:** Authenticated user (member or admin)
**Frequency:** Occasional (weekly for active users)
**Business Impact:** Data management, audience quality
**Preconditions:** User is authenticated, has active tenant, contact exists

## Overview
Users view and edit contact information to maintain data quality and update details. This journey includes viewing contact detail page, editing fields, updating tags, and managing contact status.

## Steps

### 1. Navigate to Contacts
- **From:** Dashboard or navigation
- **Action:** Click "Contacts" in sidebar
- **Selectors:**
  - Primary: `[data-testid="nav-contacts"]`
  - Fallback: `a:has-text("Contacts")`
- **Expected Result:** Contacts list page loads
- **Assertions:**
  - Page URL is `/contacts`
  - Contacts table visible

### 2. Search or Locate Contact
- **From:** Contacts page
- **Action:** Search by name/phone or scroll to find contact
- **Selectors:**
  - Primary: `[data-testid="contacts-search"]`
  - Fallback: `input[placeholder*="Search"]`
  - Recommendation: Add `data-testid="contacts-search"`
- **Input Data:** `{searchTerm: "John Doe"}`
- **Expected Result:** Contacts filtered by search
- **Assertions:**
  - Search results show matching contacts
  - Contact list updates immediately
  - Exact contact appears in results

### 3. Click Contact to View Details
- **From:** Contacts list
- **Action:** Click on contact row or name to open detail page
- **Selectors:**
  - Primary: `[data-testid="contact-row-{contactId}"]`
  - Fallback: `tr:has-text("{contactName}")`
  - Recommendation: Add `data-testid="contact-row-{contactId}"`
- **Expected Result:** Contact detail page opens
- **Assertions:**
  - URL changes to `/contacts/{id}`
  - Contact details load
  - All fields populated with current values

### 4. View Contact Information
- **From:** Contact detail page
- **Action:** Review current contact data
- **Selectors:**
  - Primary: `[data-testid="contact-detail-card"]`
  - Fallback: `div.contact-info`
- **Expected Result:** All contact information displays
- **Assertions:**
  - Phone number displays
  - Email displays (if available)
  - Name displays
  - Tags display
  - Creation date shows
  - Last message date shows (if applicable)

### 5. Click Edit Button
- **From:** Contact detail page
- **Action:** Click "Edit" button to open edit mode
- **Selectors:**
  - Primary: `[data-testid="contact-edit-button"]`
  - Fallback: `button:has-text("Edit")`
  - Recommendation: Add `data-testid="contact-edit-button"`
- **Expected Result:** Contact edit form opens (modal or inline)
- **Assertions:**
  - Edit form is visible
  - All fields are editable
  - Current values pre-populated

### 6. Edit Contact Name
- **From:** Contact edit form
- **Action:** Modify contact name field
- **Selectors:**
  - Primary: `[data-testid="contact-name"]`
  - Fallback: `input[name="name"]`
  - Recommendation: Add `data-testid="contact-name"`
- **Input Data:** `{name: "John Updated"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - New value appears in field
  - Form marks as modified

### 7. Edit Contact Phone
- **From:** Contact edit form
- **Action:** Modify phone number
- **Selectors:**
  - Primary: `[data-testid="contact-phone"]`
  - Fallback: `input[name="phone"]`
  - Recommendation: Add `data-testid="contact-phone"`
- **Input Data:** `{phone: "+1234567891"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - New phone displays in field

### 8. Edit Contact Email (Optional)
- **From:** Contact edit form
- **Action:** Add or modify email address
- **Selectors:**
  - Primary: `[data-testid="contact-email"]`
  - Fallback: `input[name="email"]`
  - Recommendation: Add `data-testid="contact-email"`
- **Input Data:** `{email: "john.updated@example.com"}`
- **Expected Result:** Email field updates
- **Assertions:**
  - New email displays in field

### 9. Update Contact Tags
- **From:** Contact edit form
- **Action:** Add or remove tags
- **Selectors:**
  - Primary: `[data-testid="contact-tags"]`
  - Fallback: `input[placeholder*="Tags"]`
  - Recommendation: Add `data-testid="contact-tags"`
- **Input Data:** `{tags: ["vip", "verified"]}`
- **Expected Result:** Tags are updated
- **Assertions:**
  - New tags display with visual indicator
  - Previous tags removed (if applicable)

### 10. Save Changes
- **From:** Contact edit form
- **Action:** Click "Save" or "Update" button
- **Selectors:**
  - Primary: `[data-testid="contact-save"]`
  - Fallback: `button:has-text("Save")`
  - Recommendation: Add `data-testid="contact-save"`
- **Expected Result:** Form submission starts
- **Assertions:**
  - Save button shows loading state
  - Form is disabled during save

### 11. Contact Updated Successfully
- **From:** Contact edit form (after submission)
- **Action:** Wait for backend processing
- **Expected Result:** Contact detail page updates with new values
- **Assertions:**
  - Contact fields show updated values
  - Success message displays (optional)
  - Form returns to view mode

## Success Outcome
- Contact information is updated in database
- Changes are immediately visible on detail page
- Contact can be used in campaigns with updated info
- Activity is logged for audit trail

## Alternative Paths

### Path 1: Edit from Inline Action
- **Trigger:** User clicks edit icon in contact row on list
- **Outcome:** Inline edit form appears
- **Steps:** Similar to main flow, but updates happen inline

### Path 2: Bulk Edit Tags
- **Trigger:** User selects multiple contacts and edits tags
- **Outcome:** Tags updated for all selected contacts
- **Steps:** Different flow for bulk operations

### Path 3: Mark Contact Inactive
- **Trigger:** User wants to disable contact (no longer valid)
- **Outcome:** Contact marked as inactive, excluded from campaigns
- **Steps:** Additional step to toggle active status

## Error Cases

### Error 1: Invalid Phone Format
- **Trigger:** User enters invalid phone number
- **Expected Behavior:** Validation error appears
- **Error Message:** "Please enter a valid phone number"
- **Recovery:** User corrects phone format

### Error 2: Invalid Email Format
- **Trigger:** User enters invalid email
- **Expected Behavior:** Validation error appears
- **Error Message:** "Please enter a valid email address"
- **Recovery:** User corrects email

### Error 3: Duplicate Phone
- **Trigger:** User tries to save with phone that already exists
- **Expected Behavior:** Conflict warning shown
- **Error Message:** "This phone number is already associated with another contact"
- **Recovery:** User confirms to merge or chooses different number

### Error 4: Network Error During Save
- **Trigger:** Network fails during save
- **Expected Behavior:** Error message, form state preserved
- **Error Message:** "Failed to save contact. Please try again"
- **Recovery:** User retries save

### Error 5: Contact Deleted
- **Trigger:** Contact was deleted by another user while editing
- **Expected Behavior:** Error message shown
- **Error Message:** "This contact has been deleted"
- **Recovery:** User returns to contacts list

### Error 6: Insufficient Permissions
- **Trigger:** User's role changed during editing
- **Expected Behavior:** Edit form disabled
- **Error Message:** "You don't have permission to edit this contact"
- **Recovery:** User contacts admin

## Selector Improvements Needed
- Contacts nav: Add `data-testid="nav-contacts"`
- Search input: Add `data-testid="contacts-search"`
- Contact row: Add `data-testid="contact-row-{contactId}"`
- Contact detail card: Add `data-testid="contact-detail-card"`
- Edit button: Add `data-testid="contact-edit-button"`
- Contact name input: Add `data-testid="contact-name"`
- Contact phone input: Add `data-testid="contact-phone"`
- Contact email input: Add `data-testid="contact-email"`
- Contact tags input: Add `data-testid="contact-tags"`
- Save button: Add `data-testid="contact-save"`
- Cancel button: Add `data-testid="contact-cancel"`
- Error message: Add `data-testid="contact-error"`

## Test Data Requirements
- Contact with all fields (phone, name, email, tags)
- Contact with minimal fields (phone only)
- Contact with special characters in name
- Contact with international phone number
- Contact with multiple tags
- Contact with no tags
- Duplicate phone scenarios
- Users with different roles (viewer, member, admin)
