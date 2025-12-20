/**
 * UI Smoke Test using puppeteer-core
 * Flows: login -> dashboard -> contacts -> campaigns
 * Requires Chrome/Chromium installed locally.
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = 'http://localhost:3173';
const EMAIL = 'admin@engageninja.local';
const PASSWORD = 'AdminPassword123';
const LOG_DIR = path.join(__dirname, 'logs');

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

  const consoleErrors = [];
  const httpErrors = [];
  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH to your browser.');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 800 });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        httpErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    // Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 })
    ]);
    console.log('✅ Login succeeded');
    // Clear any pre-login noise (expected 401 from /api/auth/me before auth)
    consoleErrors.length = 0;
    httpErrors.length = 0;
    await page.screenshot({ path: path.join(LOG_DIR, 'ui-login.png'), fullPage: true });

    // Dashboard sanity check
    await page.waitForXPath("//h1[contains(., 'Dashboard')]", { timeout: 5000 });
    console.log('✅ Dashboard loaded');

    // Contacts page
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });
    await page.waitForXPath("//h1[contains(., 'Contacts')]", { timeout: 10000 });
    const contactRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Contacts page loaded (rows: ${contactRows})`);
    await page.screenshot({ path: path.join(LOG_DIR, 'ui-contacts.png'), fullPage: true });

    // Campaigns page
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });
    await page.waitForXPath("//h1[contains(., 'Campaigns')]", { timeout: 10000 });
    const campaignRows = await page.$$eval('table tbody tr', (rows) => rows.length);
    console.log(`✅ Campaigns page loaded (rows: ${campaignRows})`);
    await page.screenshot({ path: path.join(LOG_DIR, 'ui-campaigns.png'), fullPage: true });

    console.log('\n=== Summary ===');
    if (consoleErrors.length) {
      console.log('⚠️ Console errors observed:');
      consoleErrors.forEach((err) => console.log(`- ${err}`));
    } else {
      console.log('✅ No console errors captured during navigation');
    }

    const uniqueHttpErrors = Array.from(new Set(httpErrors));
    if (uniqueHttpErrors.length) {
      console.log('\n⚠️ HTTP errors observed:');
      uniqueHttpErrors.forEach((err) => console.log(`- ${err}`));
    } else {
      console.log('\n✅ No HTTP errors captured during navigation');
    }
  } catch (err) {
    console.error('❌ UI smoke test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
