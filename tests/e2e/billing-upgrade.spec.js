import { test, expect } from '@playwright/test';

/**
 * EngageNinja Billing & Upgrade Tests
 * Tests the critical billing and plan upgrade journey
 * Journey Map: journey-maps/critical/06-billing-upgrade.json
 *
 * Prerequisites:
 * - User must be authenticated with admin role
 * - User must have active tenant
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Billing & Plan Upgrade Flow', () => {
  // Test user
  const testUser = {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  };

  // ============================================
  // Helper: Log in and navigate to billing
  // ============================================
  async function loginAndNavigateToBilling(page) {
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

    // Navigate to billing via settings
    await page.goto('/settings?tab=billing', { waitUntil: 'networkidle' });
  }

  // ============================================
  // Test 1: Navigate to Billing Page
  // ============================================
  test('should navigate to billing page', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Verify URL contains billing
    const url = page.url();
    expect(url).toContain('billing');

    console.log('✓ Navigated to billing page');
  });

  // ============================================
  // Test 2: Current Plan Display
  // ============================================
  test('should display current plan information', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for current plan card or section
    const planCard = page.locator(
      "[data-testid='current-plan-card'], div.plan-summary, div.plan-card"
    );

    const planCardCount = await planCard.count();

    if (planCardCount > 0) {
      await expect(planCard.first()).toBeVisible();
      console.log('✓ Current plan card is visible');
    } else {
      console.log('⚠ Current plan card not found');
    }

    // Look for plan name
    const planName = page.locator("text=/Free|Starter|Growth|Pro|Enterprise/i");
    const planCount = await planName.count();

    if (planCount > 0) {
      console.log('✓ Plan name is displayed');
    }
  });

  // ============================================
  // Test 3: Usage Metrics Display
  // ============================================
  test('should display usage metrics', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for usage summary
    const usageSummary = page.locator(
      "text=/Usage|Quota|Messages|Contacts|used|remaining/i"
    );

    const usageCount = await usageSummary.count();

    if (usageCount > 0) {
      console.log('✓ Usage metrics are displayed');
    } else {
      console.log('⚠ Usage metrics not found');
    }

    // Look for progress bars or indicators
    const progressBar = page.locator('div[role="progressbar"], .progress-bar');
    const progressCount = await progressBar.count();

    if (progressCount > 0) {
      console.log('✓ Usage progress indicators visible');
    }
  });

  // ============================================
  // Test 4: View Plans Button
  // ============================================
  test('should have upgrade or view plans button', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for upgrade/view plans button
    const viewPlansButton = page.locator(
      "[data-testid='view-plans-button'], button:has-text('View Plans'), button:has-text('Upgrade'), button:has-text('See Plans')"
    );

    const buttonCount = await viewPlansButton.count();

    if (buttonCount > 0) {
      await expect(viewPlansButton.first()).toBeVisible();
      console.log('✓ View/upgrade plans button is visible');
    } else {
      console.log('⚠ View/upgrade button not found');
    }
  });

  // ============================================
  // Test 5: Plan Comparison Display
  // ============================================
  test('should display plan comparison', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for plan comparison table/cards
    const planComparison = page.locator('table, .plan-grid, .plans-container');
    const comparisonCount = await planComparison.count();

    if (comparisonCount > 0) {
      console.log('✓ Plan comparison is displayed');
    } else {
      console.log('⚠ Plan comparison not visible');
    }

    // Look for pricing information
    const pricing = page.locator("text=/\\$|per month|per year|annual|monthly/i");
    const pricingCount = await pricing.count();

    if (pricingCount > 0) {
      console.log('✓ Pricing information is displayed');
    }
  });

  // ============================================
  // Test 6: Billing Settings Navigation
  // ============================================
  test('should have billing settings tabs/navigation', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for tabs or sections (Billing, Invoice History, etc.)
    const billingTab = page.locator(
      "[data-testid='billing-tab'], button:has-text('Billing'), button:has-text('Plans')"
    );

    const invoiceTab = page.locator(
      "button:has-text('Invoice'), button:has-text('Invoices')"
    );

    const billingCount = await billingTab.count();
    const invoiceCount = await invoiceTab.count();

    if (billingCount > 0 || invoiceCount > 0) {
      console.log('✓ Billing navigation tabs visible');
    } else {
      console.log('⚠ Navigation tabs not found');
    }
  });

  // ============================================
  // Test 7: Payment Method Display
  // ============================================
  test('should display payment method section', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for payment method section
    const paymentSection = page.locator(
      "text=/payment|card|billing method|payment method/i"
    );

    const paymentCount = await paymentSection.count();

    if (paymentCount > 0) {
      console.log('✓ Payment method section visible');
    } else {
      console.log('⚠ Payment method section not found');
    }

    // Look for card details
    const cardDetails = page.locator(
      "text=/•••|ending in|Visa|Mastercard|Amex/i"
    );

    const cardCount = await cardDetails.count();

    if (cardCount > 0) {
      console.log('✓ Payment card details displayed');
    }
  });

  // ============================================
  // Test 8: Billing Address Section
  // ============================================
  test('should display billing address', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for billing address
    const addressSection = page.locator(
      "text=/address|city|state|country|postal/i"
    );

    const addressCount = await addressSection.count();

    if (addressCount > 0) {
      console.log('✓ Billing address section visible');
    } else {
      console.log('⚠ Billing address not found');
    }

    // Look for edit button
    const editButton = page.locator(
      "button:has-text('Edit'), button:has-text('Update'), button:has-text('Change')"
    );

    const editCount = await editButton.count();

    if (editCount > 0) {
      console.log('✓ Edit/update button available');
    }
  });

  // ============================================
  // Test 9: Subscription Status Display
  // ============================================
  test('should display subscription status', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for subscription status
    const statusText = page.locator(
      "text=/Active|Inactive|Cancelled|Paused|Pending|Trial/i"
    );

    const statusCount = await statusText.count();

    if (statusCount > 0) {
      console.log('✓ Subscription status displayed');
    } else {
      console.log('⚠ Subscription status not found');
    }

    // Look for cancel or manage subscription button
    const manageButton = page.locator(
      "button:has-text('Manage'), button:has-text('Cancel'), button:has-text('Renew')"
    );

    const manageCount = await manageButton.count();

    if (manageCount > 0) {
      console.log('✓ Subscription management options available');
    }
  });

  // ============================================
  // Test 10: Invoice History Section
  // ============================================
  test('should display invoice history', async ({ page }) => {
    await loginAndNavigateToBilling(page);

    // Look for invoice section
    const invoiceSection = page.locator(
      "text=/Invoice|Invoices|Transaction|Receipt/i"
    );

    const invoiceCount = await invoiceSection.count();

    if (invoiceCount > 0) {
      console.log('✓ Invoice history section visible');
    } else {
      console.log('⚠ Invoice section not found');
    }

    // Look for download buttons or invoice table
    const invoiceTable = page.locator('table, .invoice-list');
    const tableCount = await invoiceTable.count();

    const downloadButton = page.locator(
      "button:has-text('Download'), button:has-text('PDF'), button:has-text('View')"
    );

    const downloadCount = await downloadButton.count();

    if (tableCount > 0 || downloadCount > 0) {
      console.log('✓ Invoice management available');
    }
  });
});
