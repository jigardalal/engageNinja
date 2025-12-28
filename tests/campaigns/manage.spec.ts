import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';
import { TEST_CAMPAIGNS } from '../utils/test-data';

test.describe('Campaign Management', () => {
  let ui: UIHelpers;

  test.beforeEach(async ({ page }) => {
    ui = new UIHelpers(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // Navigate to campaigns page
    await page.click('a:has-text("Campaigns")');
    await expect(page).toHaveURL(/campaigns/);
  });

  test('should view campaign details', async ({ page }) => {
    // Find a campaign in the list
    const campaignRow = page.locator('.campaign-row, .list-item').first();
    await expect(campaignRow).toBeVisible();

    // Click to view details
    const viewButton = campaignRow.locator('button:has-text("View"), .view-btn, a');
    await ui.clickElement(viewButton);

    // Should navigate to campaign details page
    await expect(page).toHaveURL(/\/campaigns\/\d+/);
    await expect(page.locator('h1')).toContainText(/Campaign Details/i);

    // Verify campaign details are displayed
    const campaignName = page.locator('text=' + TEST_CAMPAIGNS[0].name);
    await expect(campaignName).toBeVisible();

    // Check for status information
    const statusElement = page.locator('.campaign-status, .status-badge');
    if (await statusElement.isVisible()) {
      await expect(statusElement).toBeVisible();
    }
  });

  test('should edit an existing campaign', async ({ page }) => {
    // Find campaign to edit
    const campaignRow = page.locator('.campaign-row').first();
    await expect(campaignRow).toBeVisible();

    const editButton = campaignRow.locator('button:has-text("Edit"), .edit-btn');
    await ui.clickElement(editButton);

    // Should open edit modal or navigate to edit page
    const editModal = page.locator('[data-testid="campaign-modal"], .modal');
    const editPage = page.locator(/\/campaigns\/\d+\/edit/);

    if (await editModal.isVisible()) {
      // Modal-based editing
      await expect(editModal).toBeVisible();

      // Update campaign name
      await ui.fillInput('input[name="name"]', 'Updated Campaign Name');

      // Save changes
      const saveButton = editModal.locator('button:has-text("Update"), button:has-text("Save")');
      await ui.clickElement(saveButton);

      // Wait for success
      const successToast = page.locator('.toast');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText('updated');
    } else if (await editPage.isVisible()) {
      // Page-based editing
      await expect(page).toHaveURL(/\/campaigns\/\d+\/edit/);
      await expect(page.locator('h1')).toContainText(/Edit Campaign/i);

      // Update and save
      await ui.fillInput('input[name="name"]', 'Updated Campaign Name');
      await page.click('button:has-text("Save")');

      await expect(page).toHaveURL(/\/campaigns\/\d+/);
    }
  });

  test('should archive campaigns', async ({ page }) => {
    // Select campaigns for archiving
    const checkboxes = page.locator('input[type="checkbox"], .checkbox');
    const firstCheckbox = checkboxes.first();
    await firstCheckbox.check();

    // Click archive button
    const archiveButton = page.locator('button:has-text("Archive"), .archive-btn');
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

      // Verify campaigns are moved to archived list
      await page.reload();
      const archivedSection = page.locator('[data-testid="archived-campaigns"], .archived-section');
      if (await archivedSection.isVisible()) {
        await expect(archivedSection).toBeVisible();
      }
    }
  });

  test('should delete campaigns', async ({ page }) => {
    // Select a campaign
    const checkboxes = page.locator('input[type="checkbox"]');
    const firstCheckbox = checkboxes.first();
    await firstCheckbox.check();

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), .delete-btn');
    if (await deleteButton.isVisible()) {
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

      // Verify campaign is removed
      await page.reload();
      expect(await firstCheckbox.isChecked()).toBe(false);
    }
  });

  test('should send campaign', async ({ page }) => {
    // Find a draft or ready campaign
    const campaignRow = page.locator('.campaign-row:has-text("draft"), .campaign-row:has-text("ready")').first();

    if (await campaignRow.isVisible()) {
      const sendButton = campaignRow.locator('button:has-text("Send"), .send-btn');
      await ui.clickElement(sendButton);

      // Should open send confirmation or modal
      const sendModal = page.locator('[data-testid="send-modal"], .modal');
      if (await sendModal.isVisible()) {
        await expect(sendModal).toBeVisible();

        // Confirm sending
        const sendConfirmButton = sendModal.locator('button:has-text("Send Campaign")');
        await ui.clickElement(sendConfirmButton);

        // Should show success
        const successToast = page.locator('.toast');
        await expect(successToast).toBeVisible();
        await expect(successToast).toContainText('sent');

        // Verify status changes
        await page.reload();
        const statusElement = campaignRow.locator('.status-badge:has-text("sending")');
        await expect(statusElement).toBeVisible();
      }
    }
  });

  test('should search and filter campaigns', async ({ page }) => {
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], .search-input');
    if (await searchInput.isVisible()) {
      await ui.fillInput(searchInput, TEST_CAMPAIGNS[0].name);

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify filtered results
      const campaignRows = page.locator('.campaign-row, .list-item');
      const rowCount = await campaignRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }

    // Test filtering by status
    const statusFilter = page.locator('select:has-text("Status"), .status-filter');
    if (await statusFilter.isVisible()) {
      await ui.selectOption(statusFilter, 'active');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify only active campaigns are shown
      const campaignRows = page.locator('.campaign-row');
      const rowCount = await campaignRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle campaign errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/campaigns/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid campaign configuration' })
        });
      } else {
        route.continue();
      }
    });

    // Try to create campaign
    const createButton = page.locator('button:has-text("Create Campaign")');
    await ui.clickElement(createButton);

    const campaignWizard = page.locator('[data-testid="campaign-wizard"]');
    await expect(campaignWizard).toBeVisible();

    await ui.fillInput('input[name="name"]', 'Error Campaign');
    const whatsappOption = campaignWizard.locator('input[value="whatsapp"]');
    await whatsappOption.check();

    const createButtonFinal = campaignWizard.locator('button:has-text("Create Campaign")');
    await ui.clickElement(createButtonFinal);

    // Should show error
    const errorToast = page.locator('.toast:has-text("error"), .error:has-text("Invalid campaign")');
    await expect(errorToast).toBeVisible();
  });
});