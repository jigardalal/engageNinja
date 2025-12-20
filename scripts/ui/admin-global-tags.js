/**
 * UI test: Admin Global Tags CRUD (create/list)
 * - Platform admin can view global tags
 * - Can create a new global tag and see it in the list
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
    // Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 })
    ]);

    // Navigate to global tags
    await page.goto(`${BASE_URL}/admin/tags`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table tbody tr, [data-testid="empty-tags"]', { timeout: 10000 });

    // Create new tag
    const newName = `puppeteer-tag-${Date.now()}`;
    await page.type('input[placeholder="e.g., vip"]', newName);
    await page.click('text=Create Tag');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(LOG_DIR, 'admin-global-tags-debug.png'), fullPage: true });
    await page.waitForFunction(
      (name) => {
        const inputs = Array.from(document.querySelectorAll('table input'));
        return inputs.some(i => i.value === name);
      },
      { timeout: 10000 },
      newName
    );
    await page.screenshot({ path: path.join(LOG_DIR, 'admin-global-tags.png'), fullPage: true });
    console.log('✅ Admin global tags create/list verified.');
  } catch (err) {
    console.error('❌ Admin global tags test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
