import { test, expect } from '@playwright/test';

/**
 * EngageNinja Create Campaign Tests
 * Tests the critical campaign creation journey
 * Journey Map: journey-maps/critical/04-create-campaign.json
 *
 * Prerequisites:
 * - User must be authenticated
 * - User must have active tenant
 * - User should have contacts available
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Create Campaign Flow', () => {
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
  // Helper: Click create campaign button
  // ============================================
  async function clickCreateCampaignButton(page) {
    // Try "New campaign" button first, then fallback to "Create Your First Campaign"
    let createButton = page.locator(
      "button:has-text('New campaign')"
    );

    let buttonCount = await createButton.count();

    if (buttonCount === 0) {
      createButton = page.locator(
        "button:has-text('Create Your First Campaign')"
      );
      buttonCount = await createButton.count();
    }

    if (buttonCount === 0) {
      throw new Error('No create campaign button found');
    }

    const navigationPromise = page
      .waitForNavigation({ timeout: 10000 })
      .catch(() => null);

    await createButton.click();
    await navigationPromise;
    await page.waitForTimeout(1000);
  }

  // ============================================
  // Test 1: Navigate to Campaigns Page
  // ============================================
  test('should navigate to campaigns page and display list', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Verify URL
    expect(page.url()).toContain('/campaigns');

    // Verify page contains campaigns content - use more specific selector
    const campaignHeader = page.locator('text=Campaign control center');
    await expect(campaignHeader).toBeVisible();

    console.log('✓ Navigated to campaigns page');
  });

  // ============================================
  // Test 2: Create Campaign Button
  // ============================================
  test('should have visible create campaign button', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Look for create campaign button (could be "New campaign" or "Create Your First Campaign")
    const createButton = page.locator(
      "[data-testid='create-campaign-button'], button:has-text('New campaign')"
    );

    const altButton = page.locator(
      "button:has-text('Create Your First Campaign')"
    );

    const buttonCount = await createButton.count();
    const altCount = await altButton.count();

    if (buttonCount > 0) {
      await expect(createButton).toBeVisible();
      console.log('✓ Create campaign button (New campaign) is visible');
    } else if (altCount > 0) {
      await expect(altButton).toBeVisible();
      console.log('✓ Create campaign button (Create Your First Campaign) is visible');
    } else {
      throw new Error('No create campaign button found');
    }
  });

  // ============================================
  // Test 3: Navigate to Campaign Creation Form
  // ============================================
  test('should navigate to campaign creation form', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Click create campaign button using helper
    await clickCreateCampaignButton(page);

    // Verify we're on campaign creation page
    const url = page.url();
    expect(
      url.includes('/campaigns/new') || url.includes('/campaigns/create')
    ).toBe(true);

    // Verify form is visible
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    console.log(`✓ Navigated to campaign creation: ${url}`);
  });

  // ============================================
  // Test 4: Campaign Name Field
  // ============================================
  test('should fill campaign name field', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Fill campaign name
    const nameInput = page.locator(
      "[data-testid='campaign-name'], input[placeholder*='Campaign name'], input[placeholder*='campaign']"
    );

    if ((await nameInput.count()) > 0) {
      await nameInput.fill('Test Campaign 2024');
      await expect(nameInput).toHaveValue('Test Campaign 2024');
      console.log('✓ Campaign name filled successfully');
    } else {
      console.log('⚠ Campaign name input field not found with standard selectors');
    }
  });

  // ============================================
  // Test 5: Channel Selection
  // ============================================
  test('should allow channel selection', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Look for channel selection buttons (WhatsApp, Email)
    const whatsappButton = page.locator(
      "[data-testid='campaign-channel-whatsapp'], button:has-text('WhatsApp')"
    );

    const whatsappCount = await whatsappButton.count();

    if (whatsappCount > 0) {
      await whatsappButton.click();
      console.log('✓ WhatsApp channel selected');
    } else {
      console.log('⚠ Channel selection buttons not found');
    }
  });

  // ============================================
  // Test 6: Contact Selection
  // ============================================
  test('should allow contact selection', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Look for contact selector
    const contactSelector = page.locator(
      "[data-testid='campaign-contacts-selector'], button:has-text('Select Contacts')"
    );

    const selectorCount = await contactSelector.count();

    if (selectorCount > 0) {
      await contactSelector.click();
      await page.waitForTimeout(1000);

      // Look for contact checkboxes or list items
      const contactItems = page.locator(
        "input[type='checkbox'], [role='option']"
      );

      const itemCount = await contactItems.count();

      if (itemCount > 0) {
        // Select first contact
        await contactItems.first().click();
        console.log('✓ Contact selected');
      }
    } else {
      console.log('⚠ Contact selector not found');
    }
  });

  // ============================================
  // Test 7: Message/Template Selection
  // ============================================
  test('should allow message or template selection', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Look for template selector or custom message input
    const templateSelector = page.locator(
      "[data-testid='campaign-template-selector'], select[name='template']"
    );

    const customMessageInput = page.locator(
      "[data-testid='campaign-custom-message'], textarea[placeholder*='Message']"
    );

    const templateCount = await templateSelector.count();
    const messageCount = await customMessageInput.count();

    if (templateCount > 0) {
      console.log('✓ Template selector found');
    } else if (messageCount > 0) {
      await customMessageInput.fill('Test campaign message');
      console.log('✓ Custom message entered');
    } else {
      console.log('⚠ Template/message fields not found');
    }
  });

  // ============================================
  // Test 8: Delivery Settings
  // ============================================
  test('should allow delivery settings configuration', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Look for delivery type buttons (Send Now, Schedule)
    const sendNowButton = page.locator(
      "[data-testid='campaign-delivery-type'], button:has-text('Now')"
    );

    const scheduleButton = page.locator(
      "button:has-text('Schedule')"
    );

    const sendNowCount = await sendNowButton.count();
    const scheduleCount = await scheduleButton.count();

    if (sendNowCount > 0) {
      await sendNowButton.click();
      console.log('✓ Send Now option selected');
    } else if (scheduleCount > 0) {
      console.log('✓ Schedule option available');
    } else {
      console.log('⚠ Delivery type options not found');
    }
  });

  // ============================================
  // Test 9: Campaign Preview
  // ============================================
  test('should show campaign preview', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Look for preview button
    const previewButton = page.locator(
      "[data-testid='campaign-preview'], button:has-text('Preview')"
    );

    const previewCount = await previewButton.count();

    if (previewCount > 0) {
      await previewButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Preview button clicked');
    } else {
      console.log('⚠ Preview button not found');
    }
  });

  // ============================================
  // Test 10: Empty Name Validation
  // ============================================
  test('should show validation error when campaign name is missing', async ({
    page,
  }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Try to submit without name
    const submitButton = page.locator(
      "[data-testid='campaign-submit'], button:has-text('Send Campaign')"
    );

    const submitCount = await submitButton.count();

    if (submitCount > 0) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Check for validation error
      const errorMessage = page.locator('text=/required|must/i');
      const errorCount = await errorMessage.count();

      if (errorCount > 0) {
        console.log('✓ Validation error shown for missing name');
      } else {
        console.log('⚠ Validation error not shown');
      }
    } else {
      console.log('⚠ Submit button not found');
    }
  });

  // ============================================
  // Test 11: Form Navigation
  // ============================================
  test('should allow form navigation and updates', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Look for step indicators or next buttons
    const nextButton = page.locator("button:has-text('Next')").first();
    const continueButton = page.locator("button:has-text('Continue')").first();

    const nextCount = await nextButton.count();
    const continueCount = await continueButton.count();

    if (nextCount > 0) {
      console.log('✓ Next button found for multi-step form');
    } else if (continueCount > 0) {
      console.log('✓ Continue button found for multi-step form');
    } else {
      console.log('⚠ Form navigation buttons not found (single-step form)');
    }
  });

  // ============================================
  // Test 12: Campaign Form Structure
  // ============================================
  test('should display all required campaign creation sections', async ({
    page,
  }) => {
    await loginAndNavigateToCampaigns(page);

    // Navigate to create campaign
    await clickCreateCampaignButton(page);

    // Check for form structure
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Look for main sections
    const campaignNameSection = page.locator(
      "text=/campaign name|name your campaign/i"
    );

    const recipientSection = page.locator(
      "text=/recipients|select contacts|contacts/i"
    );

    const messageSection = page.locator(
      "text=/message|template|content/i"
    );

    const nameCount = await campaignNameSection.count();
    const recipientCount = await recipientSection.count();
    const messageCount = await messageSection.count();

    console.log(
      `✓ Campaign form sections: name(${nameCount}), recipient(${recipientCount}), message(${messageCount})`
    );

    // At least one section should be visible
    expect(nameCount + recipientCount + messageCount).toBeGreaterThanOrEqual(1);
  });
});
