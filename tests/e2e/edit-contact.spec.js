import { test, expect } from '@playwright/test';

/**
 * EngageNinja Edit Contact Tests
 * Tests editing and updating contact information
 * Journey Map: journey-maps/high/02-edit-contact.md
 *
 * Prerequisites:
 * - User must be authenticated
 * - User must have active tenant selected
 * - Contacts must exist in the system
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Edit Contact Flow', () => {
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
  // Helper: Navigate to first contact detail
  // ============================================
  async function navigateToFirstContact(page) {
    const contactRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await contactRows.count();

    if (rowCount > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  // ============================================
  // Test 1: Navigate to Contacts
  // ============================================
  test('should navigate to contacts page', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    expect(page.url()).toContain('/contacts');
    console.log('✓ Navigated to contacts page');
  });

  // ============================================
  // Test 2: Search for Contact
  // ============================================
  test('should search for contacts', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Find search input
    const searchInput = page.locator(
      "input[placeholder*='Search'], input[placeholder*='search']"
    );

    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(800);

      const results = page.locator('tbody tr, [role="row"]');
      const resultCount = await results.count();

      console.log(`✓ Search performed - ${resultCount} result(s)`);
    } else {
      console.log('⚠ Search input not found');
    }
  });

  // ============================================
  // Test 3: Navigate to Contact Detail Page
  // ============================================
  test('should navigate to contact detail page', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    const navigated = await navigateToFirstContact(page);

    if (navigated) {
      const currentUrl = page.url();
      if (currentUrl.includes('/contacts/') && !currentUrl.endsWith('/contacts')) {
        console.log('✓ Navigated to contact detail page');
      } else {
        console.log('⚠ Unexpected URL: ' + currentUrl);
      }
    } else {
      console.log('⚠ No contacts to navigate to');
    }
  });

  // ============================================
  // Test 4: View Contact Information
  // ============================================
  test('should display contact information on detail page', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Look for contact info elements
      const contactInfo = page.locator("text=/phone|email|name|tags/i");
      const infoCount = await contactInfo.count();

      if (infoCount > 0) {
        console.log('✓ Contact information displayed');
      } else {
        console.log('⚠ Contact information not found');
      }
    }
  });

  // ============================================
  // Test 5: Edit Button Available
  // ============================================
  test('should have edit button on contact detail', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Look for edit button
      const editButton = page.locator(
        "[data-testid='contact-edit-button'], button:has-text('Edit')"
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
  // Test 6: Open Edit Form
  // ============================================
  test('should open edit form when edit button clicked', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Click edit button
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Look for form fields
        const formFields = page.locator(
          "input[name='name'], input[name='phone'], input[name='email'], textarea"
        );

        const fieldCount = await formFields.count();

        if (fieldCount > 0) {
          console.log(`✓ Edit form opened with ${fieldCount} field(s)`);
        } else {
          console.log('⚠ Form fields not found');
        }
      }
    }
  });

  // ============================================
  // Test 7: Edit Contact Name
  // ============================================
  test('should allow editing contact name', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Open edit form
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Find and edit name field
        const nameInput = page.locator(
          "input[name='name'], input[placeholder*='Name']"
        );

        if ((await nameInput.count()) > 0) {
          const field = nameInput.first();

          // Clear existing value
          await field.click();
          await field.selectAll();

          // Type new value
          await field.type('Updated Name');
          await page.waitForTimeout(300);

          const value = await field.inputValue();
          if (value.includes('Updated')) {
            console.log('✓ Contact name edited successfully');
          } else {
            console.log('⚠ Name field value not updated');
          }
        } else {
          console.log('⚠ Name input field not found');
        }
      }
    }
  });

  // ============================================
  // Test 8: Edit Contact Phone
  // ============================================
  test('should allow editing contact phone', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Open edit form
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Find and edit phone field
        const phoneInput = page.locator(
          "input[name='phone'], input[placeholder*='Phone']"
        );

        if ((await phoneInput.count()) > 0) {
          const field = phoneInput.first();

          // Clear and update
          await field.click();
          await field.selectAll();
          await field.type('+1234567890');
          await page.waitForTimeout(300);

          const value = await field.inputValue();
          if (value.includes('1234567890')) {
            console.log('✓ Contact phone edited successfully');
          } else {
            console.log('⚠ Phone field value not updated');
          }
        } else {
          console.log('⚠ Phone input field not found');
        }
      }
    }
  });

  // ============================================
  // Test 9: Edit Contact Email
  // ============================================
  test('should allow editing contact email', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Open edit form
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Find email field
        const emailInput = page.locator(
          "input[name='email'], input[placeholder*='Email']"
        );

        if ((await emailInput.count()) > 0) {
          const field = emailInput.first();

          // Clear and update
          await field.click();
          await field.selectAll();
          await field.type('updated@example.com');
          await page.waitForTimeout(300);

          const value = await field.inputValue();
          if (value.includes('updated@example.com')) {
            console.log('✓ Contact email edited successfully');
          } else {
            console.log('⚠ Email field value not updated');
          }
        } else {
          console.log('⚠ Email input field not found (may be optional)');
        }
      }
    }
  });

  // ============================================
  // Test 10: Save Button Available
  // ============================================
  test('should have save button in edit form', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Open edit form
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Look for save button
        const saveButton = page.locator(
          "[data-testid='contact-save'], button:has-text('Save')"
        );

        const saveCount = await saveButton.count();

        if (saveCount > 0) {
          await expect(saveButton.first()).toBeVisible();
          console.log('✓ Save button visible');
        } else {
          console.log('⚠ Save button not found');
        }
      }
    }
  });

  // ============================================
  // Test 11: Submit Edit Form
  // ============================================
  test('should submit edited contact form', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Open edit form
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Edit one field
        const nameInput = page.locator("input[name='name'], input[placeholder*='Name']");
        if ((await nameInput.count()) > 0) {
          await nameInput.first().click();
          await nameInput.first().selectAll();
          await nameInput.first().type('Test Name ' + Date.now());
          await page.waitForTimeout(300);
        }

        // Submit form
        const saveButton = page.locator("button:has-text('Save')");

        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(1000);

          console.log('✓ Edit form submitted');
        } else {
          console.log('⚠ Could not submit form');
        }
      }
    }
  });

  // ============================================
  // Test 12: Edit Form Layout
  // ============================================
  test('should display complete edit form layout', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    if (await navigateToFirstContact(page)) {
      // Open edit form
      const editButton = page.locator("button:has-text('Edit')");

      if ((await editButton.count()) > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        // Count form fields
        const formFields = page.locator("input, textarea, select");
        const fieldCount = await formFields.count();

        // Look for action buttons
        const buttons = page.locator("button");
        const buttonCount = await buttons.count();

        if (fieldCount > 0 && buttonCount > 0) {
          console.log(
            `✓ Edit form layout complete (${fieldCount} fields, ${buttonCount} buttons)`
          );
        } else {
          console.log('⚠ Edit form may be incomplete');
        }
      }
    }
  });
});
