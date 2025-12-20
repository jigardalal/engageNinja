/**
 * UI test: Admin Users list/search/detail
 * - Platform admin sees users list
 * - Can search by email
 * - Can open a user detail view
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
    // Login (lands on admin console)
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 })
    ]);

    // Go to Users tab
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Search for admin email
    await page.type('input[placeholder="Search by email or name..."]', 'admin@engageninja.local');
    await page.waitForTimeout(500);

    const rows = await page.$$eval('table tbody tr', (r) => r.length);
    if (rows < 1) {
      throw new Error('No user rows found after search');
    }

    // Open first user detail
    const viewButtons = await page.$x("//button[contains(., 'View Details')]");
    if (!viewButtons.length) {
      throw new Error('View Details button not found');
    }
    await Promise.all([
      viewButtons[0].click(),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    const detailPath = await page.evaluate(() => window.location.pathname);
    if (!detailPath.startsWith('/admin/users/')) {
      throw new Error(`Unexpected detail path: ${detailPath}`);
    }

    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1');
        return h1 && h1.textContent && h1.textContent.trim().length > 0;
      },
      { timeout: 10000 }
    );

    await page.screenshot({ path: path.join(LOG_DIR, 'admin-users.png'), fullPage: true });
    console.log('✅ Admin users list/search/detail verified.');
  } catch (err) {
    console.error('❌ Admin users test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
