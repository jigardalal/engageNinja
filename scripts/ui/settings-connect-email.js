/**
 * UI test: Settings email connect/disconnect
 * Flow: login -> settings -> connect email (SES dummy creds) -> see connected badge -> disconnect
 * This covers the settings connect/disconnect regression mentioned in TODO.
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const EMAIL = process.env.TEST_EMAIL || 'admin@engageninja.local';
const PASSWORD = process.env.TEST_PASSWORD || 'AdminPassword123';
const LOG_DIR = path.join(__dirname, '../../logs');

const getChromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  return candidates.find(fs.existsSync);
};

async function run() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const chromePath = getChromePath();
  if (!chromePath) throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH.');

  const userDataDir = path.join(__dirname, '.chrome-email-connect');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });

  try {
    await login(page);
    await page.goto(`${BASE_URL}/settings/channels`, { waitUntil: 'networkidle2' });
    await page.waitForXPath("//h1[contains(., 'Settings')]", { timeout: 10000 });

    // Open email modal
    await clickButtonByText(page, 'Connect Email');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Fill SES dummy credentials
    await page.select('select[value]', 'ses');
    await page.type('input[placeholder="Your AWS access key"]', 'AKIAFAKEKEY123');
    await page.type('input[placeholder="Your AWS secret key"]', 'FAKESECRETKEY1234567890');
    await page.type('input[type="email"]', 'verified@example.com');

    await clickButtonByText(page, 'Connect');
    await page.waitForTimeout(1200);

    // Badge should change to Connected
    const [connectedBadge] = await page.$x("//div[contains(., 'Email')]/following-sibling::span[contains(., 'Connected')]");
    if (!connectedBadge) throw new Error('Email did not show as connected');

    // Disconnect
    await clickButtonByText(page, 'Disconnect');
    await page.waitForTimeout(800);
    const [notConnectedBadge] = await page.$x("//div[contains(., 'Email')]/following-sibling::span[contains(., 'Not Connected')]");
    if (!notConnectedBadge) throw new Error('Email did not show as disconnected');

    await page.screenshot({ path: path.join(LOG_DIR, 'ui-settings-email-connect.png'), fullPage: true });
    console.log('✅ Settings email connect/disconnect flow executed');
  } catch (err) {
    console.error('❌ Settings email connect/disconnect test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  if (!page.url().includes('/dashboard')) throw new Error('Login failed');
}

async function clickButtonByText(page, text, require = true) {
  const [btn] = await page.$x(`//button[contains(., "${text}")]`);
  if (!btn) {
    if (require) throw new Error(`Button "${text}" not found`);
    return null;
  }
  await btn.click();
  return btn;
}
