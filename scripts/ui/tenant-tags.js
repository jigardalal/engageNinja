/**
 * UI test: Tenant Tags CRUD + role gating
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const LOG_DIR = path.join(__dirname, '../../logs');

const USERS = {
  owner: { email: 'admin@engageninja.local', password: 'AdminPassword123' },
  member: { email: 'member@engageninja.local', password: 'MemberPassword123' }
};

const getChromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const linuxChrome = '/usr/bin/google-chrome';
  const winChrome = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
  const candidates = [macChrome, linuxChrome, winChrome];
  return candidates.find(fs.existsSync);
};

async function login(page, { email, password }) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 12000 })
  ]);
}

async function run() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const chromePath = getChromePath();
  if (!chromePath) {
    throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH to your browser.');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1280, height: 800 });

  try {
    // Owner/admin flow
    await login(page, USERS.owner);
    await page.goto(`${BASE_URL}/tags`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="create-tag-input"]', { timeout: 10000 });

    const tagName = `puppeteer-tenant-tag-${Date.now()}`;
    await page.type('[data-testid="create-tag-input"]', tagName);
    await page.click('text=Create Tag');
    await page.waitForSelector(`table input[value="${tagName}"]`, { timeout: 15000 });

    const rename = `${tagName}-renamed`;
    const createdSelector = `table input[value="${tagName}"]`;
    const renamedSelector = `table input[value="${rename}"]`;

    await page.click(createdSelector, { clickCount: 3 });
    await page.type(createdSelector, rename);
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      el?.closest('tr')?.querySelector('button')?.click();
    }, createdSelector);

    await page.waitForSelector(renamedSelector, { timeout: 15000 });

    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      const row = el?.closest('tr');
      const select = row?.querySelector('select');
      if (select) {
        select.value = 'archived';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        row.querySelector('button')?.click();
      }
    }, renamedSelector);

    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const row = el.closest('tr');
        const select = row?.querySelector('select');
        const badge = row?.querySelector('span');
        return (select && select.value === 'archived') || (badge && badge.textContent.toLowerCase().includes('archived'));
      },
      { timeout: 15000 },
      renamedSelector
    );
    await page.screenshot({ path: path.join(LOG_DIR, 'tenant-tags-admin.png'), fullPage: true });

    // Member gating (read-only)
    const memberContext = await browser.createIncognitoBrowserContext();
    const memberPage = await memberContext.newPage();
    memberPage.setViewport({ width: 1280, height: 800 });
    await login(memberPage, USERS.member);
    await memberPage.goto(`${BASE_URL}/tags`, { waitUntil: 'networkidle2' });
    await memberPage.waitForSelector('[data-testid="create-tag-input"]', { timeout: 10000 });

    const createDisabled = await memberPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Tag'));
      return btn ? btn.disabled : false;
    });
    const firstSaveDisabled = await memberPage.$eval('[data-testid="tenant-tags-table"] button', (btn) => btn.disabled);
    if (!createDisabled || !firstSaveDisabled) {
      throw new Error('Member should not be able to edit tags');
    }
    await memberPage.screenshot({ path: path.join(LOG_DIR, 'tenant-tags-member.png'), fullPage: true });
    await memberContext.close();

    console.log('✅ Tenant tags UI verified (CRUD + gating)');
  } catch (err) {
    console.error('❌ Tenant tags UI test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
