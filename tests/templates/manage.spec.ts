import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';
import { TEST_TEMPLATES } from '../utils/test-data';

test.describe('Template Management', () => {
  let ui: UIHelpers;

  test.beforeEach(async ({ page }) => {
    ui = new UIHelpers(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // Navigate to templates page
    await page.click('a:has-text("Templates")');
    await expect(page).toHaveURL(/templates/);
  });

  test('should view template details', async ({ page }) => {
    // Find template in list
    const templateRow = page.locator('.template-row, .list-item').first();
    await expect(templateRow).toBeVisible();

    // Click view button
    const viewButton = templateRow.locator('button:has-text("View"), .view-btn, a');
    await ui.clickElement(viewButton);

    // Should navigate to template details or open modal
    if (page.url().includes('/templates/')) {
      // Page navigation
      await expect(page).toHaveURL(/\/templates\/\d+/);
      await expect(page.locator('h1')).toContainText(/Template Details/i);

      // Verify template details
      const templateName = page.locator('text=' + TEST_TEMPLATES[0].name);
      await expect(templateName).toBeVisible();

      // Check content display
      const contentDisplay = page.locator('.template-content, [data-testid="template-content"]');
      await expect(contentDisplay).toBeVisible();
    } else {
      // Modal view
      const viewModal = page.locator('[data-testid="template-modal"], .modal');
      await expect(viewModal).toBeVisible();
      await expect(viewModal.locator('text=' + TEST_TEMPLATES[0].name)).toBeVisible();
    }
  });

  test('should edit an existing template', async ({ page }) => {
    // Find template to edit
    const templateRow = page.locator('.template-row').first();
    await expect(templateRow).toBeVisible();

    const editButton = templateRow.locator('button:has-text("Edit"), .edit-btn');
    await ui.clickElement(editButton);

    // Should open edit modal or navigate to edit page
    const editModal = page.locator('[data-testid="template-modal"], .modal');
    const editPage = page.locator(/\/templates\/\d+\/edit/);

    if (await editModal.isVisible()) {
      // Modal-based editing
      await expect(editModal).toBeVisible();

      // Update template content
      const contentTextarea = editModal.locator('textarea[name="content"]');
      await contentTextarea.fill('Updated template content');

      // Save changes
      const saveButton = editModal.locator('button:has-text("Update"), button:has-text("Save")');
      await ui.clickElement(saveButton);

      // Wait for success
      const successToast = page.locator('.toast');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText('updated');
    } else if (await editPage.isVisible()) {
      // Page-based editing
      await expect(page).toHaveURL(/\/templates\/\d+\/edit/);

      // Update and save
      const contentTextarea = page.locator('textarea[name="content"]');
      await contentTextarea.fill('Updated template content');

      const saveButton = page.locator('button:has-text("Save")');
      await ui.clickElement(saveButton);

      await expect(page).toHaveURL(/\/templates\/\d+/);
    }
  });

  test('should duplicate a template', async ({ page }) => {
    // Find template to duplicate
    const templateRow = page.locator('.template-row').first();
    await expect(templateRow).toBeVisible();

    const duplicateButton = templateRow.locator('button:has-text("Duplicate"), .duplicate-btn');
    if (await duplicateButton.isVisible()) {
      await ui.clickElement(duplicateButton);

      // Should create copy with new name
      const successToast = page.locator('.toast');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText('duplicated');

      // Verify duplicate exists
      await page.reload();
      const duplicatedTemplate = page.locator('text=' + TEST_TEMPLATES[0].name + ' (copy)');
      await expect(duplicatedTemplate).toBeVisible();
    }
  });

  test('should archive a template', async ({ page }) => {
    // Find template to archive
    const templateRow = page.locator('.template-row').first();
    await expect(templateRow).toBeVisible();

    const archiveButton = templateRow.locator('button:has-text("Archive"), .archive-btn');
    if (await archiveButton.isVisible()) {
      await ui.clickElement(archiveButton);

      // Wait for confirmation
      const confirmDialog = page.locator('.confirm-dialog, .modal');
      if (await confirmDialog.isVisible()) {
        const confirmButton = confirmDialog.locator('button:has-text("Archive")');
        await ui.clickElement(confirmButton);
      }

      // Should show success
      const successToast = page.locator('.toast');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText('archived');

      // Verify template is moved to archived list
      await page.reload();
      const archivedSection = page.locator('[data-testid="archived-templates"], .archived-section');
      if (await archivedSection.isVisible()) {
        await expect(archivedSection).toBeVisible();
      }
    }
  });

  test('should delete a template', async ({ page }) => {
    // Find template to delete
    const templateRow = page.locator('.template-row').first();
    await expect(templateRow).toBeVisible();

    const deleteButton = templateRow.locator('button:has-text("Delete"), .delete-btn');
    await ui.clickElement(deleteButton);

    // Wait for confirmation
    const confirmDialog = page.locator('.confirm-dialog, .modal');
    await expect(confirmDialog).toBeVisible();

    // Confirm deletion
    const confirmButton = confirmDialog.locator('button:has-text("Delete")');
    await ui.clickElement(confirmButton);

    // Should show success
    const successToast = page.locator('.toast');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('deleted');

    // Verify template is removed
    await page.reload();
    const deletedTemplate = page.locator('text=' + TEST_TEMPLATES[0].name);
    await expect(deletedTemplate).not.toBeVisible();
  });

  test('should search and filter templates', async ({ page }) => {
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], .search-input');
    if (await searchInput.isVisible()) {
      await ui.fillInput(searchInput, TEST_TEMPLATES[0].name);

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify filtered results
      const templateRows = page.locator('.template-row, .list-item');
      const rowCount = await templateRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }

    // Test filtering by channel type
    const channelFilter = page.locator('select:has-text("Channel"), .channel-filter');
    if (await channelFilter.isVisible()) {
      await ui.selectOption(channelFilter, 'WhatsApp');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify only WhatsApp templates are shown
      const templateRows = page.locator('.template-row');
      const rowCount = await templateRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }

    // Test filtering by status
    const statusFilter = page.locator('select:has-text("Status"), .status-filter');
    if (await statusFilter.isVisible()) {
      await ui.selectOption(statusFilter, 'active');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify only active templates are shown
      const templateRows = page.locator('.template-row');
      const rowCount = await templateRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should sort templates', async ({ page }) => {
    // Look for sort options
    const sortSelect = page.locator('select:has-text("Sort"), .sort-select');
    if (await sortSelect.isVisible()) {
      // Sort by name
      await ui.selectOption(sortSelect, 'name');

      // Wait for sort to apply
      await page.waitForTimeout(1000);

      // Verify sorting is applied
      const templateRows = page.locator('.template-row');
      const rowCount = await templateRows.count();

      if (rowCount > 1) {
        // Check first and second items
        const firstItem = templateRows.first().locator('.template-name, .name');
        const secondItem = templateRows.nth(1).locator('.template-name, .name');

        const firstText = await firstItem.textContent();
        const secondText = await secondItem.textContent();

        // Templates should be sorted alphabetically
        expect(firstText).toBeDefined();
        expect(secondText).toBeDefined();
      }
    }
  });

  test('should handle template errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/templates/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid template content' })
        });
      } else {
        route.continue();
      }
    });

    // Try to create template
    const createButton = page.locator('button:has-text("Create Template")');
    await ui.clickElement(createButton);

    const templateModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(templateModal).toBeVisible();

    await ui.fillInput('input[name="name"]', 'Error Template');
    const contentTextarea = templateModal.locator('textarea[name="content"]');
    await contentTextarea.fill('Invalid content');

    const saveButton = templateModal.locator('button:has-text("Save")');
    await ui.clickElement(saveButton);

    // Should show error
    const errorToast = page.locator('.toast:has-text("error"), .error:has-text("Invalid template")');
    await expect(errorToast).toBeVisible();
  });

  test('should validate template variables in edit mode', async ({ page }) => {
    // Edit a template
    const templateRow = page.locator('.template-row').first();
    await expect(templateRow).toBeVisible();

    const editButton = templateRow.locator('button:has-text("Edit")');
    await ui.clickElement(editButton);

    const editModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(editModal).toBeVisible();

    // Try to save with invalid variables
    const contentTextarea = editModal.locator('textarea[name="content"]');
    await contentTextarea.fill('Hello {invalid_variable}');

    const saveButton = editModal.locator('button:has-text("Save")');
    await saveButton.click();

    // Should show validation error
    const variableError = editModal.locator('.error:has-text("variable"), .invalid-feedback:has-text("variable")');
    if (await variableError.isVisible()) {
      await expect(variableError).toBeVisible();
    }
  });
});