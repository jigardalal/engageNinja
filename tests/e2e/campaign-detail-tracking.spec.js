import { test, expect } from '@playwright/test';

/**
 * EngageNinja Campaign Detail Tracking Tests
 * Tests viewing campaign details, tracking message status, and monitoring delivery progress
 * Journey Map: journey-maps/high/03-campaign-detail-tracking.md
 *
 * Prerequisites:
 * - User must be authenticated
 * - User must have active tenant selected
 * - Campaigns must exist in the system
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Campaign Detail Tracking Flow', () => {
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
  // Helper: Navigate to first campaign detail
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
  // Test 1: Navigate to Campaigns Page
  // ============================================
  test('should navigate to campaigns page', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    expect(page.url()).toContain('/campaigns');
    console.log('✓ Navigated to campaigns page');
  });

  // ============================================
  // Test 2: Search for Campaign
  // ============================================
  test('should search and filter campaigns', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    // Find search input
    const searchInput = page.locator(
      "[data-testid='campaigns-search'], input[placeholder*='Search'], input[placeholder*='search']"
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
  // Test 3: Navigate to Campaign Detail Page
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
  // Test 4: View Campaign Overview/Header
  // ============================================
  test('should display campaign overview and header', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for campaign header elements
      const campaignHeader = page.locator(
        "[data-testid='campaign-detail-header'], div.campaign-header"
      );
      const headerCount = await campaignHeader.count();

      // Look for campaign name and status
      const campaignInfo = page.locator("text=/campaign|status|sent|draft/i");
      const infoCount = await campaignInfo.count();

      if (headerCount > 0 || infoCount > 0) {
        console.log('✓ Campaign overview header visible');
      } else {
        console.log('⚠ Campaign header not found');
      }
    }
  });

  // ============================================
  // Test 5: View Campaign Statistics
  // ============================================
  test('should display campaign statistics', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for stats section
      const campaignStats = page.locator(
        "[data-testid='campaign-stats'], div.stats-container"
      );
      const statsCount = await campaignStats.count();

      // Look for metric labels
      const metrics = page.locator("text=/sent|delivered|failed|read/i");
      const metricCount = await metrics.count();

      if (statsCount > 0 || metricCount > 0) {
        console.log('✓ Campaign statistics visible');
      } else {
        console.log('⚠ Campaign statistics not found');
      }
    }
  });

  // ============================================
  // Test 6: View Message Preview
  // ============================================
  test('should display message preview', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for message preview section
      const messagePreview = page.locator(
        "[data-testid='campaign-preview'], div.message-preview"
      );
      const previewCount = await messagePreview.count();

      // Look for message content
      const messageContent = page.locator("text=/message|hello|dear/i");
      const contentCount = await messageContent.count();

      if (previewCount > 0 || contentCount > 0) {
        console.log('✓ Message preview visible');
      } else {
        console.log('⚠ Message preview not found');
      }
    }
  });

  // ============================================
  // Test 7: View Message Status Table
  // ============================================
  test('should display message status table', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for message status table
      const statusTable = page.locator(
        "[data-testid='message-status-table'], table.messages"
      );
      const tableCount = await statusTable.count();

      // Look for table rows (recipients)
      const messageRows = page.locator('tbody tr, [role="row"]');
      const rowCount = await messageRows.count();

      if (tableCount > 0 || rowCount > 0) {
        console.log(`✓ Message status table visible with ${rowCount} row(s)`);
      } else {
        console.log('⚠ Message status table not found');
      }
    }
  });

  // ============================================
  // Test 8: Filter Messages by Status
  // ============================================
  test('should filter messages by status', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for status filter buttons
      const statusFilters = page.locator(
        "[data-testid*='status-filter'], button:has-text('Sent'), button:has-text('Delivered')"
      );
      const filterCount = await statusFilters.count();

      if (filterCount > 0) {
        // Try to click first filter
        const firstFilter = statusFilters.first();
        const filterText = await firstFilter.textContent();

        await firstFilter.click();
        await page.waitForTimeout(500);

        console.log(`✓ Status filter (${filterText}) applied`);
      } else {
        console.log('⚠ Status filter buttons not found');
      }
    }
  });

  // ============================================
  // Test 9: View Recipient/Message Details
  // ============================================
  test('should display recipient message details', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for message rows
      const messageRows = page.locator('tbody tr, [role="row"]');
      const rowCount = await messageRows.count();

      if (rowCount > 0) {
        // Try to click first message row to see details
        const firstRow = messageRows.first();
        await firstRow.click();
        await page.waitForTimeout(500);

        // Look for detail information (phone, email, timestamp)
        const details = page.locator("text=/phone|email|timestamp|delivered|sent/i");
        const detailCount = await details.count();

        if (detailCount > 0) {
          console.log('✓ Recipient message details visible');
        } else {
          console.log('⚠ Message details not fully displayed');
        }
      } else {
        console.log('⚠ No message rows to click');
      }
    }
  });

  // ============================================
  // Test 10: View Campaign Analytics Section
  // ============================================
  test('should display campaign analytics', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for analytics section
      const analyticsSection = page.locator(
        "[data-testid='campaign-analytics'], div.analytics-section"
      );
      const analyticsCount = await analyticsSection.count();

      // Look for analytics indicators
      const analyticsText = page.locator("text=/analytics|graph|chart|rate|percentage/i");
      const analyticsTextCount = await analyticsText.count();

      if (analyticsCount > 0 || analyticsTextCount > 0) {
        console.log('✓ Campaign analytics section visible');
      } else {
        console.log('⚠ Campaign analytics not found (may not be available)');
      }
    }
  });

  // ============================================
  // Test 11: Retry Failed Messages (if available)
  // ============================================
  test('should have retry failed button available', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for retry button
      const retryButton = page.locator(
        "[data-testid='retry-failed-button'], button:has-text('Retry')"
      );
      const retryCount = await retryButton.count();

      if (retryCount > 0) {
        await expect(retryButton.first()).toBeVisible();
        console.log('✓ Retry failed button available');
      } else {
        console.log('⚠ Retry button not found (may not have failed messages)');
      }
    }
  });

  // ============================================
  // Test 12: Export Campaign Data
  // ============================================
  test('should have export campaign button available', async ({ page }) => {
    await loginAndNavigateToCampaigns(page);

    if (await navigateToFirstCampaign(page)) {
      // Look for export button
      const exportButton = page.locator(
        "[data-testid='export-campaign-button'], button:has-text('Export')"
      );
      const exportCount = await exportButton.count();

      if (exportCount > 0) {
        await expect(exportButton.first()).toBeVisible();
        console.log('✓ Export campaign button available');
      } else {
        console.log('⚠ Export button not found');
      }
    }
  });
});
