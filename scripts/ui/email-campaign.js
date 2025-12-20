/**
 * UI test: Email campaign creation flow
 * Assumptions:
 * - Email channel may or may not be connected; test focuses on UI path to create draft
 * - Backend/frontend servers running on localhost:3173
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

    await page.goto(`${BASE_URL}/campaigns/new`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    // Basics
    const campaignName = `Puppeteer Email ${Date.now()}`;
    await page.type('input[name="name"]', campaignName);
    await page.type('textarea[name="description"]', 'Automated UI test email campaign');
    const emailRadioBasics = await page.$('input[type="radio"][value="email"]');
    if (!emailRadioBasics) throw new Error('Email channel radio not found on basics step');
    await emailRadioBasics.click();
    await clickButtonByText(page, 'Next');

    // Audience (all contacts)
    await clickButtonByText(page, 'Next');

    // Content step (already on email)
    await page.type('input[name="subject"]', 'Automation Subject');
    await page.type('textarea[name="message_content"]', 'Automation body content via Puppeteer.');
    await clickButtonByText(page, 'Next');

    // Review -> Create
    await clickButtonByText(page, 'Create Campaign', false);
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(LOG_DIR, 'ui-campaign-email.png'), fullPage: true });
    console.log('✅ Email campaign creation flow executed');
  } catch (err) {
    console.error('❌ UI email test failed:', err.message);
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
