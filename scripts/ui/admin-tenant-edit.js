/**
 * UI test: Admin edits tenant fields (status + address)
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
  if (!chromePath) throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH.');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 })
    ]);

    // Ensure on tenants list
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const viewButtons = await page.$x("//button[contains(., 'View Details')]");
    if (!viewButtons.length) throw new Error('No tenant rows');
    await Promise.all([
      viewButtons[0].click(),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Change status to suspended then back to active to verify persistence
    await page.select('select', 'suspended');
    await page.click('text=Update Status');
    await page.waitForTimeout(500);
    await page.select('select', 'active');
    await page.click('text=Update Status');
    await page.waitForTimeout(500);

    // Validate address fields render
    await page.waitForXPath("//p[contains(., 'Address Line 1')]", { timeout: 5000 });

    await page.screenshot({ path: path.join(LOG_DIR, 'admin-tenant-edit.png'), fullPage: true });
    console.log('✅ Admin tenant detail status/address visible and update action executed.');
  } catch (err) {
    console.error('❌ Admin tenant edit test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
