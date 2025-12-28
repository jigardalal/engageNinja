import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';
import { TEST_CONTACTS, generateRandomEmail } from '../utils/test-data';

test.describe('Contact Creation', () => {
  let ui: UIHelpers;

  test.beforeEach(async ({ page }) => {
    ui = new UIHelpers(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // Navigate to contacts page
    await page.click('a:has-text("Contacts"), button:has-text("Contacts"), [href*="contacts"]');
    await expect(page).toHaveURL(/contacts/);
  });

  test('should create a new contact with valid data', async ({ page }) => {
    // Click create contact button
    const createButton = page.locator('button:has-text("Add Contact"), .create-contact-btn, [data-testid="create-contact"]');
    await ui.clickElement(createButton);

    // Wait for modal/form to appear
    const modal = page.locator('[data-testid="contact-modal"], .modal, .contact-form');
    await expect(modal).toBeVisible();

    // Fill contact form
    const contact = TEST_CONTACTS[0];
    await ui.fillInput('input[name="name"]', contact.name);
    await ui.fillInput('input[name="email"]', contact.email);
    await ui.fillInput('input[name="phone"]', contact.phone);

    // Handle tags if present
    const tagsInput = page.locator('input[name="tags"], .tags-input');
    if (await tagsInput.isVisible()) {
      for (const tag of contact.tags) {
        await tagsInput.fill(tag);
        await tagsInput.press('Enter');
      }
    }

    // Handle consent checkbox
    const consentCheckbox = page.locator('input[name="consent"], input[name="gdprConsent"]');
    if (await consentCheckbox.isVisible()) {
      await consentCheckbox.check();
    }

    // Submit form
    const submitButton = modal.locator('button:has-text("Save"), button[type="submit"]');
    await ui.clickElement(submitButton);

    // Wait for success
    const successToast = page.locator('.toast, .notification, [role="alert"]');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('Contact created');

    // Verify contact appears in list
    await page.reload();
    const contactRow = page.locator('text=' + contact.name);
    await expect(contactRow).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Click create contact button
    const createButton = page.locator('button:has-text("Add Contact"), .create-contact-btn');
    await ui.clickElement(createButton);

    // Wait for modal
    const modal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(modal).toBeVisible();

    // Try to submit without filling required fields
    const submitButton = modal.locator('button:has-text("Save"), button[type="submit"]');
    await ui.clickElement(submitButton);

    // Check for validation errors
    const nameError = modal.locator('.error:has-text("name"), .invalid-feedback:has-text("name")');
    const emailError = modal.locator('.error:has-text("email"), .invalid-feedback:has-text("email")');

    const hasNameError = await nameError.isVisible();
    const hasEmailError = await emailError.isVisible();

    expect(hasNameError || hasEmailError).toBe(true);
  });

  test('should validate email format', async ({ page }) => {
    // Click create contact button
    const createButton = page.locator('button:has-text("Add Contact")');
    await ui.clickElement(createButton);

    // Wait for modal
    const modal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(modal).toBeVisible();

    // Fill with invalid email
    await ui.fillInput('input[name="email"]', 'invalid-email');

    // Check for email validation error
    const emailError = modal.locator('.error:has-text("email"), .invalid-feedback:has-text("email")');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText('valid');
  });

  test('should show duplicate contact error', async ({ page }) => {
    // First, create a contact
    const createButton = page.locator('button:has-text("Add Contact")');
    await ui.clickElement(createButton);

    const modal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(modal).toBeVisible();

    const contact = TEST_CONTACTS[0];
    await ui.fillInput('input[name="name"]', contact.name);
    await ui.fillInput('input[name="email"]', contact.email);
    await ui.fillInput('input[name="phone"]', contact.phone);

    const submitButton = modal.locator('button:has-text("Save")');
    await ui.clickElement(submitButton);

    await expect(page.locator('.toast')).toContainText('Contact created');

    // Try to create duplicate
    await createButton.click();
    await expect(modal).toBeVisible();

    // Fill same data
    await ui.fillInput('input[name="email"]', contact.email);

    // Should show duplicate error
    const duplicateError = modal.locator('.error:has-text("already exists"), .error:has-text("duplicate")');
    await expect(duplicateError).toBeVisible();
    await expect(duplicateError).toContainText('already exists');
  });

  test('should cancel contact creation', async ({ page }) => {
    // Click create contact button
    const createButton = page.locator('button:has-text("Add Contact")');
    await ui.clickElement(createButton);

    // Wait for modal
    const modal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(modal).toBeVisible();

    // Fill some data
    await ui.fillInput('input[name="name"]', 'Test Contact');
    await ui.fillInput('input[name="email"]', generateRandomEmail());

    // Cancel
    const cancelButton = modal.locator('button:has-text("Cancel")');
    await ui.clickElement(cancelButton);

    // Modal should be closed
    await expect(modal).not.toBeVisible();
  });

  test('should create contact with tags', async ({ page }) => {
    // Click create contact button
    const createButton = page.locator('button:has-text("Add Contact")');
    await ui.clickElement(createButton);

    const modal = page.locator('[data-testid="contact-modal"], .modal');
    await expect(modal).toBeVisible();

    const contact = TEST_CONTACTS[0];
    await ui.fillInput('input[name="name"]', contact.name);
    await ui.fillInput('input[name="email"]', contact.email);

    // Add tags
    const tagsInput = page.locator('input[name="tags"], .tags-input');
    if (await tagsInput.isVisible()) {
      for (const tag of contact.tags) {
        await tagsInput.fill(tag);
        await tagsInput.press('Enter');
      }

      // Verify tags are added
      const tagElements = modal.locator('.tag, .tag-chip');
      await expect(tagElements.first()).toBeVisible();
    }

    const submitButton = modal.locator('button:has-text("Save")');
    await ui.clickElement(submitButton);

    await expect(page.locator('.toast')).toContainText('Contact created');
  });
});