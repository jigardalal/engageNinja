import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Login with test credentials
  await page.goto('/login');

  // Fill login form
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword123');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation and verify we're logged in
  await expect(page).toHaveURL(/dashboard/);

  // Verify dashboard elements are present
  await expect(page.locator('h1')).toContainText('Dashboard');

  console.log('✅ Authentication setup completed successfully');
});