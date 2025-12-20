/**
 * UI test: User profile edit (first/last/phone/timezone)
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const LOG_DIR = path.join(__dirname, '../../logs');
const EMAIL = 'user@engageninja.local';
const PASSWORD = 'UserPassword123';

const getChromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const linuxChrome = '/usr/bin/google-chrome';
  const winChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const candidates = [macChrome, linuxChrome, winChrome];
  return candidates.find(fs.existsSync);
};

async function run() {
  console.log('Starting profile edit test');
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const chromePath = getChromePath();
  if (!chromePath) throw new Error('Chrome/Chromium executable not found.');

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
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(LOG_DIR, 'profile-edit-login.png'), fullPage: true });

    // If tenant selection required, pick the first tenant
    const pathName = await page.evaluate(() => window.location.pathname);
    if (pathName === '/tenants') {
      const switchButtons = await page.$x("//button[contains(., 'Switch')]");
      if (!switchButtons.length) throw new Error('No tenant switch buttons found');
      await Promise.all([
        switchButtons[0].click(),
        page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 12000 })
      ]);
      console.log('Switched tenant and landed on dashboard');
    } else {
      await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 12000 });
      console.log('Logged in, on dashboard');
    }

    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle2' });
    const profilePath = await page.evaluate(() => window.location.pathname);
    console.log('Profile page path:', profilePath);
    await page.screenshot({ path: path.join(LOG_DIR, 'profile-edit-debug.png'), fullPage: true });
    await page.waitForSelector('input[placeholder=\"First name\"]', { timeout: 12000 });

    const stamp = Date.now().toString().slice(-4);
    await page.click('input[placeholder="First name"]', { clickCount: 3 });
    await page.type('input[placeholder="First name"]', `Test${stamp}`);
    await page.click('input[placeholder="Last name"]', { clickCount: 3 });
    await page.type('input[placeholder="Last name"]', `User${stamp}`);
    await page.click('input[placeholder="Optional phone"]', { clickCount: 3 });
    await page.type('input[placeholder="Optional phone"]', '+1234567890');
    await page.click('input[placeholder="e.g., America/New_York"]', { clickCount: 3 });
    await page.type('input[placeholder="e.g., America/New_York"]', 'UTC');

    const buttons = await page.$x("//button[contains(., 'Save changes')]");
    if (!buttons.length) throw new Error('Save changes button not found');
    await Promise.all([buttons[0].click(), page.waitForTimeout(1000)]);

    await page.screenshot({ path: path.join(LOG_DIR, 'profile-edit.png'), fullPage: true });
    console.log('✅ Profile edit UI verified.');
  } catch (err) {
    console.error('❌ Profile edit test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
