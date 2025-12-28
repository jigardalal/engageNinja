# Journey: Create Message Template

**Priority:** High
**User Type:** Authenticated user (member or admin)
**Frequency:** Occasional (weekly for active users)
**Business Impact:** Productivity - templates enable faster campaign creation
**Preconditions:** User is authenticated, has active tenant

## Overview
Users create reusable message templates for WhatsApp and Email campaigns. Templates save time and ensure message consistency across communications.

## Steps

### 1. Navigate to Templates
- **From:** Dashboard or sidebar
- **Action:** Click "Templates" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-templates"]`
  - Fallback: `a:has-text("Templates")`
- **Expected Result:** Templates page loads
- **Assertions:**
  - Page URL is `/templates`
  - Template list displays
  - "Create Template" button visible

### 2. Click Create Template
- **From:** Templates page
- **Action:** Click "Create Template" or "+ New Template"
- **Selectors:**
  - Primary: `[data-testid="create-template-button"]`
  - Fallback: `button:has-text("Create Template")`
- **Expected Result:** Template creation form opens
- **Assertions:**
  - URL changes to `/templates/create`
  - Form shows all fields
  - Template preview area visible

### 3. Enter Template Name
- **From:** Template creation form
- **Action:** Fill in template name
- **Selectors:**
  - Primary: `[data-testid="template-name"]`
  - Fallback: `input[placeholder*="Template"]`
- **Input Data:** `{name: "Welcome Offer"}`
- **Expected Result:** Field value updates
- **Assertions:**
  - Name displays in form
  - Preview updates with name

### 4. Select Channel
- **From:** Template creation form
- **Action:** Choose WhatsApp or Email channel
- **Selectors:**
  - Primary: `[data-testid="template-channel-whatsapp"]`
  - Fallback: `button:has-text("WhatsApp")`
  - Recommendation: Add `data-testid="template-channel-whatsapp"`, `data-testid="template-channel-email"`
- **Input Data:** `{channel: "whatsapp"}`
- **Expected Result:** Channel selected, form updates
- **Assertions:**
  - Selected channel shows active state
  - Channel-specific fields appear (e.g., WhatsApp templates, Email subject)

### 5. Write Template Body
- **From:** Template creation form
- **Action:** Enter message text
- **Selectors:**
  - Primary: `[data-testid="template-body"]`
  - Fallback: `textarea[placeholder*="Message"]`
- **Input Data:** `{body: "Hi {{firstName}}, we have a special offer for you: {{offer}}"}`
- **Expected Result:** Text appears in editor
- **Assertions:**
  - Message text displays in editor
  - Character count shows
  - Word count shows (if applicable)

### 6. Add Variable Placeholder
- **From:** Template body editor
- **Action:** Click "Add Variable" or use variable picker
- **Selectors:**
  - Primary: `[data-testid="add-variable-button"]`
  - Fallback: `button:has-text("Variables")`
- **Expected Result:** Variable picker opens
- **Assertions:**
  - Available variables list shows (firstName, lastName, email, etc.)
  - Variables can be selected/inserted

### 7. Insert Variable
- **From:** Variable picker modal
- **Action:** Click on variable to insert into template
- **Selectors:**
  - Primary: `[data-testid="variable-{varName}"]`
  - Fallback: `button:has-text("{varName}")`
- **Input Data:** `{selectedVar: "firstName"}`
- **Expected Result:** Variable inserted into template
- **Assertions:**
  - Variable placeholder appears in template ({{firstName}})
  - Template preview updates

### 8. View Template Preview
- **From:** Template creation form
- **Action:** View live preview of template
- **Selectors:**
  - Primary: `[data-testid="template-preview"]`
  - Fallback: `div.preview-pane`
- **Expected Result:** Preview displays as recipients will see it
- **Assertions:**
  - Message shows in channel-specific format
  - Variables highlighted or shown
  - Character count accurate

### 9. Personalize Sample Preview
- **From:** Template preview
- **Action:** (Optional) Enter sample values to see personalized preview
- **Selectors:**
  - Primary: `[data-testid="preview-sample-firstName"]`
  - Fallback: `input[placeholder*="firstName"]`
