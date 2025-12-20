/**
 * UI test: Default landing behavior
 * Verifies platform role lands on admin console and tenant user lands on dashboard
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const LOG_DIR = path.join(__dirname, '../../logs');
const USERS = {
  platformAdmin: {
    email: 'platform.admin@engageninja.local',
    password: 'PlatformAdminPassword123'
  },
  tenantOwner: {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  }
};

const getChromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const linuxChrome = '/usr/bin/google-chrome';
  const winChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const candidates = [macChrome, linuxChrome, winChrome];
  return candidates.find(fs.existsSync);
};

async function loginAndWait(page, email, password, pathCheck) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForFunction(pathCheck, { timeout: 12000 })
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

  try {
    // Platform admin should land on admin console
    const adminContext = await browser.createIncognitoBrowserContext();
    const adminPage = await adminContext.newPage();
    adminPage.setViewport({ width: 1280, height: 800 });

    await loginAndWait(
      adminPage,
      USERS.platformAdmin.email,
      USERS.platformAdmin.password,
      () => window.location.pathname.startsWith('/admin')
    );

    const adminPath = await adminPage.evaluate(() => window.location.pathname);
    if (!adminPath.startsWith('/admin')) {
      throw new Error(`Expected admin landing, got ${adminPath}`);
    }
    await adminPage.waitForXPath("//h1[contains(., 'Admin Dashboard')]", { timeout: 10000 });
    await adminPage.screenshot({ path: path.join(LOG_DIR, 'default-landing-admin.png'), fullPage: true });
    await adminContext.close();

    // Tenant owner should land on dashboard
    const tenantContext = await browser.createIncognitoBrowserContext();
    const tenantPage = await tenantContext.newPage();
    tenantPage.setViewport({ width: 1280, height: 800 });

    await loginAndWait(
      tenantPage,
      USERS.tenantOwner.email,
      USERS.tenantOwner.password,
      () => window.location.pathname === '/dashboard'
    );

    const tenantPath = await tenantPage.evaluate(() => window.location.pathname);
    if (tenantPath !== '/dashboard') {
      throw new Error(`Expected dashboard landing, got ${tenantPath}`);
    }
    await tenantPage.waitForXPath("//h1[contains(., 'Dashboard')]", { timeout: 10000 });
    await tenantPage.screenshot({ path: path.join(LOG_DIR, 'default-landing-tenant.png'), fullPage: true });
    await tenantContext.close();

    console.log('✅ Default landing behavior verified for platform admin and tenant user.');
  } catch (err) {
    console.error('❌ Default landing test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
