/**
 * UI test: Contacts CRUD (create, edit, delete)
 * Flow: login -> contacts -> create new contact -> open detail -> edit -> delete
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

  const uniquePhone = '+1415' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  const updatedName = 'Puppeteer Contact Updated';

  try {
    console.log('Step: login');
    // Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    const submitBtn = await clickButtonBySelector(page, 'button[type="submit"]') || await clickButtonByText(page, 'Log in', false);
    if (!submitBtn) throw new Error('Login submit button not found');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 15000 });

    // Contacts page
    console.log('Step: contacts list');
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });
    await page.waitForXPath("//h1[contains(., 'Contacts')]", { timeout: 10000 });
    const newButton = await clickButtonByText(page, '+ New Contact', false) || await clickButtonByText(page, 'New Contact', false);
    if (!newButton) throw new Error('New Contact button not found');

    // Fill create modal
    console.log('Step: create modal');
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });
    await page.type('input[name="name"]', 'Puppeteer Contact');
    await page.type('input[name="phone"]', uniquePhone);
    await page.type('input[name="email"]', 'puppet@example.com');
    const [firstTag] = await page.$x("//div[contains(@class,'flex-wrap')]/span[contains(@class,'cursor-pointer')][1]");
    if (firstTag) await firstTag.click();
    await clickButtonByText(page, 'Create Contact');
    await page.waitForTimeout(1000);

    // Find the new contact row and open detail
    console.log('Step: search and open detail');
    await page.type('#search', uniquePhone);
    const viewXPath = `//table//tr[.//td[contains(., "${uniquePhone}")]]//button[contains(., "View")]`;
    await page.waitForXPath(viewXPath, { timeout: 12000 });
    const [viewBtn] = await page.$x(viewXPath);
    await viewBtn.click();
    await page.waitForFunction(() => window.location.pathname.includes('/contacts/'), { timeout: 15000 });

    // Edit contact
    console.log('Step: edit contact');
    await clickButtonByText(page, 'Edit Contact');
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });
    await page.click('input[name="name"]', { clickCount: 3 });
    await page.type('input[name="name"]', updatedName);
    await clickButtonByText(page, 'Save Changes');
    await page.waitForTimeout(800);

    // Delete contact
    console.log('Step: delete contact');
    await clickButtonByText(page, 'Delete Contact');
    await page.waitForXPath("//button[contains(., 'Delete Contact')]", { timeout: 5000 });
    const [confirmBtn] = await page.$x("//button[contains(., 'Delete Contact')]");
    await confirmBtn.click();
    await page.waitForTimeout(1500);
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });
    await page.waitForXPath("//h1[contains(., 'Contacts')]", { timeout: 10000 });
    await page.type('#search', uniquePhone);
    const rows = await page.$x(`//table//tr[.//td[contains(., "${uniquePhone}")]]`);
    if (rows.length > 0) throw new Error('Contact still present after delete');

    await page.screenshot({ path: path.join(LOG_DIR, 'ui-contacts-crud.png'), fullPage: true });
    console.log('✅ Contacts CRUD flow executed');
  } catch (err) {
    console.error('❌ UI contacts test failed:', err.message);
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