- **Input Data:** `{sampleValues: {firstName: "John", offer: "50% Off"}}`
- **Expected Result:** Preview updates with sample data
- **Assertions:**
  - Variables replace with sample values
  - Preview shows final message format

### 10. Set Template Category (Optional)
- **From:** Template creation form
- **Action:** Optionally categorize template
- **Selectors:**
  - Primary: `[data-testid="template-category"]`
  - Fallback: `select[name="category"]`
- **Input Data:** `{category: "promotional"}`
- **Expected Result:** Category selected
- **Assertions:**
  - Category appears in dropdown as selected

### 11. Save Template
- **From:** Template creation form
- **Action:** Click "Save" or "Create Template" button
- **Selectors:**
  - Primary: `[data-testid="template-save"]`
  - Fallback: `button:has-text("Save")`
- **Expected Result:** Form submission starts
- **Assertions:**
  - Save button shows loading state
  - Form is disabled during save

### 12. Template Created Successfully
- **From:** Template form (after submission)
- **Action:** Wait for backend processing
- **Expected Result:** Redirect to template list or detail page
- **Assertions:**
  - URL changes to `/templates`
  - New template appears in list
  - Success message shows (optional)

## Success Outcome
- Template is created and stored in database
- Template available for use in future campaigns
- Template can be selected from template picker in campaign creation
- Template is visible in templates library

## Alternative Paths

### Path 1: Create Template from Campaign
- **Trigger:** User creating campaign clicks "Save as Template"
- **Outcome:** Current message saved as template
- **Steps:** Simplified flow - pre-fills body with campaign message

### Path 2: Duplicate Existing Template
- **Trigger:** User clicks "Duplicate" on existing template
- **Outcome:** Creates new template as copy
- **Steps:** Template creation with pre-filled values

## Error Cases

### Error 1: Empty Template Name
- **Trigger:** User tries to save without entering name
- **Expected Behavior:** Validation error
- **Error Message:** "Template name is required"
- **Recovery:** User enters template name

### Error 2: Empty Template Body
- **Trigger:** User tries to save without message text
- **Expected Behavior:** Validation error
- **Error Message:** "Template message cannot be empty"
- **Recovery:** User enters message text

### Error 3: Invalid Variables
- **Trigger:** Template contains undefined variables
- **Expected Behavior:** Warning shown
- **Error Message:** "Some variables may not resolve for all contacts"
- **Recovery:** User confirms or fixes variables

### Error 4: Template Too Long
- **Trigger:** WhatsApp template exceeds character limit
- **Expected Behavior:** Warning appears, shows limit
- **Error Message:** "WhatsApp messages limited to 4,096 characters"
- **Recovery:** User reduces message length

### Error 5: Network Error
- **Trigger:** Network fails during save
- **Expected Behavior:** Error message, form preserved
- **Error Message:** "Failed to save template. Please try again"
- **Recovery:** User retries save

### Error 6: Duplicate Name
- **Trigger:** Template name already exists
- **Expected Behavior:** Warning shown
- **Error Message:** "A template with this name already exists"
- **Recovery:** User uses different name

## Selector Improvements Needed
- Templates nav: Add `data-testid="nav-templates"`
- Create template button: Add `data-testid="create-template-button"`
- Template name input: Add `data-testid="template-name"`
- Channel selector: Add `data-testid="template-channel-{channel}"`
- Template body: Add `data-testid="template-body"`
- Add variable button: Add `data-testid="add-variable-button"`
- Variable items: Add `data-testid="variable-{varName}"`
- Template preview: Add `data-testid="template-preview"`
- Category select: Add `data-testid="template-category"`
- Save button: Add `data-testid="template-save"`
- Error message: Add `data-testid="template-error"`

## Test Data Requirements
- WhatsApp template
- Email template
- Template with multiple variables
- Template with 1 variable
- Template with no variables
- Long template (near character limit)
- Template with special characters
- Different template categories
