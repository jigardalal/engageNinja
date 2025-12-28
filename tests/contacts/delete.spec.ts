import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';
import { TEST_CONTACTS } from '../utils/test-data';

test.describe('Contact Deletion', () => {
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

  test('should delete a contact with confirmation', async ({ page }) => {
    // Find contact to delete
    const contactName = TEST_CONTACTS[0].name;
    const contactRow = page.locator('text=' + contactName).first();
    await expect(contactRow).toBeVisible();

    // Find delete button
    const deleteButton = contactRow.locator('button:has-text("Delete"), .delete-btn, [data-testid="delete-contact"]');
    await ui.clickElement(deleteButton);

    // Wait for confirmation dialog
    const confirmDialog = page.locator('.confirm-dialog, .modal:has-text("Delete"), [data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();

    // Verify confirmation message
    await expect(confirmDialog.locator('text=delete, text=Delete')).toBeVisible();

    // Confirm deletion
    const confirmButton = confirmDialog.locator('button:has-text("Delete"), button:has-text("Yes"), button:has-text("Confirm")');
    await ui.clickElement(confirmButton);

    // Wait for success message
    const successToast = page.locator('.toast, .notification');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('deleted');

    // Verify contact is removed from list
    await page.reload();
    const deletedContact = page.locator('text=' + contactName);
    await expect(deletedContact).not.toBeVisible();
  });

  test('should cancel contact deletion', async ({ page }) => {
    // Find contact
    const contactRow = page.locator('.contact-row').first();
    await expect(contactRow).toBeVisible();

    // Click delete
    const deleteButton = contactRow.locator('button:has-text("Delete")');
    await ui.clickElement(deleteButton);

    // Wait for confirmation dialog
    const confirmDialog = page.locator('.confirm-dialog, .modal');
    await expect(confirmDialog).toBeVisible();

    // Cancel deletion
    const cancelButton = confirmDialog.locator('button:has-text("Cancel"), button:has-text("No")');
    await ui.clickElement(cancelButton);

    // Dialog should close
    await expect(confirmDialog).not.toBeVisible();

    // Verify contact still exists
    await page.reload();
    await expect(contactRow).toBeVisible();
  });

  test('should handle delete errors gracefully', async ({ page }) => {
    // Mock API error for deletion
    await page.route('**/api/contacts/**', route => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Cannot delete contact with active campaigns' })
        });
      } else {
        route.continue();
      }
    });

    // Try to delete contact
    const contactRow = page.locator('.contact-row').first();
    await expect(contactRow).toBeVisible();

    const deleteButton = contactRow.locator('button:has-text("Delete")');
    await ui.clickElement(deleteButton);

    const confirmDialog = page.locator('.confirm-dialog, .modal');
    await expect(confirmDialog).toBeVisible();

    // Confirm deletion
    const confirmButton = confirmDialog.locator('button:has-text("Delete")');
    await ui.clickElement(confirmButton);

    // Should show error
    const errorToast = page.locator('.toast:has-text("error"), .error:has-text("Cannot delete")');
    await expect(errorToast).toBeVisible();
  });
});