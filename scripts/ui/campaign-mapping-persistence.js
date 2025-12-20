/**
 * UI test: WhatsApp template variable mapping persistence
 * Flow:
 * 1. Create a WhatsApp draft with template variables, set mapping to contact fields
 * 2. Save, open from campaigns list, go to Edit
 * 3. Assert the variable dropdowns retain their mapping values (not lost to custom)
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
  if (!chromePath) {
    throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH.');
  }

  const userDataDir = path.join(__dirname, '.chrome-mapping');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });

  const campaignName = `UI Mapping ${Date.now()}`;

  try {
    await login(page);
    await createWhatsAppDraft(page, campaignName);
    const detailUrl = await openCampaignFromList(page, campaignName);
    await assertMappingsPersist(page, detailUrl);
    console.log('✅ Mapping persistence test passed');
  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'campaign-mapping-error.png'), fullPage: true }).catch(() => {});
    console.error('❌ Mapping persistence test failed:', err.message);
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
  if (!page.url().includes('/dashboard')) {
    throw new Error('Login failed');
  }
}

async function createWhatsAppDraft(page, name) {
  await page.goto(`${BASE_URL}/campaigns/new`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await page.type('input[name="name"]', name);
  await page.type('textarea[name="description"]', 'Automated mapping persistence test');
  await clickButtonByText(page, 'Next'); // Basics -> Audience
  await clickButtonByText(page, 'Next'); // Audience -> Content

  // Select first available template
  await page.waitForSelector('select[name="template_id"]', { timeout: 10000 });
  const templateOptions = await page.$$eval('select[name="template_id"] option', opts =>
    opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
  );
  const firstTemplate = templateOptions.find(o => o.value);
  if (!firstTemplate) throw new Error('No WhatsApp templates available');
  await page.select('select[name="template_id"]', firstTemplate.value);
  await page.waitForTimeout(500);

  // Map variables to contact fields if possible
  const variableSelects = await page.$$('div.border.p-3 select');
  if (variableSelects[0]) await variableSelects[0].select('contact.name');
  if (variableSelects[1]) await variableSelects[1].select('contact.phone');

  const variableInputs = await page.$$('div.border.p-3 input[type="text"]');
  if (variableInputs[0]) {
    await variableInputs[0].click({ clickCount: 3 });
    await variableInputs[0].type('StaticVar');
  }

  // Media header if present
  const mediaInput = await page.$('input[type="url"]');
  if (mediaInput) {
    await mediaInput.click({ clickCount: 3 });
    await mediaInput.type('https://via.placeholder.com/600x400.png');
  }

  await clickButtonByText(page, 'Next'); // Content -> Review
  await clickButtonByText(page, 'Create Campaign', false) || await clickButtonByText(page, 'Save', false);
  await page.waitForTimeout(1500);
}

async function openCampaignFromList(page, name) {
  await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });
  await page.type('#search', name);
  await page.waitForTimeout(500);
  await page.waitForXPath(`//tr[.//td[contains(text(),"${name}")]]//button[contains(., "View")]`, { timeout: 10000 });
  const [viewBtn] = await page.$x(`//tr[.//td[contains(text(),"${name}")]]//button[contains(., "View")]`);
  await Promise.all([
    viewBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  const detailUrl = page.url();
  if (!detailUrl.includes('/campaigns/')) throw new Error('Failed to open campaign detail');
  return detailUrl;
}

async function assertMappingsPersist(page, detailUrl) {
  // Go to edit page
  const [editBtn] = await page.$x('//button[contains(., "Edit")]');
  if (!editBtn) throw new Error('Edit button not found');
  await Promise.all([
    editBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  // Wait for template selects
  await page.waitForSelector('select[name="template_id"]', { timeout: 10000 });
  const variableSelects = await page.$$('div.border.p-3 select');
  if (variableSelects.length === 0) throw new Error('No variable selects found on edit');

  const firstVal = await page.$eval('div.border.p-3 select', el => el.value);
  if (!firstVal.startsWith('contact')) {
    throw new Error(`Expected mapping to persist, saw "${firstVal}"`);
  }
}

async function clickButtonByText(page, text, require = true) {
  const [button] = await page.$x(`//button[contains(., "${text}")]`);
  if (!button) {
    if (require) throw new Error(`Button with text "${text}" not found`);
    return null;
  }
  await button.click();
  return button;
}

run();
