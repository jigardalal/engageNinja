/**
 * UI test: WhatsApp template variable + media header flow
 * Assumptions:
 * - A WhatsApp template is already synced in the tenant
 * - User credentials below are valid
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const EMAIL = 'admin@engageninja.local';
const PASSWORD = 'AdminPassword123';
const LOG_DIR = path.join(__dirname, '../../logs');

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

  const userDataDir = path.join(__dirname, '.chrome-tmp');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-crash-reporter', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1280, height: 900 });

  try {
    // Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await Promise.all([
      clickButtonBySelector(page, 'button[type="submit"]') || clickButtonByText(page, 'Log in', false),
      page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 })
    ]);

    // Create campaign page
    await page.goto(`${BASE_URL}/campaigns/new`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    // Fill basics
    const campaignName = `Puppeteer WhatsApp ${Date.now()}`;
    await page.type('input[name="name"]', campaignName);
    await page.type('textarea[name="description"]', 'Automated UI test campaign');
    await clickButtonByText(page, 'Next');

    // Audience step: keep All contacts
    await clickButtonByText(page, 'Next');

    // Content step: ensure templates exist
    const templateSelect = await page.$('select[name="template_id"]');
    if (!templateSelect) throw new Error('Template select not found (no WhatsApp templates?)');
    const options = await page.$$eval('select[name="template_id"] option', (opts) =>
      opts.map((o) => ({ value: o.value, text: o.textContent.trim() }))
    );
    const firstTemplate = options.find((o) => o.value);
    if (!firstTemplate) throw new Error('No templates available to select');
    await page.select('select[name="template_id"]', firstTemplate.value);

    // If variable inputs exist, fill the first one and map second (if present) to contact name
    const variableCards = await page.$$('div.border.p-3');
    if (variableCards.length > 0) {
      const textInputs = await page.$$('div.border.p-3 input[type="text"]');
      if (textInputs[0]) {
        await textInputs[0].click({ clickCount: 3 });
        await textInputs[0].type('Test Value');
      }
      const selects = await page.$$('div.border.p-3 select');
      if (selects[1]) {
        await selects[1].select('contact.name');
      }
    }

    // Media header URL if field present
    const mediaInput = await page.$('input[type="url"]');
    if (mediaInput) {
      await mediaInput.type('https://via.placeholder.com/600x400.png');
    }

    await clickButtonByText(page, 'Next');

    // Review -> Create
    const createBtn = await clickButtonByText(page, 'Create Campaign', false);
    if (createBtn) {
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: path.join(LOG_DIR, 'ui-campaign-template.png'), fullPage: true });
    console.log('✅ Campaign creation flow executed');
  } catch (err) {
    console.error('❌ UI test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();

async function clickButtonByText(page, text, require = true) {
  const [button] = await page.$x(`//button[contains(., "${text}")]`);
  if (!button) {
    if (require) throw new Error(`Button with text "${text}" not found`);
    return null;
  }
  await button.click();
  return button;
}

async function clickButtonBySelector(page, selector) {
  const btn = await page.$(selector);
  if (btn) {
    await btn.click();
    return btn;
  }
  return null;
}
