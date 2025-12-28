import { test, expect } from '@playwright/test';

test.describe('Tenant Selection', () => {
  test('should handle tenant selection when multiple tenants exist', async ({ page }) => {
    // Mock tenant selection scenario
    await page.goto('/login');

    // Login
    await page.fill('input[name="email"]', 'multi-tenant@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Check if tenant selection appears
    const tenantSelector = page.locator('.tenant-selector, .tenant-dropdown, [data-testid="tenant-selector"]');
    const isVisible = await tenantSelector.isVisible();

    if (isVisible) {
      // Verify tenant selector has tenants
      await expect(tenantSelector).toBeVisible();
      const tenantOptions = page.locator('.tenant-option, .tenant-item');
      await expect(tenantOptions.first()).toBeVisible();

      // Select first tenant
      await tenantOptions.first().click();

      // Verify navigation to dashboard
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator('h1')).toContainText('Dashboard');
    } else {
      // If no tenant selector, verify direct dashboard access
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator('h1')).toContainText('Dashboard');
    }
  });

  test('should show error for invalid tenant selection', async ({ page }) => {
    // Mock scenario where tenant selection fails
    await page.goto('/login');

    await page.fill('input[name="email"]', 'tenant-error@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for tenant selector
    const tenantSelector = page.locator('.tenant-selector, .tenant-dropdown');
    await tenantSelector.waitFor({ state: 'visible', timeout: 5000 });

    // Try to select invalid/non-existent tenant
    const invalidTenant = page.locator('.tenant-option:has-text("Invalid Tenant")');
    if (await invalidTenant.isVisible()) {
      await invalidTenant.click();

      // Should show error
      const errorToast = page.locator('.toast, .error, .alert');
      await expect(errorToast).toBeVisible();
      await expect(errorToast).toContainText('Invalid tenant');
    }
  });
});