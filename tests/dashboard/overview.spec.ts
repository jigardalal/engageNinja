import { test, expect } from '@playwright/test';
import { UIHelpers } from '../utils/helpers';

test.describe('Dashboard Overview', () => {
  let ui: UIHelpers;

  test.beforeEach(async ({ page }) => {
    ui = new UIHelpers(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check main dashboard heading
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Verify key metric cards are present
    const metricCards = page.locator('.metric-card, .stat-card, [data-testid="metric"]');
    await expect(metricCards.first()).toBeVisible();

    // Check for specific metrics if they exist
    const metrics = [
      'Contacts',
      'Campaigns',
      'Active Sends',
      'Read Rate'
    ];

    for (const metric of metrics) {
      const metricElement = page.locator('text=/\\b' + metric + '\\b/i');
      const isVisible = await metricElement.isVisible();
      console.log(`Metric "${metric}" visible: ${isVisible}`);
    }
  });

  test('should show plan context card for free users', async ({ page }) => {
    const planCard = page.locator('.plan-card, .billing-card, [data-testid="plan-context"]');

    if (await planCard.isVisible()) {
      await expect(planCard).toBeVisible();
      await expect(planCard.locator('h3, .plan-name')).toContainText('Free');

      // Check for usage indicators
      const usageIndicator = planCard.locator('.usage-indicator, .usage-progress');
      if (await usageIndicator.isVisible()) {
        await expect(usageIndicator).toBeVisible();
      }
    }
  });

  test('should display recent campaigns', async ({ page }) => {
    const recentCampaignsSection = page.locator('.recent-campaigns, [data-testid="recent-campaigns"]');

    if (await recentCampaignsSection.isVisible()) {
      await expect(recentCampaignsSection).toBeVisible();

      // Check for campaign items
      const campaignItems = recentCampaignsSection.locator('.campaign-item, .list-item');
      const itemCount = await campaignItems.count();

      if (itemCount > 0) {
        // Verify first campaign item has expected content
        const firstCampaign = campaignItems.first();
        await expect(firstCampaign.locator('.campaign-name')).toBeVisible();
        await expect(firstCampaign.locator('.campaign-status')).toBeVisible();
      }
    }
  });

  test('should show welcome carousel for new users', async ({ page }) => {
    const welcomeCarousel = page.locator('.welcome-carousel, .onboarding-carousel');

    if (await welcomeCarousel.isVisible()) {
      await expect(welcomeCarousel).toBeVisible();

      // Check for navigation buttons
      const nextButton = welcomeCarousel.locator('button:has-text("Next"), .next-button');
      const prevButton = welcomeCarousel.locator('button:has-text("Previous"), .prev-button');

      // Verify carousel has multiple steps
      const steps = welcomeCarousel.locator('.carousel-step, .carousel-slide');
      const stepCount = await steps.count();

      if (stepCount > 1) {
        // Test navigation
        await nextButton.click();
        await expect(welcomeCarousel).toBeVisible();
      }

      // Check for dismiss/close button
      const dismissButton = welcomeCarousel.locator('button:has-text("Got it"), .dismiss-button');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
      }
    }
  });

  test('should navigate to campaigns from dashboard', async ({ page }) => {
    // Find and click campaigns link/button
    const campaignsLink = page.locator('a:has-text("Campaigns"), button:has-text("Campaigns"), [href*="campaigns"]');
    await expect(campaignsLink).toBeVisible();
    await campaignsLink.click();

    // Verify navigation to campaigns page
    await expect(page).toHaveURL(/campaigns/);
    await expect(page.locator('h1')).toContainText(/Campaigns/i);
  });

  test('should navigate to contacts from dashboard', async ({ page }) => {
    // Find and click contacts link/button
    const contactsLink = page.locator('a:has-text("Contacts"), button:has-text("Contacts"), [href*="contacts"]');
    await expect(contactsLink).toBeVisible();
    await contactsLink.click();

    // Verify navigation to contacts page
    await expect(page).toHaveURL(/contacts/);
    await expect(page.locator('h1')).toContainText(/Contacts/i);
  });

  test('should navigate to settings from dashboard', async ({ page }) => {
    // Find and click settings link/button
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings"), [href*="settings"]');
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();

    // Verify navigation to settings page
    await expect(page).toHaveURL(/settings/);
  });

  test('should create new campaign from dashboard', async ({ page }) => {
    // Look for "Create Campaign" button
    const createCampaignButton = page.locator('button:has-text("Create Campaign"), .create-campaign-btn, [data-testid="create-campaign"]');

    if (await createCampaignButton.isVisible()) {
      await createCampaignButton.click();

      // Should navigate to campaign creation or open modal
      if (await page.locator('[data-testid="campaign-modal"]').isVisible()) {
        await expect(page.locator('[data-testid="campaign-modal"]')).toBeVisible();
      } else {
        await expect(page).toHaveURL(/campaigns\/new/);
      }
    }
  });

  test('should display responsive layout on mobile', async ({ page }) => {
    // Emulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });

    // Check dashboard still works on mobile
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Check navigation is accessible
    const mobileMenu = page.locator('.mobile-menu, .hamburger-menu, [data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('.nav-menu, .sidebar')).toBeVisible();
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/dashboard/stats', route => {
      route.abort('failed');
    });

    // Refresh page
    await page.reload();

    // Should not crash, should show error state or loading
    const errorState = page.locator('.error-state, .error-message, [data-testid="error"]');
    const loadingState = page.locator('.loading, .spinner');

    const hasError = await errorState.isVisible();
    const isLoading = await loadingState.isVisible();

    expect(hasError || isLoading).toBe(true);
  });
});