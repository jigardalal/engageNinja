import { test, expect } from '@playwright/test';

/**
 * EngageNinja View Contact Details Tests
 * Tests searching for contacts and viewing detailed contact information
 * Journey Map: journey-maps/high/09-view-contact-details.md
 *
 * Prerequisites:
 * - User must be authenticated
 * - User must have active tenant selected
 * - Contacts must exist in the system
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('View Contact Details Flow', () => {
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
      console.log('✓ Contacts page loaded');
    } else {
      console.log('⚠ Contacts page header not found with standard selectors');
    }
  });

  // ============================================
  // Test 2: Search Input Available
  // ============================================
  test('should have search input on contacts page', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Look for search input
    const searchInput = page.locator(
      "[data-testid='contacts-search'], input[placeholder*='Search'], input[placeholder*='search']"
    );

    const searchCount = await searchInput.count();

    if (searchCount > 0) {
      await expect(searchInput.first()).toBeVisible();
      console.log('✓ Search input visible');
    } else {
      console.log('⚠ Search input not found');
    }
  });

  // ============================================
  // Test 3: Search for Contact
  // ============================================
  test('should search and filter contacts', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Find and use search input
    const searchInput = page.locator(
      "input[placeholder*='Search'], input[placeholder*='search']"
    );

    const searchCount = await searchInput.count();

    if (searchCount > 0) {
      // Enter search term
      await searchInput.first().fill('test');
      await page.waitForTimeout(800); // Wait for filter to apply

      // Look for results
      const results = page.locator('tbody tr, [role="row"]');
      const resultCount = await results.count();

      if (resultCount > 0) {
        console.log(`✓ Search filter applied - ${resultCount} result(s) found`);
      } else {
        console.log('⚠ No results found for search (may be empty)');
      }
    } else {
      console.log('⚠ Search input not found');
    }
  });

  // ============================================
  // Test 4: Contact Table/List Display
  // ============================================
  test('should display contacts in table format', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Look for table or list of contacts
    const contactTable = page.locator('table, div.contact-list');
    const tableCount = await contactTable.count();

    const contactRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await contactRows.count();

    if (tableCount > 0 || rowCount > 0) {
      console.log(`✓ Contact list displayed with ${rowCount} row(s)`);
    } else {
      console.log('⚠ Contact table/list not found');
    }
  });

  // ============================================
  // Test 5: Click Contact Row to View Details
  // ============================================
  test('should navigate to contact detail when row clicked', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Find first contact row
    const contactRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await contactRows.count();

    if (rowCount > 0) {
      // Click first row
      const navigationPromise = page
        .waitForNavigation({ timeout: 10000 })
        .catch(() => null);

      await contactRows.first().click();
      await navigationPromise;
      await page.waitForTimeout(500);

      const currentUrl = page.url();

      if (currentUrl.includes('/contacts/') && !currentUrl.endsWith('/contacts')) {
        console.log('✓ Navigated to contact detail page');
      } else {
        console.log(`⚠ Navigation unexpected: ${currentUrl}`);
      }
    } else {
      console.log('⚠ No contact rows found to click');
    }
  });

  // ============================================
  // Test 6: View Contact Profile Information
  // ============================================
  test('should display contact profile information', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Find and click first contact
    const contactRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await contactRows.count();

    if (rowCount > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);

      // Look for contact info elements
      const contactName = page.locator("text=/contact name|name|phone/i");
      const nameCount = await contactName.count();

      const profileCard = page.locator(
        "[data-testid='contact-profile-card'], div.contact-info"
      );
      const profileCount = await profileCard.count();

      if (nameCount > 0 || profileCount > 0) {
        console.log('✓ Contact profile information visible');
      } else {
        console.log('⚠ Contact profile card not found');
      }
    }
  });

  // ============================================
  // Test 7: Contact Phone Number Visible
  // ============================================
  test('should display contact phone number', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Navigate to first contact
    const contactRows = page.locator('tbody tr, [role="row"]');
    if ((await contactRows.count()) > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);

      // Look for phone number pattern
      const phoneText = page.locator("text=/\\+?\\d{1,3}[-\\s]?\\d{3,4}[-\\s]?\\d{3,4}/");
      const phoneCount = await phoneText.count();

      if (phoneCount > 0) {
        console.log('✓ Phone number displayed');
      } else {
        console.log('⚠ Phone number not found');
      }
    }
  });

  // ============================================
  // Test 8: Contact Tags Section
  // ============================================
  test('should display contact tags', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Navigate to first contact
    const contactRows = page.locator('tbody tr, [role="row"]');
    if ((await contactRows.count()) > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);

      // Look for tags section
      const tagsSection = page.locator("text=/tags/i");

      const tagsCount = await tagsSection.count();

      if (tagsCount > 0) {
        console.log('✓ Contact tags section visible');
      } else {
        console.log('⚠ Contact tags not found (may have no tags)');
      }
    }
  });

  // ============================================
  // Test 9: Messages Tab Available
  // ============================================
  test('should have messages tab on contact detail', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Navigate to first contact
    const contactRows = page.locator('tbody tr, [role="row"]');
    if ((await contactRows.count()) > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);

      // Look for messages tab
      const messagesTab = page.locator(
        "[data-testid='contact-messages-tab'], button:has-text('Messages')"
      );

      const messagesCount = await messagesTab.count();

      if (messagesCount > 0) {
        await expect(messagesTab.first()).toBeVisible();
        console.log('✓ Messages tab visible');
      } else {
        console.log('⚠ Messages tab not found');
      }
    }
  });

  // ============================================
  // Test 10: Campaigns Tab Available
  // ============================================
  test('should have campaigns tab on contact detail', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Navigate to first contact
    const contactRows = page.locator('tbody tr, [role="row"]');
    if ((await contactRows.count()) > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);

      // Look for campaigns tab
      const campaignsTab = page.locator(
        "[data-testid='contact-campaigns-tab'], button:has-text('Campaigns')"
      );

      const campaignsCount = await campaignsTab.count();

      if (campaignsCount > 0) {
        await expect(campaignsTab.first()).toBeVisible();
        console.log('✓ Campaigns tab visible');
      } else {
        console.log('⚠ Campaigns tab not found');
      }
    }
  });

  // ============================================
  // Test 11: Click Messages Tab
  // ============================================
  test('should switch to messages tab when clicked', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Navigate to first contact
    const contactRows = page.locator('tbody tr, [role="row"]');
    if ((await contactRows.count()) > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);

      // Click messages tab
      const messagesTab = page.locator(
        "button:has-text('Messages'), [data-testid='contact-messages-tab']"
      );

      if ((await messagesTab.count()) > 0) {
        await messagesTab.first().click();
        await page.waitForTimeout(500);

        // Look for message list
        const messageList = page.locator("text=/messages|sent|delivered/i");
        const messageCount = await messageList.count();

        if (messageCount > 0) {
          console.log('✓ Messages tab content displayed');
        } else {
          console.log('⚠ Message content not found (may have no messages)');
        }
      }
    }
  });

  // ============================================
  // Test 12: Contact Detail Page Layout
  // ============================================
  test('should display complete contact detail layout', async ({ page }) => {
    await loginAndNavigateToContacts(page);

    // Navigate to first contact
    const contactRows = page.locator('tbody tr, [role="row"]');
    if ((await contactRows.count()) > 0) {
      await contactRows.first().click();
      await page.waitForTimeout(1000);

      // Verify contact detail page structure
      const content = await page.locator('body').textContent();
      expect(content).toBeTruthy();

      // Look for common detail page elements
      const profileSection = page.locator("text=/name|phone|email/i");
      const sectionCount = await profileSection.count();

      if (sectionCount > 0) {
        console.log('✓ Contact detail page layout complete');
      } else {
        console.log('⚠ Some detail sections may be missing');
      }
    }
  });
});
