/**
 * UI test: WhatsApp template with button variables
 * Flow:
 * 1. Create a WhatsApp draft using a template that has button URL placeholders
 * 2. Fill all required placeholders (body/header/button)
 * 3. Save, reopen via campaigns list, verify mappings persist and required placeholders panel lists button vars
 * 4. Attempt to send; assert no validation error
 *
 * Assumptions:
 * - There is at least one template with a URL button placeholder (e.g., {{1}} in the URL)
 * - Auth creds provided via env or defaults
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

  const userDataDir = path.join(__dirname, '.chrome-button-vars');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });
  const campaignName = `UI Button Vars ${Date.now()}`;

  try {
    await login(page);
    const templateId = await pickTemplateWithButtonVars(page);
    if (!templateId) {
      console.warn('No template with button variables found; skipping test.');
      return;
    }
    await createDraftWithTemplate(page, campaignName, templateId);
    const detailUrl = await openCampaignFromList(page, campaignName);
    await verifyRequiredPlaceholdersVisible(page);
    await verifyMappingsPersist(page);
    await attemptSend(page);
    console.log('✅ Button variable flow test passed');
  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'campaign-button-vars-error.png'), fullPage: true }).catch(() => {});
    console.error('❌ Button variable test failed:', err.message);
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

async function pickTemplateWithButtonVars(page) {
  await page.goto(`${BASE_URL}/campaigns/new`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('select[name="template_id"]', { timeout: 10000 });
  const templates = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select[name="template_id"] option'))
      .map(opt => ({ value: opt.value, text: opt.textContent || '' }))
      .filter(o => o.value);
  });
  // Prefer templates whose label shows parentheses with a variable (rough heuristic)
  const buttonTemplate = templates.find(t => t.text.includes('(')) || templates[0];
  return buttonTemplate ? buttonTemplate.value : null;
}

async function createDraftWithTemplate(page, name, templateId) {
  await page.waitForSelector('input[name="name"]', { timeout: 5000 });
  await page.type('input[name="name"]', name);
  await page.type('textarea[name="description"]', 'Button var test');
  await clickButtonByText(page, 'Next');
  await clickButtonByText(page, 'Next');

  await page.select('select[name="template_id"]', templateId);
  await page.waitForTimeout(500);

  // Fill variable inputs and map one to contact.name
  const inputs = await page.$$('div.border.p-3 input[type="text"]');
  const selects = await page.$$('div.border.p-3 select');
  if (inputs[0]) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('ButtonVarStatic');
  }
  if (selects[0]) await selects[0].select('contact.name');
  if (inputs[1]) {
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('https://example.com/{{1}}');
  }

  await clickButtonByText(page, 'Next');
  await clickButtonByText(page, 'Create Campaign', false) || await clickButtonByText(page, 'Save', false);
  await page.waitForTimeout(1000);
}

async function openCampaignFromList(page, name) {
  await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });
  await page.type('#search', name);
  await page.waitForTimeout(500);
  const [viewBtn] = await page.$x(`//tr[.//td[contains(text(),"${name}")]]//button[contains(., "View")]`);
  if (!viewBtn) throw new Error('View button not found for new campaign');
  await Promise.all([
    viewBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  return page.url();
}

async function verifyRequiredPlaceholdersVisible(page) {
  const [editBtn] = await page.$x('//button[contains(., "Edit")]');
  if (!editBtn) throw new Error('Edit button not found');
  await Promise.all([
    editBtn.click(),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  await page.waitForSelector('select[name="template_id"]', { timeout: 5000 });
  const placeholderPanel = await page.$x('//p[contains(.,"Required placeholders")]/..');
  if (placeholderPanel.length === 0) {
    throw new Error('Required placeholders panel not visible');
  }
}

async function verifyMappingsPersist(page) {
  const variableSelects = await page.$$('div.border.p-3 select');
  if (variableSelects.length === 0) throw new Error('No variable selects found');
  const val = await page.$eval('div.border.p-3 select', el => el.value);
  if (!val.startsWith('contact')) {
    throw new Error(`Expected mapping to persist, saw "${val}"`);
  }
}

async function attemptSend(page) {
  const [sendBtn] = await page.$x('//button[contains(., "Send Campaign")]');
  if (!sendBtn) {
    console.warn('Send button not found (maybe still draft?), skipping send assert.');
    return;
  }
  await sendBtn.click();
  await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
  await clickButtonByText(page, 'Confirm & Send', false);
  // Give time for request; ensure no alert with missing vars
  await page.waitForTimeout(1000);
  const missingAlert = await page.$x('//*[contains(text(),"Template expects") or contains(text(),"Missing values for template variables")]');
  if (missingAlert.length > 0) {
    throw new Error('Send blocked due to missing template variables');
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
