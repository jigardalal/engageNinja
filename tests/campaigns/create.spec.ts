import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';
import { TEST_CAMPAIGNS } from '../utils/test-data';

test.describe('Campaign Creation', () => {
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

  test('should create a new campaign - WhatsApp', async ({ page }) => {
    // Click create campaign button
    const createButton = page.locator('button:has-text("Create Campaign"), .create-campaign-btn, [data-testid="create-campaign"]');
    await ui.clickElement(createButton);

    // Wait for campaign creation modal/wizard
    const campaignWizard = page.locator('[data-testid="campaign-wizard"], .campaign-modal, .modal');
    await expect(campaignWizard).toBeVisible();

    // Step 1: Basic Information
    await ui.fillInput('input[name="name"]', TEST_CAMPAIGNS[0].name);

    // Select WhatsApp channel
    const whatsappOption = campaignWizard.locator('input[value="whatsapp"], .channel-option:has-text("WhatsApp")');
    await whatsappOption.check();

    // Click next
    const nextButton = campaignWizard.locator('button:has-text("Next")');
    await ui.clickElement(nextButton);

    // Step 2: Template Selection (if available)
    const templateSection = campaignWizard.locator('[data-testid="template-selection"], .template-selection');
    if (await templateSection.isVisible()) {
      // Select a template or create new
      const createTemplateOption = templateSection.locator('button:has-text("Create New"), .create-template-btn');
      await ui.clickElement(createTemplateOption);

      // Fill template details
      const templateModal = page.locator('[data-testid="template-modal"], .modal');
      await expect(templateModal).toBeVisible();

      await ui.fillInput('input[name="name"]', 'Test WhatsApp Template');
      await ui.fillInput('textarea[name="content"]', 'Hello {{contact.name}}, welcome to our service!');

      // Save template
      const saveTemplateButton = templateModal.locator('button:has-text("Save")');
      await ui.clickElement(saveTemplateButton);

      // Wait for template to be selected
      await expect(templateModal).not.toBeVisible();
      await expect(campaignWizard).toBeVisible();
    }

    // Continue to next steps or finish
    const finishButton = campaignWizard.locator('button:has-text("Create Campaign"), button:has-text("Finish")');
    await ui.clickElement(finishButton);

    // Wait for success
    const successToast = page.locator('.toast, .notification');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('Campaign created');

    // Verify campaign appears in list
    await page.reload();
    const campaignRow = page.locator('text=' + TEST_CAMPAIGNS[0].name);
    await expect(campaignRow).toBeVisible();
  });

  test('should create a new campaign - Email', async ({ page }) => {
    // Click create campaign button
    const createButton = page.locator('button:has-text("Create Campaign")');
    await ui.clickElement(createButton);

    // Wait for campaign wizard
    const campaignWizard = page.locator('[data-testid="campaign-wizard"], .campaign-modal');
    await expect(campaignWizard).toBeVisible();

    // Step 1: Basic Information
    await ui.fillInput('input[name="name"]', TEST_CAMPAIGNS[1].name);

    // Select Email channel
    const emailOption = campaignWizard.locator('input[value="email"], .channel-option:has-text("Email")');
    await emailOption.check();

    // Click next
    const nextButton = campaignWizard.locator('button:has-text("Next")');
    await ui.clickElement(nextButton);

    // Step 2: Template Selection
    const templateSection = campaignWizard.locator('[data-testid="template-selection"]');
    if (await templateSection.isVisible()) {
      // Select or create template
      const selectTemplateButton = templateSection.locator('button:has-text("Select Template")');
      await ui.clickElement(selectTemplateButton);

      const templateModal = page.locator('[data-testid="template-modal"]');
      await expect(templateModal).toBeVisible();

      await ui.fillInput('input[name="name"]', 'Test Email Template');
      await ui.fillInput('textarea[name="content"]', '<h1>Hello {{contact.name}}</h1><p>Welcome!</p>');

      const saveButton = templateModal.locator('button:has-text("Save")');
      await ui.clickElement(saveButton);

      await expect(templateModal).not.toBeVisible();
    }

    // Continue to audience selection
    const audienceButton = campaignWizard.locator('button:has-text("Next")');
    await ui.clickElement(audienceButton);

    // Select audience
    const audienceSection = campaignWizard.locator('[data-testid="audience-selection"]');
    await expect(audienceSection).toBeVisible();

    // Continue to review/create
    const createButton = campaignWizard.locator('button:has-text("Create Campaign")');
    await ui.clickElement(createButton);

    // Wait for success
    const successToast = page.locator('.toast');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('Campaign created');
  });

  test('should validate required fields in campaign creation', async ({ page }) => {
    // Start campaign creation
    const createButton = page.locator('button:has-text("Create Campaign")');
    await ui.clickElement(createButton);

    const campaignWizard = page.locator('[data-testid="campaign-wizard"]');
    await expect(campaignWizard).toBeVisible();

    // Try to skip name field
    const nextButton = campaignWizard.locator('button:has-text("Next")');
    await ui.clickElement(nextButton);

    // Should show validation error
    const nameError = campaignWizard.locator('.error:has-text("name"), .invalid-feedback:has-text("name")');
    await expect(nameError).toBeVisible();
  });

  test('should create campaign draft', async ({ page }) => {
    // Click create campaign button
    const createButton = page.locator('button:has-text("Create Campaign")');
    await ui.clickElement(createButton);

    const campaignWizard = page.locator('[data-testid="campaign-wizard"]');
    await expect(campaignWizard).toBeVisible();

    // Fill basic info
    await ui.fillInput('input[name="name"]', 'Test Draft Campaign');

    // Select channel
    const whatsappOption = campaignWizard.locator('input[value="whatsapp"]');
    await whatsappOption.check();

    // Save as draft instead of creating
    const saveDraftButton = campaignWizard.locator('button:has-text("Save Draft"), .save-draft-btn');
    if (await saveDraftButton.isVisible()) {
      await ui.clickElement(saveDraftButton);

      // Should show success
      const successToast = page.locator('.toast');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText('draft');
    }
  });

  test('should navigate through campaign wizard steps', async ({ page }) => {
    // Start campaign creation
    const createButton = page.locator('button:has-text("Create Campaign")');
    await ui.clickElement(createButton);

    const campaignWizard = page.locator('[data-testid="campaign-wizard"]');
    await expect(campaignWizard).toBeVisible();

    // Fill step 1
    await ui.fillInput('input[name="name"]', 'Multi-Step Campaign');
    const whatsappOption = campaignWizard.locator('input[value="whatsapp"]');
    await whatsappOption.check();

    // Navigate to step 2
    let nextButton = campaignWizard.locator('button:has-text("Next")');
    await ui.clickElement(nextButton);

    // Navigate back to step 1
    const prevButton = campaignWizard.locator('button:has-text("Previous")');
    await ui.clickElement(prevButton);

    // Verify we're back on step 1
    await expect(campaignWizard.locator('input[name="name"]')).toBeVisible();

    // Navigate forward again
    nextButton = campaignWizard.locator('button:has-text("Next")');
    await ui.clickElement(nextButton);

    // Should be on step 2
    await expect(campaignWizard).toBeVisible();
  });
});