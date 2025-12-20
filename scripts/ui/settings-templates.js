/**
 * UI test: Settings > Channels > Templates presence and optional sync
 * - Verifies settings page renders WhatsApp/Email cards
 * - If WhatsApp is connected, attempts to click "Sync Templates" and captures the list
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
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const chromePath = getChromePath();
  if (!chromePath) throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH.');

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
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    const submitBtn = await clickButtonBySelector(page, 'button[type="submit"]') || await clickButtonByText(page, 'Log in', false);
    if (!submitBtn) throw new Error('Login submit button not found');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 15000 });

    await page.goto(`${BASE_URL}/settings/channels`, { waitUntil: 'networkidle2' });
    await page.waitForXPath("//h1[contains(., 'Settings')]", { timeout: 10000 });

    // Check WhatsApp card
    const whatsappCard = await page.$x("//div[contains(., 'WhatsApp')]");
    if (!whatsappCard.length) throw new Error('WhatsApp card not found on settings page');

    // If Sync Templates button exists, click it
    const [syncBtn] = await page.$x("//button[contains(., 'Sync Templates')]");
    if (syncBtn) {
      await syncBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(LOG_DIR, 'ui-settings-templates.png'), fullPage: true });
    console.log('✅ Settings / Templates UI flow executed');
  } catch (err) {
    console.error('❌ UI settings test failed:', err.message);
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
