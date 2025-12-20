/**
 * UI test: Campaign archive + hide-archived filter
 * Flow:
 * 1. Create a simple draft campaign
 * 2. Archive it via bulk archive
 * 3. Verify it disappears when "Hide archived" is on, reappears when off, and is shown in Archived filter
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

  const userDataDir = path.join(__dirname, '.chrome-archive');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });
  const campaignName = `UI Archive ${Date.now()}`;

  try {
    await login(page);
    await createQuickDraft(page, campaignName);
    await archiveFromList(page, campaignName);
    console.log('✅ Archive filter test passed');
  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'campaign-archive-error.png'), fullPage: true }).catch(() => {});
    console.error('❌ Archive filter test failed:', err.message);
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

async function createQuickDraft(page, name) {
  await page.goto(`${BASE_URL}/campaigns/new`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await page.type('input[name="name"]', name);
  await page.type('textarea[name="description"]', 'Archive filter test');
  await clickButtonByText(page, 'Next');
  await clickButtonByText(page, 'Next');
  await page.waitForSelector('select[name="template_id"]', { timeout: 10000 });
  const options = await page.$$eval('select[name="template_id"] option', opts =>
    opts.map(o => o.value).filter(Boolean)
  );
  if (options[0]) await page.select('select[name="template_id"]', options[0]);
  await page.waitForTimeout(300);
  const inputs = await page.$$('div.border.p-3 input[type="text"]');
  if (inputs[0]) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('ArchiveTest');
  }
  await clickButtonByText(page, 'Next');
  await clickButtonByText(page, 'Create Campaign', false) || await clickButtonByText(page, 'Save', false);
  await page.waitForTimeout(1200);
}

async function archiveFromList(page, name) {
  await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });
  await page.type('#search', name);
  await page.waitForTimeout(600);
  const rowXPath = `//tr[.//td[contains(text(),"${name}")]]`;
  await page.waitForXPath(rowXPath, { timeout: 10000 });

  // Select the row checkbox
  const [rowCheckbox] = await page.$x(`${rowXPath}//input[@type="checkbox"]`);
  if (!rowCheckbox) throw new Error('Row checkbox not found');
  await rowCheckbox.click();

  // Archive
  await clickButtonByText(page, 'Archive Selected');
  await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
  await clickButtonByText(page, 'Archive');
  await page.waitForTimeout(800);

  // With hide-archived checked, row should disappear
  const stillVisible = await page.$x(rowXPath);
  if (stillVisible.length > 0) {
    throw new Error('Archived row still visible while hide-archived is on');
  }

  // Uncheck hide-archived to reveal
  const hideCheckbox = await page.$('#hide-archived');
  if (hideCheckbox) {
    const checked = await page.$eval('#hide-archived', el => el.checked);
    if (checked) {
      await hideCheckbox.click();
      await page.waitForTimeout(500);
    }
  }

  const [rowAfter] = await page.$x(rowXPath);
  if (!rowAfter) throw new Error('Archived row not visible after un-hiding');

  // Filter Archived status
  await page.select('#status', 'archived');
  await page.waitForTimeout(500);
  const filteredRow = await page.$x(rowXPath);
  if (filteredRow.length === 0) {
    throw new Error('Archived row missing when filtering archived status');
  }
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

run();
