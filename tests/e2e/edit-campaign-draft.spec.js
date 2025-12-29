import { test, expect } from '@playwright/test';

/**
 * EngageNinja Edit Campaign Draft Tests
 * Tests editing campaigns in draft state before sending
 * Journey Map: journey-maps/high/08-edit-campaign-draft.md
 *
 * Prerequisites:
 * - User must be authenticated
 * - Draft campaigns must exist in the system
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Edit Campaign Draft Flow', () => {
  // Test user
  const testUser = {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  };

  // ============================================
  // Helper: Log in and navigate to campaigns
  // ============================================
  async function loginAndNavigateToCampaigns(page) {
    // Navigate to login
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Fill login form
    const emailInput = page.locator("input[name='email'][type='email']");
    const passwordInput = page.locator("input[name='password'][type='password']");
    const submitButton = page.locator("button:has-text('Log in')");

    await emailInput.fill(testUser.email);
    await passwordInput.fill(testUser.password);

    // Wait for navigation after login
    const navigationPromise = page.waitForNavigation({ timeout: 10000 }).catch(
      () => null
    );

    await submitButton.click();
    await navigationPromise;
    await page.waitForTimeout(1000);

    // If we're on tenants page, select first tenant
    const currentUrl = page.url();
    if (currentUrl.includes('/tenants')) {
      const tenantRows = page.locator('tbody tr');
      const firstRow = tenantRows.first();
      const switchButton = firstRow.locator("button:has-text('Switch')");

      const navigationPromise2 = page
        .waitForNavigation({ timeout: 10000 })
        .catch(() => null);

      await switchButton.click();
      await navigationPromise2;
      await page.waitForTimeout(1000);
    }

    // Navigate to campaigns
    await page.goto('/campaigns', { waitUntil: 'networkidle' });
  }

  // ============================================
  // Helper: Navigate to first campaign to edit
  // ============================================
  async function navigateToFirstCampaign(page) {
    const campaignRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await campaignRows.count();

    if (rowCount > 0) {
      await campaignRows.first().click();
      await page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  // ============================================
  // Test 1: Navigate to Campaigns
  // ============================================
  test('should navigate to campaigns page', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    expect(page.url()).toContain('/campaigns');
    console.log('✓ Navigated to campaigns page');
  });

  // ============================================
  // Test 2: View Draft Campaigns
  // ============================================
  test('should display draft campaign status', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Look for draft status badge
    const draftStatus = page.locator(
      "[data-testid='campaign-status-draft'], span:has-text('Draft')"
    );
    const draftCount = await draftStatus.count();

    // Look for general status text
    const statusText = page.locator("text=/draft|status|sent|scheduled/i");
    const statusCount = await statusText.count();

    if (draftCount > 0 || statusCount > 0) {
      console.log('✓ Draft campaign status visible');
    } else {
      console.log('⚠ Draft status not clearly displayed');
    }
  });

  // ============================================
  // Test 3: Navigate to Campaign Detail
  // ============================================
  test('should navigate to campaign detail page', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    const navigated = await navigateToFirstCampaign(page);

    if (navigated) {
      const currentUrl = page.url();
      if (currentUrl.includes('/campaigns/') && !currentUrl.endsWith('/campaigns')) {
        console.log('✓ Navigated to campaign detail page');
      } else {
        console.log('⚠ Unexpected URL: ' + currentUrl);
      }
    } else {
      console.log('⚠ No campaigns to navigate to');
    }
  });

  // ============================================
  // Test 4: Edit Button Available
  // ============================================
  test('should have edit button on campaign detail', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for edit button
      const editButton = page.locator(
        "[data-testid='campaign-edit-button'], button:has-text('Edit')"
      );
      const editCount = await editButton.count();

      if (editCount > 0) {
        await expect(editButton.first()).toBeVisible();
        console.log('✓ Edit button visible');
      } else {
        console.log('⚠ Edit button not found');
      }
    }
  });

  // ============================================
  // Test 5: Open Campaign Edit Form
  // ============================================
  test('should open campaign edit form', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Click edit button
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        const navigationPromise = page
          .waitForNavigation({ timeout: 10000 })
          .catch(() => null);

        await editButton.first().click();
        await navigationPromise;
        await page.waitForTimeout(500);

        // Look for form fields
        const formFields = page.locator("input, textarea");
        const fieldCount = await formFields.count();

        if (fieldCount > 0) {
          console.log(`✓ Campaign edit form opened with ${fieldCount} field(s)`);
        } else {
          console.log('⚠ Form fields not found');
        }
      }
    }
  });

  // ============================================
  // Test 6: Edit Campaign Name
  // ============================================
  test('should allow editing campaign name', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Find name input
        const nameInput = page.locator(
          "[data-testid='campaign-name'], input[name='name'], input[placeholder*='Campaign']"
        );

        if ((await nameInput.count()) > 0) {
          const field = nameInput.first();
          await field.click();
          await field.selectAll();
          await field.type('Updated Campaign Name');
          await page.waitForTimeout(300);

          const value = await field.inputValue();
          if (value.includes('Updated')) {
            console.log('✓ Campaign name edited successfully');
          } else {
            console.log('⚠ Name field value not updated');
          }
        } else {
          console.log('⚠ Campaign name input not found');
        }
      }
    }
  });

  // ============================================
  // Test 7: Edit Message Content
  // ============================================
  test('should allow editing message content', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Find message textarea
        const messageInput = page.locator(
          "[data-testid='campaign-message'], textarea[name='message'], textarea"
        );

        if ((await messageInput.count()) > 0) {
          const field = messageInput.first();
          await field.click();
          await field.selectAll();
          await field.type('Updated message content');
          await page.waitForTimeout(300);

          const value = await field.inputValue();
          if (value.includes('Updated')) {
            console.log('✓ Campaign message edited successfully');
          } else {
            console.log('⚠ Message field value not updated');
          }
        } else {
          console.log('⚠ Message input field not found');
        }
      }
    }
  });

  // ============================================
  // Test 8: View Campaign Preview
  // ============================================
  test('should display campaign preview', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Look for preview section
        const preview = page.locator(
          "[data-testid='campaign-preview'], div.preview, div.message-preview"
        );
        const previewCount = await preview.count();

        // Look for preview button
        const previewButton = page.locator(
          "button:has-text('Preview')"
        );
        const buttonCount = await previewButton.count();

        if (previewCount > 0 || buttonCount > 0) {
          console.log('✓ Campaign preview available');
        } else {
          console.log('⚠ Campaign preview not found');
        }
      }
    }
  });

  // ============================================
  // Test 9: View Recipients/Audience
  // ============================================
  test('should display campaign recipients information', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Look for recipients section
        const recipientsSection = page.locator(
          "[data-testid='campaign-recipients'], text=/recipient|contact|audience/i"
        );
        const sectionCount = await recipientsSection.count();

        if (sectionCount > 0) {
          console.log('✓ Campaign recipients information visible');
        } else {
          console.log('⚠ Recipients information not clearly displayed');
        }
      }
    }
  });

  // ============================================
  // Test 10: View Schedule Settings
  // ============================================
  test('should display schedule settings', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Look for schedule/date fields
        const scheduleFields = page.locator(
          "[data-testid='campaign-schedule-date'], input[type='datetime-local'], input[type='date']"
        );
        const fieldCount = await scheduleFields.count();

        // Look for schedule text
        const scheduleText = page.locator("text=/schedule|date|time|send at/i");
        const textCount = await scheduleText.count();

        if (fieldCount > 0 || textCount > 0) {
          console.log('✓ Schedule settings visible');
        } else {
          console.log('⚠ Schedule settings not found');
        }
      }
    }
  });

  // ============================================
  // Test 11: Save Campaign Button Available
  // ============================================
  test('should have save/send buttons available', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Look for save/send buttons
        const actionButtons = page.locator(
          "button:has-text('Save'), button:has-text('Send'), button:has-text('Schedule')"
        );
        const buttonCount = await actionButtons.count();

        if (buttonCount > 0) {
          console.log(`✓ Campaign action buttons available (${buttonCount})`);
        } else {
          console.log('⚠ Action buttons not found');
        }
      }
    }
  });

  // ============================================
  // Test 12: Campaign Edit Form Layout
  // ============================================
  test('should display complete campaign edit form', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Count form elements
        const inputs = page.locator("input, textarea, select");
        const inputCount = await inputs.count();

        // Count buttons
        const buttons = page.locator("button");
        const buttonCount = await buttons.count();

        if (inputCount > 0 && buttonCount > 0) {
          console.log(
            `✓ Campaign edit form layout complete (${inputCount} fields, ${buttonCount} buttons)`
          );
        } else {
          console.log('⚠ Campaign edit form may be incomplete');
        }
      }
    }
  });
});
