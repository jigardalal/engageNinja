# Journey: Create & Manage Contact Tags

**Priority:** Medium
**User Type:** Authenticated user (member or admin)
**Frequency:** Monthly (occasional tag management)
**Business Impact:** Contact organization and segmentation
**Preconditions:** User is authenticated, has active tenant

## Overview
Users create and manage tags to organize contacts into groups for targeted campaigns. Tags enable segmentation and reusability across campaigns.

## Steps

### 1. Navigate to Tags Page
- **From:** Sidebar or contacts page
- **Action:** Click "Tags" in navigation
- **Selectors:**
  - Primary: `[data-testid="nav-tags"]`
  - Fallback: `a:has-text("Tags")`
- **Expected Result:** Tags management page loads
- **Assertions:**
  - Page URL is `/tags`
  - Existing tags list displays
  - "Create Tag" button visible

### 2. Click Create Tag
- **From:** Tags page
- **Action:** Click "Create Tag" or "+ New Tag"
- **Selectors:**
  - Primary: `[data-testid="create-tag-button"]`
  - Fallback: `button:has-text("Create")`
- **Expected Result:** Tag creation form opens
- **Assertions:**
  - Form visible
  - Name input shown
  - Color picker available (optional)
  - Description field available (optional)

### 3. Enter Tag Name
- **From:** Tag creation form
- **Action:** Enter tag name
- **Selectors:**
  - Primary: `[data-testid="tag-name"]`
  - Fallback: `input[name="name"]`
- **Input Data:** `{name: "Premium Customers"}`
- **Expected Result:** Tag name entered
- **Assertions:**
  - Name displays in input

### 4. Choose Tag Color (Optional)
- **From:** Tag creation form
- **Action:** Select color for visual identification
- **Selectors:**
  - Primary: `[data-testid="tag-color-picker"]`
  - Fallback: `div.color-picker`
- **Input Data:** `{color: "#FF5733"}`
- **Expected Result:** Color selected
- **Assertions:**
  - Color swatch shows selected color
  - Preview shows colored tag

### 5. Add Tag Description (Optional)
- **From:** Tag creation form
- **Action:** Add description
- **Selectors:**
  - Primary: `[data-testid="tag-description"]`
  - Fallback: `textarea[name="description"]`
- **Input Data:** `{description: "High-value customers with multiple purchases"}`
- **Expected Result:** Description entered
- **Assertions:**
  - Description displays

### 6. Save Tag
- **From:** Tag creation form
- **Action:** Click "Save" button
- **Selectors:**
  - Primary: `[data-testid="tag-save"]`
  - Fallback: `button:has-text("Save")`
- **Expected Result:** Tag created
- **Assertions:**
  - Form closes
  - New tag appears in list
  - Success message shows

### 7. View Tags List
- **From:** Tags page
- **Action:** Review all available tags
- **Selectors:**
  - Primary: `[data-testid="tags-list"]`
  - Fallback: `div.tags-container`
- **Expected Result:** Tags display
- **Assertions:**
  - Each tag shows name
  - Color displays
  - Member count shows (number of contacts)
  - Usage count shows (number of campaigns)

### 8. Edit Tag
- **From:** Tags list
- **Action:** Click edit icon on tag
- **Selectors:**
  - Primary: `[data-testid="tag-edit-{tagId}"]`
  - Fallback: `button:has-text("Edit")`
- **Expected Result:** Edit form opens
- **Assertions:**
  - Current values pre-populated
  - Form is editable

### 9. Update Tag Details
- **From:** Tag edit form
- **Action:** Modify tag properties
- **Selectors:**
  - Primary: `[data-testid="tag-name"]`
  - Fallback: `input[name="name"]`
- **Input Data:** `{name: "VIP Customers"}`
- **Expected Result:** Changes reflected
- **Assertions:**
  - New values display

### 10. Save Tag Changes
- **From:** Tag edit form
- **Action:** Click "Save"
- **Selectors:**
  - Primary: `[data-testid="tag-save"]`
  - Fallback: `button:has-text("Save")`
- **Expected Result:** Changes saved
- **Assertions:**
  - Form closes
  - Tags list updates with new values

### 11. Delete Tag
- **From:** Tags list
- **Action:** Click delete icon
- **Selectors:**
  - Primary: `[data-testid="tag-delete-{tagId}"]`
  - Fallback: `button:has-text("Delete")`
- **Expected Result:** Confirmation dialog appears
- **Assertions:**
  - Confirmation message shows
  - Warning about contacts using tag
  - Confirm/Cancel buttons visible

### 12. Confirm Tag Deletion
- **From:** Confirmation dialog
- **Action:** Confirm deletion
- **Selectors:**
  - Primary: `[data-testid="confirm-delete"]`
  - Fallback: `button:has-text("Delete")`
- **Expected Result:** Tag deleted
- **Assertions:**
  - Tag removed from list
  - Tag removed from affected contacts
  - Success message shows

## Success Outcome
- Tags are created and organized
- Contacts can be tagged for segmentation
- Tags are available for campaign targeting
- Team can manage tag taxonomy

## Error Cases

### Error 1: Empty Tag Name
- **Trigger:** User tries to save without name
- **Error Message:** "Tag name is required"
- **Recovery:** User enters name

### Error 2: Duplicate Tag Name
- **Trigger:** Tag name already exists
- **Error Message:** "Tag name already exists"
- **Recovery:** User uses different name

### Error 3: Tag In Use
- **Trigger:** User tries to delete tag that contacts have
- **Error Message:** "This tag is used by 5 contacts. Remove before deleting"
- **Recovery:** User removes tag from contacts first

## Selector Improvements Needed
- Tags nav: Add `data-testid="nav-tags"`
- Create button: Add `data-testid="create-tag-button"`
- Tag name input: Add `data-testid="tag-name"`
- Color picker: Add `data-testid="tag-color-picker"`
- Description: Add `data-testid="tag-description"`
- Save button: Add `data-testid="tag-save"`
- Tags list: Add `data-testid="tags-list"`
- Tag item: Add `data-testid="tag-item-{tagId}"`
- Edit button: Add `data-testid="tag-edit-{tagId}"`
- Delete button: Add `data-testid="tag-delete-{tagId}"`

## Test Data Requirements
- Tags with and without descriptions
- Tags with different colors
- Tags with varying contact counts
- Unused tags
- Frequently used tags
