/**
 * UI test: Contacts bulk tag add/remove and chip selection
 * Flow:
 * 1. Create a contact with tags (selectable chips)
 * 2. Edit contact and change tags
 * 3. Bulk add a tag to multiple contacts; bulk remove
 *
 * Assumptions:
 * - Tags exist or can be created via the UI select (selectable chips)
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

  const userDataDir = path.join(__dirname, '.chrome-contacts');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });
  const contactName = `Contact Bulk ${Date.now()}`;
  const tagName = `Tag-${Date.now()}`;

  try {
    await login(page);
    await createContactWithTags(page, contactName, [tagName]);
    await editContactTags(page, contactName, [`${tagName}-edit`]);
    await bulkAddRemoveTags(page, contactName, `${tagName}-bulk`);
    console.log('✅ Contacts bulk tags test passed');
  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'contacts-bulk-tags-error.png'), fullPage: true }).catch(() => {});
    console.error('❌ Contacts bulk tags test failed:', err.message);
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

async function createContactWithTags(page, name, tags) {
  await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });
  await clickButtonByText(page, 'Add Contact');
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await page.type('input[name="name"]', name);
  await page.type('input[name="phone"]', `+1555${Math.floor(Math.random() * 9000000 + 1000000)}`);

  for (const tag of tags) {
    await selectTagChip(page, tag);
  }

  await clickButtonByText(page, 'Save');
  await page.waitForTimeout(800);
}

async function editContactTags(page, name, newTags) {
  const rowXPath = `//tr[.//td[contains(text(),"${name}")]]`;
  await page.waitForXPath(rowXPath, { timeout: 10000 });
  const [row] = await page.$x(rowXPath);
  await row.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  await clickButtonByText(page, 'Edit Contact');
  await page.waitForSelector('input[name="name"]', { timeout: 5000 });
  for (const tag of newTags) {
    await selectTagChip(page, tag);
  }
  await clickButtonByText(page, 'Save');
  await page.waitForTimeout(500);
  await page.goBack({ waitUntil: 'networkidle2' }); // back to list
}

async function bulkAddRemoveTags(page, name, bulkTag) {
  // select the contact row
  const rowXPath = `//tr[.//td[contains(text(),"${name}")]]`;
  await page.waitForXPath(rowXPath, { timeout: 5000 });
  const [checkbox] = await page.$x(`${rowXPath}//input[@type="checkbox"]`);
  await checkbox.click();

  // Add tag via bulk add
  await clickButtonByText(page, 'Add Tags');
  await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
  await selectTagChip(page, bulkTag);
  await clickButtonByText(page, 'Save');
  await page.waitForTimeout(400);

  // Remove tag via bulk delete tags (assuming same modal)
  await clickButtonByText(page, 'Add Tags');
  await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
  const selectedChip = await page.$x(`//span[contains(., "${bulkTag}")]`);
  if (selectedChip[0]) {
    await selectedChip[0].click(); // toggle off
  }
  await clickButtonByText(page, 'Save');
  await page.waitForTimeout(400);
}

async function selectTagChip(page, tagText) {
  // Click tag input
  const tagInput = await page.$('input[placeholder*="tag"]') || await page.$('input[placeholder*="Tag"]');
  if (!tagInput) throw new Error('Tag input not found');
  await tagInput.click({ clickCount: 3 });
  await tagInput.type(tagText);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
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
