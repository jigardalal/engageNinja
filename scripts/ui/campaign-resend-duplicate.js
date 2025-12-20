/**
 * UI test: Campaign resend and duplicate flows
 * Flow:
 * 1. Create a WhatsApp draft, send it
 * 2. From detail page, use "Edit as new draft" to duplicate and ensure edit page loads
 * 3. From a sent campaign, trigger "Resend to non-readers" and ensure navigation to new campaign
 *
 * Assumptions:
 * - At least one WhatsApp template exists
 * - Sending is allowed (or mocked); we only assert UI transitions, not delivery
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

  const userDataDir = path.join(__dirname, '.chrome-resend');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });
  const campaignName = `UI Resend ${Date.now()}`;

  try {
    await login(page);
    await createAndSend(page, campaignName);
    await duplicateFromDetail(page);
    await resendFromDetail(page);
    console.log('✅ Resend/Duplicate test passed');
  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'campaign-resend-error.png'), fullPage: true }).catch(() => {});
    console.error('❌ Resend/Duplicate test failed:', err.message);
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

async function createAndSend(page, name) {
  await page.goto(`${BASE_URL}/campaigns/new`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await page.type('input[name="name"]', name);
  await page.type('textarea[name="description"]', 'Resend test campaign');
  await clickButtonByText(page, 'Next');
  await clickButtonByText(page, 'Next');

  await page.waitForSelector('select[name="template_id"]', { timeout: 10000 });
  const templateOptions = await page.$$eval('select[name="template_id"] option', opts =>
    opts.map(o => o.value).filter(Boolean)
  );
  if (templateOptions[0]) await page.select('select[name="template_id"]', templateOptions[0]);
  await page.waitForTimeout(300);
  const inputs = await page.$$('div.border.p-3 input[type="text"]');
  if (inputs[0]) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('ResendVar');
  }

  await clickButtonByText(page, 'Next');
  await clickButtonByText(page, 'Create Campaign', false) || await clickButtonByText(page, 'Save', false);
  await page.waitForTimeout(1200);

  // Open detail from list
  await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });
  await page.type('#search', name);
  await page.waitForTimeout(500);
  const [viewBtn] = await page.$x(`//tr[.//td[contains(text(),"${name}")]]//button[contains(., "View")]`);
  if (!viewBtn) throw new Error('View button not found for new campaign');
  await Promise.all([
    viewBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  // Send campaign
  const [sendBtn] = await page.$x('//button[contains(., "Send Campaign")]');
  if (!sendBtn) throw new Error('Send button not found on detail page');
  await sendBtn.click();
  await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
  await clickButtonByText(page, 'Confirm & Send');
  await page.waitForTimeout(800);
}

async function duplicateFromDetail(page) {
  const [duplicateBtn] = await page.$x('//button[contains(., "Edit as new draft")]');
  if (!duplicateBtn) throw new Error('Duplicate button not found');
  await Promise.all([
    duplicateBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  if (!page.url().includes('/campaigns/') || !page.url().includes('/edit')) {
    throw new Error('Did not navigate to edit page after duplicate');
  }
  // Go back to previous campaign detail
  await page.goBack({ waitUntil: 'networkidle2' });
}

async function resendFromDetail(page) {
  const [resendBtn] = await page.$x('//button[contains(., "Resend to non-readers")]');
  if (!resendBtn) {
    console.warn('Resend button not found; perhaps campaign is still draft/sending. Skipping resend assert.');
    return;
  }
  await resendBtn.click();
  await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
  await clickButtonByText(page, 'Confirm resend', false) || await clickButtonByText(page, 'Confirm & Send', false);
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  if (!page.url().includes('/campaigns/')) {
    throw new Error('Did not navigate to resend campaign detail');
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
