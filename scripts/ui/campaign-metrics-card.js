/**
 * UI test: Campaign metrics card rendering
 * Flow:
 * 1. Login
 * 2. Open Campaigns list, open first campaign
 * 3. Assert Metrics card is present and metrics grid renders
 *
 * Notes:
 * - Soft-skips if no campaigns exist (will log a warning and exit 0)
 * - Uses puppeteer-core; requires Chrome/Chromium installed locally
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

  const userDataDir = path.join(__dirname, '.chrome-metrics');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });
  const consoleErrors = [];
  const httpErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() >= 400) httpErrors.push(`${res.status()} ${res.url()}`);
  });

  try {
    await login(page);
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });
    await page.waitForXPath("//h1[contains(., 'Campaigns')]", { timeout: 10000 });

    const viewButtons = await page.$x('//button[contains(., "View")]');
    if (viewButtons.length === 0) {
      console.warn('⚠️  No campaigns found; skipping metrics card assertion.');
      return;
    }

    await Promise.all([
      viewButtons[0].click(),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    await page.waitForXPath("//h3[contains(., 'Campaign Details')]", { timeout: 10000 });
    await page.waitForXPath("//h3[contains(., 'Metrics')]", { timeout: 10000 });
    // Ensure at least one metric value is rendered
    const metricCount = await page.$$eval('div.grid div', (nodes) => nodes.length);
    if (metricCount === 0) throw new Error('Metrics grid did not render');

    await page.screenshot({ path: path.join(LOG_DIR, 'ui-campaign-metrics.png'), fullPage: true });
    console.log('✅ Campaign metrics card rendered');

    reportWarnings(consoleErrors, httpErrors);
  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'ui-campaign-metrics-error.png'), fullPage: true }).catch(() => {});
    console.error('❌ Campaign metrics test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

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

function reportWarnings(consoleErrors, httpErrors) {
  if (consoleErrors.length) {
    console.log('⚠️  Console errors observed:');
    consoleErrors.forEach((e) => console.log(`- ${e}`));
  }
  const uniqueHttp = Array.from(new Set(httpErrors));
  if (uniqueHttp.length) {
    console.log('⚠️  HTTP errors observed:');
    uniqueHttp.forEach((e) => console.log(`- ${e}`));
  }
}

run();
