import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';
import { TEST_CONTACTS, generateRandomEmail } from '../utils/test-data';

test.describe('Contact Editing', () => {
  let ui: UIHelpers;

  test.beforeEach(async ({ page }) => {
    ui = new UIHelpers(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // Navigate to contacts page
    await page.click('a:has-text("Contacts")');
    await expect(page).toHaveURL(/contacts/);
  });

  test('should edit an existing contact', async ({ page }) => {
    // First, ensure we have a contact to edit
    const contactName = TEST_CONTACTS[0].name;

    // Look for edit button for first contact
    const contactRow = page.locator('text=' + contactName).first();
    await expect(contactRow).toBeVisible();

    const editButton = contactRow.locator('button:has-text("Edit"), .edit-btn, [data-testid="edit-contact"]');
    await ui.clickElement(editButton);

    // Wait for edit modal to appear
    const editModal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(editModal).toBeVisible();

    // Update contact information
    const newName = 'Updated ' + contactName;
    const newEmail = generateRandomEmail();

    await ui.fillInput('input[name="name"]', newName);
    await ui.fillInput('input[name="email"]', newEmail);

    // Submit changes
    const saveButton = editModal.locator('button:has-text("Update"), button:has-text("Save")');
    await ui.clickElement(saveButton);

    // Wait for success
    const successToast = page.locator('.toast, .notification');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('updated');

    // Verify changes are saved
    await page.reload();
    const updatedContact = page.locator('text=' + newName);
    await expect(updatedContact).toBeVisible();
  });

  test('should validate email format on edit', async ({ page }) => {
    // Find first contact
    const contactRow = page.locator('.contact-row, .list-item').first();
    await expect(contactRow).toBeVisible();

    const editButton = contactRow.locator('button:has-text("Edit")');
    await ui.clickElement(editButton);

    // Wait for edit modal
    const editModal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(editModal).toBeVisible();

    // Try to save with invalid email
    await ui.fillInput('input[name="email"]', 'invalid-email');

    const saveButton = editModal.locator('button:has-text("Update")');
    await saveButton.click();

    // Should show validation error
    const emailError = editModal.locator('.error:has-text("email")');
    await expect(emailError).toBeVisible();
  });

  test('should handle save conflicts', async ({ page }) => {
    // Mock API error for conflict
    await page.route('**/api/contacts/**', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Contact modified by another user' })
        });
      } else {
        route.continue();
      }
    });

    // Edit a contact
    const contactRow = page.locator('.contact-row').first();
    await expect(contactRow).toBeVisible();

    const editButton = contactRow.locator('button:has-text("Edit")');
    await ui.clickElement(editButton);

    const editModal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(editModal).toBeVisible();

    // Try to save
    const saveButton = editModal.locator('button:has-text("Update")');
    await ui.clickElement(saveButton);

    // Should show conflict error
    const conflictError = page.locator('.toast:has-text("conflict"), .error:has-text("conflict")');
    await expect(conflictError).toBeVisible();
  });

  test('should cancel editing without saving', async ({ page }) => {
    // Edit a contact
    const contactRow = page.locator('.contact-row').first();
    await expect(contactRow).toBeVisible();

    const editButton = contactRow.locator('button:has-text("Edit")');
    await ui.clickElement(editButton);

    const editModal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(editModal).toBeVisible();

    // Make some changes
    await ui.fillInput('input[name="name"]', 'Changed Name');

    // Cancel
    const cancelButton = editModal.locator('button:has-text("Cancel")');
    await ui.clickElement(cancelButton);

    // Modal should close
    await expect(editModal).not.toBeVisible();

    // Verify original data is unchanged
    await page.reload();
    const originalContact = page.locator('text=' + TEST_CONTACTS[0].name);
    await expect(originalContact).toBeVisible();
  });
});