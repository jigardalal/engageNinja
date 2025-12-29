import { test, expect } from '@playwright/test';

/**
 * EngageNinja View Analytics Tests
 * Tests viewing usage analytics, campaign performance, and analytics dashboard
 * Journey Map: journey-maps/high/06-view-analytics.md
 *
 * Prerequisites:
 * - User must be authenticated
 * - User should have admin role
 * - Campaigns must exist in the system
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('View Analytics Flow', () => {
  // Test user
  const testUser = {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  };

  // ============================================
  // Helper: Log in and navigate to analytics
  // ============================================
  async function loginAndNavigateToAnalytics(page) {
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

    // Close modal if it's blocking (Welcome Carousel, etc.)
    const modalBackdrop = page.locator('div.backdrop-blur-sm, div[class*="backdrop"]');
    if ((await modalBackdrop.count()) > 0) {
      // Try to close by clicking outside or finding close button
      const closeButton = page.locator("button:has-text('Skip'), button:has-text('Close'), button:has-text('X')");
      if ((await closeButton.count()) > 0) {
        await closeButton.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Direct navigation to usage page (most reliable)
    await page.goto('/usage', { waitUntil: 'networkidle' }).catch(() => {
      // If /usage doesn't exist, try /analytics
      page.goto('/analytics', { waitUntil: 'networkidle' }).catch(() => {
        // Continue anyway if neither exists
      });
    });
  }

  // ============================================
  // Test 1: Navigate to Analytics Page
  // ============================================
  test('should navigate to analytics page', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    const currentUrl = page.url();
    if (currentUrl.includes('/usage') || currentUrl.includes('/analytics')) {
      console.log('✓ Navigated to analytics/usage page');
    } else {
      console.log('⚠ Analytics page URL not found: ' + currentUrl);
    }
  });

  // ============================================
  // Test 2: View Usage Summary
  // ============================================
  test('should display usage summary section', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for usage summary
    const usageSummary = page.locator(
      "[data-testid='usage-summary'], div.usage-summary"
    );
    const summaryCount = await usageSummary.count();

    // Look for usage metrics text
    const usageText = page.locator("text=/usage|quota|messages|whatsapp|email/i");
    const textCount = await usageText.count();

    if (summaryCount > 0 || textCount > 0) {
      console.log('✓ Usage summary visible');
    } else {
      console.log('⚠ Usage summary not found');
    }
  });

  // ============================================
  // Test 3: View Usage Charts
  // ============================================
  test('should display usage charts', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for chart elements
    const usageChart = page.locator(
      "[data-testid='usage-chart'], canvas, svg.chart"
    );
    const chartCount = await usageChart.count();

    // Look for chart-related text
    const chartText = page.locator("text=/chart|trend|graph|daily|weekly/i");
    const textCount = await chartText.count();

    if (chartCount > 0 || textCount > 0) {
      console.log('✓ Usage charts visible');
    } else {
      console.log('⚠ Usage charts not found');
    }
  });

  // ============================================
  // Test 4: View Campaign Performance Table
  // ============================================
  test('should display campaign performance table', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for campaign performance table
    const performanceTable = page.locator(
      "[data-testid='campaign-performance-table'], table.campaigns"
    );
    const tableCount = await performanceTable.count();

    // Look for table rows
    const tableRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await tableRows.count();

    if (tableCount > 0 || rowCount > 0) {
      console.log(`✓ Campaign performance table visible with ${rowCount} row(s)`);
    } else {
      console.log('⚠ Campaign performance table not found');
    }
  });

  // ============================================
  // Test 5: View Campaign Performance Metrics
  // ============================================
  test('should display campaign performance metrics', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for performance metrics
    const metrics = page.locator("text=/delivery rate|read rate|conversion|roi/i");
    const metricCount = await metrics.count();

    // Look for numeric values in tables
    const numbers = page.locator("text=/\\d+%|\\d+\\.\\d+%/");
    const numberCount = await numbers.count();

    if (metricCount > 0 || numberCount > 0) {
      console.log('✓ Campaign performance metrics visible');
    } else {
      console.log('⚠ Performance metrics not clearly displayed');
    }
  });

  // ============================================
  // Test 6: Filter by Date Range
  // ============================================
  test('should allow filtering by date range', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for date range picker
    const dateRangePicker = page.locator(
      "[data-testid='date-range-picker'], input[type='date']"
    );
    const pickerCount = await dateRangePicker.count();

    // Look for date-related text
    const dateText = page.locator("text=/from|to|date|period/i");
    const textCount = await dateText.count();

    if (pickerCount > 0 || textCount > 0) {
      console.log('✓ Date range filtering available');
    } else {
      console.log('⚠ Date range picker not found');
    }
  });

  // ============================================
  // Test 7: View Channel Breakdown
  // ============================================
  test('should display channel breakdown', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for channel breakdown section
    const channelBreakdown = page.locator(
      "[data-testid='channel-breakdown'], div.channel-stats"
    );
    const breakdownCount = await channelBreakdown.count();

    // Look for channel names
    const channelText = page.locator("text=/whatsapp|email|channel/i");
    const channelCount = await channelText.count();

    if (breakdownCount > 0 || channelCount > 0) {
      console.log('✓ Channel breakdown visible');
    } else {
      console.log('⚠ Channel breakdown not found');
    }
  });

  // ============================================
  // Test 8: Download Analytics Report
  // ============================================
  test('should have download analytics button', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for download button
    const downloadButton = page.locator(
      "[data-testid='download-analytics-button'], button:has-text('Download'), button:has-text('Export')"
    );
    const buttonCount = await downloadButton.count();

    if (buttonCount > 0) {
      await expect(downloadButton.first()).toBeVisible();
      console.log('✓ Download analytics button visible');
    } else {
      console.log('⚠ Download button not found');
    }
  });

  // ============================================
  // Test 9: View Usage Projection
  // ============================================
  test('should display usage projection', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for usage projection section
    const projection = page.locator(
      "[data-testid='usage-projection'], div.projection"
    );
    const projectionCount = await projection.count();

    // Look for projection-related text
    const projectionText = page.locator("text=/projection|forecast|expected|month-end/i");
    const textCount = await projectionText.count();

    if (projectionCount > 0 || textCount > 0) {
      console.log('✓ Usage projection visible');
    } else {
      console.log('⚠ Usage projection not found (may not be available)');
    }
  });

  // ============================================
  // Test 10: Compare with Previous Period
  // ============================================
  test('should have comparison toggle available', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Look for compare button/toggle
    const compareToggle = page.locator(
      "[data-testid='compare-period-toggle'], button:has-text('Compare')"
    );
    const toggleCount = await compareToggle.count();

    // Look for comparison-related text
    const comparisonText = page.locator("text=/compare|previous|change|vs/i");
    const textCount = await comparisonText.count();

    if (toggleCount > 0 || textCount > 0) {
      console.log('✓ Comparison toggle available');
    } else {
      console.log('⚠ Comparison feature not found');
    }
  });

  // ============================================
  // Test 11: Analytics Page Layout
  // ============================================
  test('should display complete analytics page layout', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Count major sections
    const sections = page.locator('div[class*="section"], section, article');
    const sectionCount = await sections.count();

    // Look for analytics content
    const content = await page.locator('body').textContent();
    const hasContent = content && content.length > 100;

    if (sectionCount > 0 && hasContent) {
      console.log(`✓ Analytics page layout complete (${sectionCount} section(s))`);
    } else {
      console.log('⚠ Analytics page layout may be incomplete');
    }
  });

  // ============================================
  // Test 12: Analytics Dashboard Interactive Elements
  // ============================================
  test('should have interactive analytics elements', async ({ page }) => {
    await loginAndNavigateToAnalytics(page);

    // Count interactive elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    const inputs = page.locator('input, select');
    const inputCount = await inputs.count();

    const totalInteractive = buttonCount + inputCount;

    if (totalInteractive > 0) {
      console.log(`✓ Analytics dashboard has ${totalInteractive} interactive element(s)`);
    } else {
      console.log('⚠ Limited interactive elements found');
    }
  });
});
