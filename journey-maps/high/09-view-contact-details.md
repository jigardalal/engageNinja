# Journey: View & Search Contact Details

**Priority:** High
**User Type:** Authenticated user (member or admin)
**Frequency:** Weekly (regular contact lookups)
**Business Impact:** Contact information access, audience understanding
**Preconditions:** User is authenticated, has active tenant, contacts exist

## Overview
Users search for and view detailed contact information including phone, email, tags, and message history. This is used before taking actions on contacts (adding to campaigns, updating info, etc.).

## Steps

### 1. Navigate to Contacts
- **From:** Dashboard or sidebar
- **Action:** Click "Contacts" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-contacts"]`
  - Fallback: `a:has-text("Contacts")`
- **Expected Result:** Contacts list loads
- **Assertions:**
  - Page URL is `/contacts`
  - Contacts table visible
  - Search input available

### 2. Search for Contact
- **From:** Contacts page
- **Action:** Enter search term in search box
- **Selectors:**
  - Primary: `[data-testid="contacts-search"]`
  - Fallback: `input[placeholder*="Search"]`
- **Input Data:** `{searchTerm: "John"}`
- **Expected Result:** Results filtered by search term
- **Assertions:**
  - Matching contacts display
  - Non-matching contacts hidden
  - Real-time filter applies

### 3. Click Contact Row
- **From:** Contacts list
- **Action:** Click on contact row to view details
- **Selectors:**
  - Primary: `[data-testid="contact-row-{contactId}"]`
  - Fallback: `tr:has-text("{contactName}")`
- **Expected Result:** Contact detail page opens
- **Assertions:**
  - URL changes to `/contacts/{id}`
  - Contact information loads
  - All fields displayed

### 4. View Contact Profile
- **From:** Contact detail page
- **Action:** Review contact information
- **Selectors:**
  - Primary: `[data-testid="contact-profile-card"]`
  - Fallback: `div.contact-info`
- **Expected Result:** Full contact profile displays
- **Assertions:**
  - Phone number visible
  - Email visible (if available)
  - Name visible
  - Tags visible
  - Status visible (active/inactive)
  - Creation date visible

### 5. View Contact Tags
- **From:** Contact detail page
- **Action:** Review tags assigned to contact
- **Selectors:**
  - Primary: `[data-testid="contact-tags"]`
  - Fallback: `div.tags-section`
- **Expected Result:** Tags display
- **Assertions:**
  - All tags show with colors
  - Tag count accurate
  - Each tag clickable (to view other contacts with same tag)

### 6. View Contact Message History
- **From:** Contact detail page
- **Action:** Click "Messages" tab to see message history
- **Selectors:**
  - Primary: `[data-testid="contact-messages-tab"]`
  - Fallback: `button:has-text("Messages")`
- **Expected Result:** Message history displays
- **Assertions:**
  - All messages to this contact show
  - Newest messages first
  - Each message shows date, status, content
  - Message count accurate

### 7. View Campaign Participation
- **From:** Contact detail page
- **Action:** Click "Campaigns" tab to see campaign history
- **Selectors:**
  - Primary: `[data-testid="contact-campaigns-tab"]`
  - Fallback: `button:has-text("Campaigns")`
- **Expected Result:** Campaign participation displays
- **Assertions:**
  - All campaigns this contact received show
  - Campaign name, date, status visible
  - Campaign metrics (read, delivered, etc.) show

### 8. Export Contact Data
- **From:** Contact detail page
- **Action:** Click export button
- **Selectors:**
  - Primary: `[data-testid="export-contact-button"]`
  - Fallback: `button:has-text("Export")`
- **Expected Result:** Contact data exported
- **Assertions:**
  - Export options show
  - Download triggers

## Success Outcome
- User can view complete contact profile
- User understands contact history
- User can make informed decisions about contact

## Error Cases

### Error 1: Contact Not Found
- **Trigger:** Search returns no results
- **Error Message:** "No contacts match your search"
- **Recovery:** User refines search term

### Error 2: Contact Deleted
- **Trigger:** Contact was deleted by another user
- **Error Message:** "This contact no longer exists"
- **Recovery:** User returns to contacts list

### Error 3: Permission Denied
- **Trigger:** User doesn't have access to view this contact
- **Error Message:** "You don't have permission to view this contact"
- **Recovery:** User contacts admin

## Selector Improvements Needed
- Search input: Add `data-testid="contacts-search"`
- Contact row: Add `data-testid="contact-row-{contactId}"`
- Profile card: Add `data-testid="contact-profile-card"`
- Tags section: Add `data-testid="contact-tags"`
- Messages tab: Add `data-testid="contact-messages-tab"`
- Campaigns tab: Add `data-testid="contact-campaigns-tab"`
- Export button: Add `data-testid="export-contact-button"`

## Test Data Requirements
- Contact with full information
- Contact with minimal information
- Contact with multiple tags
- Contact with message history
- Contact with campaign participation
- Contacts with special characters in name
- Deleted contact scenario
