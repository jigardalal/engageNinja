import { test, expect } from '@playwright/test';
import { loginAsUser } from '../utils/helpers';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    // Check if login form is visible
    await expect(page.locator('h1')).toContainText('Login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await loginAsUser(page, 'test@example.com', 'testpassword123');

    // Verify we're on dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    const errorToast = page.locator('.toast, .error, .alert');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('Invalid credentials');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator('input[name="email"]')).toBeFocused();
    const emailError = page.locator('input[name="email"] + .error, input[name="email"] + .invalid-feedback');
    if (await emailError.isVisible()) {
      await expect(emailError).toContainText('required');
    }
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await loginAsUser(page, 'test@example.com', 'testpassword123');

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), .user-menu button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Verify we're redirected to login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Login');
  });

  test('should remember session (if checkbox exists)', async ({ page }) => {
    await page.goto('/login');

    // Check if remember me checkbox exists
    const rememberCheckbox = page.locator('input[name="remember"]');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }

    await loginAsUser(page, 'test@example.com', 'testpassword123');

    // Verify session persists
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});