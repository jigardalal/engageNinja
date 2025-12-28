import { type Page, type Locator } from '@playwright/test';

export class UIHelpers {
  constructor(private page: Page) {}

  async waitForElement(locator: Locator | string, timeout = 10000) {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  async clickElement(locator: Locator | string) {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await element.waitFor({ state: 'visible' });
    await element.click();
  }

  async fillInput(locator: Locator | string, value: string) {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await element.waitFor({ state: 'visible' });
    await element.fill(value);
  }

  async selectOption(locator: Locator | string, value: string) {
    const element = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await element.waitFor({ state: 'visible' });
    await element.selectOption({ value });
  }

  async getToastMessage() {
    const toast = this.page.locator('.toast, .notification, [role="alert"]');
    await toast.waitFor({ state: 'visible', timeout: 5000 });
    return toast.textContent();
  }

  async confirmDialog(message: string) {
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
    await this.clickElement(confirmButton);
  }

  async cancelDialog() {
    const cancelButton = this.page.locator('button:has-text("Cancel"), button:has-text("No")');
    await this.clickElement(cancelButton);
  }

  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async waitForDataLoaded() {
    // Wait for loading indicators to disappear
    await this.page.waitForSelector('.loading, .spinner', { state: 'hidden', timeout: 10000 });
    await this.waitForNavigation();
  }
}

export async function loginAsUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
}