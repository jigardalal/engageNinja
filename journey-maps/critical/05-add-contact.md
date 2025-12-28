# Journey: Add Contact (Single & Bulk Import)

**Priority:** Critical
**User Type:** Authenticated user (member or admin)
**Frequency:** Multiple times per session, varies by use case
**Business Impact:** Contact management is fundamental to campaign targeting
**Preconditions:** User is authenticated, has active tenant

## Overview
Users add contacts to their workspace either individually or via CSV bulk import. This is critical for audience management and enables campaign targeting.

## Path A: Add Single Contact

### 1. Navigate to Contacts Page
- **From:** Dashboard, sidebar, or navigation
- **Action:** Click "Contacts" in navigation menu
- **Selectors:**
  - Primary: `[data-testid="nav-contacts"]`
  - Fallback: `a:has-text("Contacts")`
- **Expected Result:** Contacts list page loads
- **Assertions:**
  - Page URL is `/contacts`
  - Contacts table/list is visible
  - "Add Contact" button is visible

### 2. Click Add Contact Button
- **From:** Contacts page
- **Action:** Click "Add Contact" or "+ New Contact"
- **Selectors:**
  - Primary: `[data-testid="add-contact-button"]`
  - Fallback: `button:has-text("Add Contact")`
- **Expected Result:** Add contact modal opens
- **Assertions:**
  - Modal is visible
  - Form fields are present (name, email, phone, tags, etc.)

### 3. Fill Contact Information
- **From:** Add contact modal
- **Action:** Fill in contact fields
- **Selectors:**
  - Primary: `[data-testid="contact-phone"]`
  - Fallback: `input[placeholder*="Phone"]`
- **Input Data:** `{phone: "+1234567890", firstName: "John", lastName: "Doe", email: "john@example.com"}`
- **Expected Result:** Fields are populated
- **Assertions:**
  - Phone field contains "+1234567890"
  - All required fields populated

### 4. Add Tags (Optional)
- **From:** Add contact modal
- **Action:** Click tag selector to add tags
- **Selectors:**
  - Primary: `[data-testid="contact-tags"]`
  - Fallback: `input[placeholder*="Tags"]`
- **Input Data:** `{tags: ["premium", "engaged"]}`
- **Expected Result:** Tags are selected/added
- **Assertions:**
  - Selected tags display with visual indicator

### 5. Submit Contact
- **From:** Add contact modal
- **Action:** Click "Save" or "Add Contact" button
- **Selectors:**
  - Primary: `[data-testid="contact-submit"]`
  - Fallback: `button:has-text("Save")`
- **Expected Result:** Modal closes, contact added
- **Assertions:**
  - Contact appears in contacts list
  - Success message shows (optional)

## Path B: Bulk Import Contacts via CSV

### 1. Navigate to Contacts Page
- **From:** Dashboard, sidebar
- **Action:** Navigate to `/contacts`
- **Expected Result:** Contacts list page loads
- **Assertions:**
  - Page URL is `/contacts`
  - Import option is visible

### 2. Click Import Contacts
- **From:** Contacts page
- **Action:** Click "Import" or "Bulk Import" button
- **Selectors:**
  - Primary: `[data-testid="import-contacts-button"]`
  - Fallback: `button:has-text("Import")`
- **Expected Result:** Import modal or file picker opens
- **Assertions:**
  - Modal/picker is visible
  - Instructions are shown

### 3. Select CSV File
- **From:** Import modal
- **Action:** Click file input and select CSV file
- **Selectors:**
  - Primary: `[data-testid="csv-file-input"]`
  - Fallback: `input[type="file"]`
- **Input Data:** `{file: "contacts.csv"}`
- **Expected Result:** File is selected, preview may show
- **Assertions:**
  - File name appears
  - File preview or summary shows row count

