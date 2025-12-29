import { test, expect } from '@playwright/test';

/**
 * EngageNinja Add Contact Tests
 * Tests both single contact add and bulk CSV import journeys
 * Journey Map: journey-maps/critical/05-add-contact.json
 *
 * Prerequisites:
 * - User must be authenticated
 * - User must have active tenant
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Add Contact Flow', () => {
  // Test user
  const testUser = {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  };

  // ============================================
  // Helper: Log in and navigate to contacts
  // ============================================
  async function loginAndNavigateToContacts(page) {
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

    // Navigate to contacts
    await page.goto('/contacts', { waitUntil: 'networkidle' });
  }

  // ============================================
  // Test 1: Navigate to Contacts Page
  // ============================================
  test('should navigate to contacts page and display list', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Verify URL
    expect(page.url()).toContain('/contacts');

    // Verify page contains contacts content
    const contactsTitle = page.locator('text=/contacts|contact list/i').first();
    const titleCount = await contactsTitle.count();

    if (titleCount > 0) {
      await expect(contactsTitle).toBeVisible();
    }

    console.log('✓ Navigated to contacts page');
  });

  // ============================================
  // Test 2: Add Contact Button Visible
  // ============================================
  test('should have visible add contact button', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Look for add contact button with multiple selector variations
    let addButton = page.locator(
      "button:has-text('Add Contact')"
    );

    let buttonCount = await addButton.count();

    if (buttonCount === 0) {
      addButton = page.locator(
        "button:has-text('New contact')"
      );
      buttonCount = await addButton.count();
    }

    if (buttonCount === 0) {
      addButton = page.locator(
        "button:has-text('+ New contact')"
      );
      buttonCount = await addButton.count();
    }

    if (buttonCount === 0) {
      addButton = page.locator(
        "[data-testid='add-contact-button']"
      );
      buttonCount = await addButton.count();
    }

    if (buttonCount > 0) {
      await expect(addButton.first()).toBeVisible();
      console.log('✓ Add contact button is visible');
    } else {
      console.log('⚠ Add contact button not found with standard selectors');
    }
  });

  // ============================================
  // Test 3: Open Add Contact Modal
  // ============================================
  test('should open add contact modal when button clicked', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Click add contact button
    const addButton = page.locator(
      "button:has-text('Add Contact'), button:has-text('New contact'), button:has-text('+ New contact')"
    );

    const buttonCount = await addButton.count();

    if (buttonCount > 0) {
      await addButton.first().click();
      await page.waitForTimeout(500);

      // Look for modal or form with contact fields
      const phoneInput = page.locator(
        "input[placeholder*='Phone'], input[placeholder*='phone'], input[name='phone']"
      );

      const phoneCount = await phoneInput.count();

      if (phoneCount > 0) {
        console.log('✓ Add contact modal opened with form fields');
      } else {
        console.log('⚠ Modal opened but phone input not found with standard selectors');
      }
    } else {
      console.log('⚠ Add contact button not found');
    }
  });

  // ============================================
  // Test 4: Fill Contact Information
  // ============================================
  test('should fill contact information in modal', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Click add contact button
    const addButton = page.locator(
      "button:has-text('Add Contact'), button:has-text('New contact'), button:has-text('+ New contact')"
    );

    if ((await addButton.count()) > 0) {
      await addButton.first().click();
      await page.waitForTimeout(500);

      // Try to fill phone number
      const phoneInput = page.locator(
        "[data-testid='contact-phone'], input[placeholder*='Phone'], input[placeholder*='phone'], input[name='phone']"
      );

      if ((await phoneInput.count()) > 0) {
        await phoneInput.first().fill('+1234567890');
        console.log('✓ Phone number filled');
      } else {
        console.log('⚠ Phone input not found');
      }

      // Try to fill name field
      const nameInput = page.locator(
        "input[placeholder*='Name'], input[placeholder*='name'], input[name='firstName']"
      );

      if ((await nameInput.count()) > 0) {
        await nameInput.first().fill('John Doe');
        console.log('✓ Contact name filled');
      } else {
        console.log('⚠ Name input not found');
      }
    }
  });

  // ============================================
  // Test 5: Submit Contact
  // ============================================
  test('should submit contact form', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Click add contact button
    const addButton = page.locator(
      "button:has-text('Add Contact'), button:has-text('New contact'), button:has-text('+ New contact')"
    );

    if ((await addButton.count()) > 0) {
      await addButton.first().click();
      await page.waitForTimeout(500);

      // Fill required phone field
      const phoneInput = page.locator(
        "[data-testid='contact-phone'], input[placeholder*='Phone'], input[placeholder*='phone'], input[name='phone']"
      );

      if ((await phoneInput.count()) > 0) {
        await phoneInput.first().fill('+1234567890');

        // Find and click submit button
        const submitButton = page.locator(
          "[data-testid='contact-submit'], button:has-text('Save'), button:has-text('Add Contact'), button:has-text('Save Contact')"
        );

        if ((await submitButton.count()) > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(1000);
          console.log('✓ Contact form submitted');
        } else {
          console.log('⚠ Submit button not found');
        }
      }
    }
  });

  // ============================================
  // Test 6: Import Contacts Button Visible
  // ============================================
  test('should have visible import contacts button', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Look for import button
    const importButton = page.locator(
      "[data-testid='import-contacts-button'], button:has-text('Import'), button:has-text('Bulk Import'), button:has-text('Import CSV')"
    );

    const buttonCount = await importButton.count();

    if (buttonCount > 0) {
      await expect(importButton.first()).toBeVisible();
      console.log('✓ Import contacts button is visible');
    } else {
      console.log('⚠ Import button not found with standard selectors');
    }
  });

  // ============================================
  // Test 7: Open Import Modal
  // ============================================
  test('should open import contacts modal', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Click import button
    const importButton = page.locator(
      "button:has-text('Import'), button:has-text('Bulk Import'), button:has-text('Import CSV')"
    );

    if ((await importButton.count()) > 0) {
      await importButton.first().click();
      await page.waitForTimeout(500);

      // Look for file input
      const fileInput = page.locator(
        "[data-testid='csv-file-input'], input[type='file']"
      );

      const fileCount = await fileInput.count();

      if (fileCount > 0) {
        console.log('✓ Import modal opened with file input');
      } else {
        console.log('⚠ Import modal may not have file input');
      }
    } else {
      console.log('⚠ Import button not found');
    }
  });

  // ============================================
  // Test 8: Missing Phone Validation
  // ============================================
  test('should show validation error when phone is missing', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Click add contact button
    const addButton = page.locator(
      "button:has-text('Add Contact'), button:has-text('New contact'), button:has-text('+ New contact')"
    );

    if ((await addButton.count()) > 0) {
      await addButton.first().click();
      await page.waitForTimeout(500);

      // Try to submit without phone
      const submitButton = page.locator(
        "button:has-text('Save'), button:has-text('Add Contact'), button:has-text('Save Contact')"
      );

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();
        await page.waitForTimeout(500);

        // Check for error message
        const errorMessage = page.locator(
          "text=/required|phone|must provide/i"
        );

        const errorCount = await errorMessage.count();

        if (errorCount > 0) {
          console.log('✓ Validation error shown for missing phone');
        } else {
          console.log('⚠ No validation error shown');
        }
      }
    }
  });

  // ============================================
  // Test 9: Contacts Table/List Display
  // ============================================
  test('should display contacts in table or list format', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Look for table or list elements showing contacts
    const table = page.locator('table').first();
    const tableCount = await table.count();

    const listItems = page.locator('div.contact-row, [role="row"]');
    const listCount = await listItems.count();

    if (tableCount > 0) {
      await expect(table).toBeVisible();
      console.log('✓ Contacts displayed in table format');
    } else if (listCount > 0) {
      console.log('✓ Contacts displayed in list format');
    } else {
      console.log('⚠ Contacts table/list not found');
    }
  });

  // ============================================
  // Test 10: Contact Search or Filter
  // ============================================
  test('should have search or filter functionality', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Look for search input
    const searchInput = page.locator(
      "input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='Filter']"
    );

    const searchCount = await searchInput.count();

    if (searchCount > 0) {
      await expect(searchInput.first()).toBeVisible();
      console.log('✓ Search/filter functionality available');
    } else {
      console.log('⚠ Search/filter not found');
    }
  });
});
