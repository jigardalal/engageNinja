/**
 * UI test: Admin <-> Tenant mode switch navigation
 * - Platform admin sees Tenant App dropdown while in admin mode
 * - Can switch to tenant app and back to admin via dropdowns
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const LOG_DIR = path.join(__dirname, '../../logs');
const EMAIL = 'platform.admin@engageninja.local';
const PASSWORD = 'PlatformAdminPassword123';

const getChromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const linuxChrome = '/usr/bin/google-chrome';
  const winChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const candidates = [macChrome, linuxChrome, winChrome];
  return candidates.find(fs.existsSync);
};

async function run() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH to your browser.');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1280, height: 800 });

  try {
    // Login (lands on admin console by default for platform admin)
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 })
    ]);

    // Admin mode should show Tenant App dropdown
    await page.waitForSelector('[data-testid="tenant-dropdown-trigger"]', { timeout: 8000 });

    // Switch to tenant app
    await page.click('[data-testid="tenant-dropdown-trigger"]');
    await clickButtonByText(page, 'Tenant Dashboard');
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 12000 });

    // In tenant mode, admin dropdown should be visible to go back
    await page.waitForSelector('[data-testid="admin-dropdown-trigger"]', { timeout: 8000 });
    await page.click('[data-testid="admin-dropdown-trigger"]');
    await clickButtonByText(page, 'Admin Console');
    await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 });

    await page.screenshot({ path: path.join(LOG_DIR, 'admin-mode-switch.png'), fullPage: true });
    console.log('✅ Admin/Tenant mode switch navigation verified.');
  } catch (err) {
    console.error('❌ Admin/Tenant mode switch test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function clickButtonByText(page, text) {
  const [button] = await page.$x(`//button[contains(., "${text}")]`);
  if (!button) {
    throw new Error(`Button with text "${text}" not found`);
  }
  await button.click();
}

run();