### 4. Map CSV Columns
- **From:** Import modal
- **Action:** Configure which CSV columns map to contact fields
- **Selectors:**
  - Primary: `[data-testid="column-mapper-phone"]`
  - Fallback: `select[name="phoneColumn"]`
- **Input Data:** `{phoneColumn: 0, nameColumn: 1, emailColumn: 2}`
- **Expected Result:** Column mappings are configured
- **Assertions:**
  - Dropdown shows selected columns
  - Preview table shows correctly mapped data

### 5. Preview Import Data
- **From:** Import modal
- **Action:** View preview of data to be imported
- **Selectors:**
  - Primary: `[data-testid="import-preview"]`
  - Fallback: `table.preview`
- **Expected Result:** Preview table shows sample rows
- **Assertions:**
  - Preview shows correctly mapped columns
  - Row count is accurate

### 6. Submit Import
- **From:** Import modal
- **Action:** Click "Import" button
- **Selectors:**
  - Primary: `[data-testid="import-submit"]`
  - Fallback: `button:has-text("Import")`
- **Expected Result:** Import begins, progress shows
- **Assertions:**
  - Loading state appears
  - Progress indicator shows

### 7. Import Completes
- **From:** Import modal (after submission)
- **Action:** Wait for backend processing
- **Expected Result:** Success message and updated contacts list
- **Assertions:**
  - Modal closes or shows success
  - New contacts appear in list
  - Import summary shows (X contacts added)

## Success Outcomes

### Single Contact Add
- Contact is created and appears in contacts list
- Contact can be selected for campaigns
- Contact information is available for viewing/editing

### Bulk Import
- All valid contacts from CSV are imported
- Duplicate handling rules are applied
- User sees summary of import results (added, skipped, errors)

## Error Cases

### Error 1: Missing Required Field (Single)
- **Trigger:** User tries to save without phone number (required)
- **Error Message:** "Phone number is required"
- **Recovery:** User fills in required field

### Error 2: Invalid Phone Format
- **Trigger:** User enters invalid phone number
- **Error Message:** "Please enter a valid phone number"
- **Recovery:** User corrects phone format

### Error 3: Duplicate Contact
- **Trigger:** Contact with same phone already exists
- **Expected Behavior:** Warning shown, option to update or skip
- **Error Message:** "Contact already exists. Would you like to update it?"
- **Recovery:** User chooses action

### Error 4: No File Selected (Import)
- **Trigger:** User tries to import without selecting file
- **Error Message:** "Please select a CSV file"
- **Recovery:** User selects file

### Error 5: Invalid CSV Format
- **Trigger:** CSV file is malformed
- **Error Message:** "Invalid CSV file format"
- **Recovery:** User uploads valid CSV

### Error 6: Missing Phone Column
- **Trigger:** CSV doesn't have phone column, user doesn't map one
- **Error Message:** "Phone column is required for importing"
- **Recovery:** User maps correct column or fixes CSV

### Error 7: Quota Exceeded (Bulk)
- **Trigger:** Import would exceed contact limit
- **Error Message:** "Import would exceed your contact limit. Upgrade to import more"
- **Recovery:** User upgrades or reduces import size

## Selector Improvements Needed
- Add contact button: Add `data-testid="add-contact-button"`
- Contact phone input: Add `data-testid="contact-phone"`
- Contact submit: Add `data-testid="contact-submit"`
- Import button: Add `data-testid="import-contacts-button"`
- CSV file input: Add `data-testid="csv-file-input"`
- Column mappers: Add `data-testid="column-mapper-{field}"`
- Import preview: Add `data-testid="import-preview"`
- Import submit: Add `data-testid="import-submit"`
- Error messages: Add `data-testid="contact-error"`

## Test Data Requirements
- Individual contact with phone only
- Individual contact with all fields
- CSV with 10 contacts
- CSV with 1000+ contacts
- CSV with header row
- CSV with mixed valid/invalid data
- Duplicate phone numbers
- Various phone number formats
- Contacts with and without email
- Contacts with and without tags
