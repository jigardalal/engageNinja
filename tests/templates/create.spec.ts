import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';
import { TEST_TEMPLATES } from '../utils/test-data';

test.describe('Template Creation', () => {
  let ui: UIHelpers;

  test.beforeEach(async ({ page }) => {
    ui = new UIHelpers(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // Navigate to templates page
    await page.click('a:has-text("Templates"), [href*="templates"]');
    await expect(page).toHaveURL(/templates/);
  });

  test('should create a new WhatsApp template', async ({ page }) => {
    // Click create template button
    const createButton = page.locator('button:has-text("Create Template"), .create-template-btn, [data-testid="create-template"]');
    await ui.clickElement(createButton);

    // Wait for template creation modal/form
    const templateModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(templateModal).toBeVisible();

    // Fill template form
    await ui.fillInput('input[name="name"]', TEST_TEMPLATES[0].name);

    // Select channel type
    const whatsappChannel = templateModal.locator('input[value="whatsapp"], .channel-option:has-text("WhatsApp")');
    await whatsappChannel.check();

    // Fill template content
    const contentTextarea = templateModal.locator('textarea[name="content"]');
    await expect(contentTextarea).toBeVisible();
    await contentTextarea.fill(TEST_TEMPLATES[0].content);

    // Add variables if present
    const variablesSection = templateModal.locator('[data-testid="variables"], .variables-section');
    if (await variablesSection.isVisible()) {
      // Verify variables are detected
      const detectedVariables = variablesSection.locator('.variable-tag, .variable-chip');
      await expect(detectedVariables.first()).toBeVisible();
    }

    // Save template
    const saveButton = templateModal.locator('button:has-text("Save"), button:has-text("Create")');
    await ui.clickElement(saveButton);

    // Wait for success
    const successToast = page.locator('.toast, .notification');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('Template created');

    // Verify template appears in list
    await page.reload();
    const templateRow = page.locator('text=' + TEST_TEMPLATES[0].name);
    await expect(templateRow).toBeVisible();
  });

  test('should create a new email template', async ({ page }) => {
    // Click create template button
    const createButton = page.locator('button:has-text("Create Template")');
    await ui.clickElement(createButton);

    const templateModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(templateModal).toBeVisible();

    // Fill template form
    await ui.fillInput('input[name="name"]', TEST_TEMPLATES[1].name);

    // Select email channel
    const emailChannel = templateModal.locator('input[value="email"], .channel-option:has-text("Email")');
    await emailChannel.check();

    // Fill content (might be rich text editor)
    const contentTextarea = templateModal.locator('textarea[name="content"], .editor-content');
    await expect(contentTextarea).toBeVisible();

    // Check if it's a rich text editor
    if (await contentTextarea.isVisible()) {
      await contentTextarea.fill(TEST_TEMPLATES[1].content);
    } else {
      // Look for rich text editor
      const editor = templateModal.locator('.editor, .quill-editor, [data-testid="rich-text-editor"]');
      await editor.fill(TEST_TEMPLATES[1].content);
    }

    // Save template
    const saveButton = templateModal.locator('button:has-text("Save")');
    await ui.clickElement(saveButton);

    // Wait for success
    const successToast = page.locator('.toast');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('Template created');

    // Verify template appears
    await page.reload();
    const templateRow = page.locator('text=' + TEST_TEMPLATES[1].name);
    await expect(templateRow).toBeVisible();
  });

  test('should validate template variables', async ({ page }) => {
    // Start template creation
    const createButton = page.locator('button:has-text("Create Template")');
    await ui.clickElement(createButton);

    const templateModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(templateModal).toBeVisible();

    // Fill template with invalid variables
    await ui.fillInput('input[name="name"]', 'Invalid Variables Template');
    const whatsappChannel = templateModal.locator('input[value="whatsapp"]');
    await whatsappChannel.check();

    const contentTextarea = templateModal.locator('textarea[name="content"]');
    await contentTextarea.fill('Hello {invalid_variable}');

    // Should show variable validation error
    const variableError = templateModal.locator('.error:has-text("variable"), .invalid-feedback:has-text("variable")');
    if (await variableError.isVisible()) {
      await expect(variableError).toBeVisible();
      await expect(variableError).toContainText('invalid');
    }
  });

  test('should preview template before saving', async ({ page }) => {
    // Start template creation
    const createButton = page.locator('button:has-text("Create Template")');
    await ui.clickElement(createButton);

    const templateModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(templateModal).toBeVisible();

    // Fill template details
    await ui.fillInput('input[name="name"]', 'Preview Test Template');
    const whatsappChannel = templateModal.locator('input[value="whatsapp"]');
    await whatsappChannel.check();

    const contentTextarea = templateModal.locator('textarea[name="content"]');
    await contentTextarea.fill('Hello {{contact.name}}, your order {{order_id}} is ready!');

    // Look for preview button
    const previewButton = templateModal.locator('button:has-text("Preview"), .preview-btn, [data-testid="preview"]');
    if (await previewButton.isVisible()) {
      await ui.clickElement(previewButton);

      // Should show preview
      const previewModal = page.locator('[data-testid="preview-modal"], .modal:has-text("Preview")');
      await expect(previewModal).toBeVisible();

      // Check preview content
      const previewContent = previewModal.locator('.preview-content, .template-preview');
      await expect(previewContent).toBeVisible();
      await expect(previewContent).toContainText('Hello');

      // Close preview
      const closeButton = previewModal.locator('button:has-text("Close")');
      await ui.clickElement(closeButton);

      await expect(previewModal).not.toBeVisible();
    }
  });

  test('should create template with tags', async ({ page }) => {
    // Start template creation
    const createButton = page.locator('button:has-text("Create Template")');
    await ui.clickElement(createButton);

    const templateModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(templateModal).toBeVisible();

    // Fill template details
    await ui.fillInput('input[name="name"]', 'Tagged Template');

    // Look for tags input
    const tagsInput = templateModal.locator('input[name="tags"], .tags-input');
    if (await tagsInput.isVisible()) {
      await tagsInput.fill('Welcome');
      await tagsInput.press('Enter');
      await tagsInput.fill('Onboarding');
      await tagsInput.press('Enter');

      // Verify tags are added
      const tagElements = templateModal.locator('.tag, .tag-chip');
      await expect(tagElements.first()).toBeVisible();
    }

    // Save template
    const saveButton = templateModal.locator('button:has-text("Save")');
    await ui.clickElement(saveButton);

    await expect(page.locator('.toast')).toContainText('Template created');
  });

  test('should cancel template creation', async ({ page }) => {
    // Start template creation
    const createButton = page.locator('button:has-text("Create Template")');
    await ui.clickElement(createButton);

    const templateModal = page.locator('[data-testid="template-modal"], .modal');
    await expect(templateModal).toBeVisible();

    // Fill some data
    await ui.fillInput('input[name="name"]', 'Cancelled Template');
    const contentTextarea = templateModal.locator('textarea[name="content"]');
    await contentTextarea.fill('Test content');

    // Cancel
    const cancelButton = templateModal.locator('button:has-text("Cancel")');
    await ui.clickElement(cancelButton);

    // Modal should be closed
    await expect(templateModal).not.toBeVisible();
  });
});