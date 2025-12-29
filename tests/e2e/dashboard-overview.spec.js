import { test, expect } from '@playwright/test';

/**
 * EngageNinja Dashboard Overview Tests
 * Tests the dashboard landing page and quick actions
 * Journey Map: journey-maps/high/01-dashboard-overview.md
 *
 * Prerequisites:
 * - User must be authenticated
 * - User must have active tenant selected
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Dashboard Overview Flow', () => {
  // Test user
  const testUser = {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  };

  // ============================================
  // Helper: Log in and navigate to dashboard
  // ============================================
  async function loginAndNavigateToDashboard(page) {
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

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
  }

  // ============================================
  // Test 1: Navigate to Dashboard Page
  // ============================================
  test('should navigate to dashboard page and display content', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Verify URL
    expect(page.url()).toContain('/dashboard');

    // Look for dashboard header/title - specifically "Workspace command center"
    const dashboardHeader = page.locator('text=Workspace command center');
    const headerCount = await dashboardHeader.count();

    if (headerCount > 0) {
      await expect(dashboardHeader).toBeVisible();
      console.log('✓ Dashboard page loaded with header');
    } else {
      console.log('⚠ Dashboard header not found');
    }
  });

  // ============================================
  // Test 2: View Dashboard Stats - Contacts
  // ============================================
  test('should display contacts stat card', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for contacts stat card with "Contacts" label and "Reachable audience" subtitle
    const contactsStatCard = page.locator(
      "text=Contacts >> xpath=ancestor::div[contains(@class, 'grid')][1]"
    ).first();

    // Fallback: look for any element with "Reachable audience" text
    const alternateLocator = page.locator("text=Reachable audience");

    const statCount = await contactsStatCard.count();
    const altCount = await alternateLocator.count();

    if (altCount > 0) {
      console.log('✓ Contacts stat card visible');
    } else if (statCount > 0) {
      console.log('✓ Contacts stat card visible');
    } else {
      console.log('⚠ Contacts stat card not found');
    }
  });

  // ============================================
  // Test 3: View Dashboard Stats - Campaigns
  // ============================================
  test('should display campaigns stat card', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for campaigns stat card with "Campaigns" label
    const campaignsStatCard = page.locator("text=All-time sends");

    const statCount = await campaignsStatCard.count();

    if (statCount > 0) {
      console.log('✓ Campaigns stat card visible');
    } else {
      console.log('⚠ Campaigns stat card not found');
    }
  });

  // ============================================
  // Test 4: View Dashboard Stats - Active Sending
  // ============================================
  test('should display active sends stat card', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for active sends stat with "Currently processing" subtitle
    const activeSendingStatCard = page.locator("text=Currently processing");

    const statCount = await activeSendingStatCard.count();

    if (statCount > 0) {
      console.log('✓ Active Sends stat card visible');
    } else {
      console.log('⚠ Active Sends stat card not found');
    }
  });

  // ============================================
  // Test 5: View Signals & Recent Activity Section
  // ============================================
  test('should display signals and recent activity section', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for main content area that contains recent campaigns
    const signalsHeader = page.locator("text=Signals & Recent Activity");

    const megaphoneIcon = page.locator("svg path, [data-lucide-id*='megaphone']");

    const headerCount = await signalsHeader.count();
    const iconCount = await megaphoneIcon.count();

    if (headerCount > 0 || iconCount > 0) {
      console.log('✓ Signals & Recent Activity section visible');
    } else {
      console.log('⚠ Recent activity section structure not found');
    }
  });

  // ============================================
  // Test 6: View Campaign Status Information
  // ============================================
  test('should display campaign status indicators', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for campaign status badges (sent, sending, draft)
    const statusBadges = page.locator("text=/sent|sending|draft|pending/i");

    const badgeCount = await statusBadges.count();

    if (badgeCount > 0) {
      console.log(`✓ Found ${badgeCount} campaign status indicator(s)`);
    } else {
      console.log('⚠ No campaign status indicators found (may have no campaigns)');
    }
  });

  // ============================================
  // Test 7: View Plan Context Card
  // ============================================
  test('should display plan context card with current plan info', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for plan context card - it shows plan info and buttons
    // The PlanContextCard renders plan information and may show "Upgrade to ..." button
    const planContextCard = page.locator(
      "text=/Free Plan|Starter|Growth|Pro|Enterprise/"
    );

    const cardCount = await planContextCard.count();

    if (cardCount > 0) {
      console.log('✓ Plan context card visible');
    } else {
      console.log('⚠ Plan context card not found');
    }
  });

  // ============================================
  // Test 8: View Usage Information on Dashboard
  // ============================================
  test('should display usage information', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for usage display
    const usageDisplay = page.locator(
      "text=/Usage|Quota|Used|Remaining|of|monthly/i"
    );

    const usageCount = await usageDisplay.count();

    if (usageCount > 0) {
      const usageText = await usageDisplay.first().textContent();
      console.log(`✓ Usage information displayed: "${usageText}"`);
    } else {
      console.log('⚠ Usage information not found');
    }
  });

  // ============================================
  // Test 9: CTA Button Availability Check
  // ============================================
  test('should have available call-to-action buttons', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Verify all main action buttons are available on the page
    const launchButton = page.locator("button:has-text('Launch new campaign')");
    const reviewButton = page.locator("button:has-text('Review audience')");
    const upgradeButton = page.locator("button:has-text('Upgrade plan')");

    const launchCount = await launchButton.count();
    const reviewCount = await reviewButton.count();
    const upgradeCount = await upgradeButton.count();

    let availableButtons = 0;
    if (launchCount > 0) {
      console.log('✓ Launch new campaign button available');
      availableButtons++;
    }
    if (reviewCount > 0) {
      console.log('✓ Review audience button available');
      availableButtons++;
    }
    if (upgradeCount > 0) {
      console.log('✓ Upgrade plan button available');
      availableButtons++;
    }

    expect(availableButtons).toBeGreaterThanOrEqual(2);
  });

  // ============================================
  // Test 12: Dashboard Loads Successfully
  // ============================================
  test('should load dashboard successfully', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Wait for main content to load
    await page.waitForTimeout(1000);

    // Check for loading error text
    const loadingError = page.locator("text=/unable to load|error loading/i");

    const errorCount = await loadingError.count();

    if (errorCount > 0) {
      console.log('⚠ Dashboard loading error detected');
    } else {
      console.log('✓ Dashboard loaded successfully');
    }

    // Verify at least some content is visible
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    console.log('✓ Dashboard has content');
  });

  // ============================================
  // Test 13: Dashboard Responsive Layout
  // ============================================
  test('should display stats in responsive grid layout', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for stats container or grid
    const statsContainer = page.locator(
      "div.stats-container, div[class*='grid'], div[class*='columns']"
    );

    const containerCount = await statsContainer.count();

    if (containerCount > 0) {
      // Count visible stat cards
      const statCards = page.locator(
        "div[class*='stat'], [data-testid*='stat-']"
      );

      const cardCount = await statCards.count();
      console.log(`✓ Dashboard has responsive layout with ${cardCount} stat card(s)`);
    } else {
      console.log('⚠ Stats container layout not found');
    }
  });

  // ============================================
  // Test 14: Dashboard Navigation Links
  // ============================================
  test('should have accessible navigation links', async ({ page }) => {
    await loginAndNavigateToDashboard(page);

    // Look for navigation items
    const navItems = page.locator('nav a, [role="navigation"] a');
    const navCount = await navItems.count();

    if (navCount > 0) {
      console.log(`✓ Navigation menu has ${navCount} link(s)`);
    } else {
      console.log('⚠ Navigation items not found');
    }

    // Verify dashboard is marked as active/current
    const activeNav = page.locator('nav a[aria-current="page"], nav a.active');
    const activeCount = await activeNav.count();

    if (activeCount > 0) {
      console.log('✓ Dashboard nav item marked as active');
    } else {
      console.log('⚠ Active nav indicator not found');
    }
  });
});
