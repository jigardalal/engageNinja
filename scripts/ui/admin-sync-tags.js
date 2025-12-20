/**
 * UI test: Admin syncs global tags into a tenant and sees them in tenant tags UI
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const LOG_DIR = path.join(__dirname, '../../logs');
const ADMIN = { email: 'platform.admin@engageninja.local', password: 'PlatformAdminPassword123' };

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
    page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 })
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
    await login(page, ADMIN);

    const tagName = `sync-ui-${Date.now()}`;

    // Create a global tag via API (session already authenticated)
    const tenantId = await page.evaluate(async (tag) => {
      const createRes = await fetch('/api/admin/global-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: tag })
      });
      if (!createRes.ok) {
        throw new Error('Failed to create global tag for sync test');
      }
      const tenantRes = await fetch('/api/admin/tenants?search=Demo', { credentials: 'include' });
      const tenantJson = await tenantRes.json();
      const demo = (tenantJson.tenants || []).find(t => t.name === 'Demo Tenant');
      return demo?.id;
    }, tagName);

    if (!tenantId) {
      throw new Error('Tenant id not found for sync test');
    }

    const switchStatus = await page.evaluate(async (id) => {
      const res = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId: id })
      });
      return res.status;
    }, tenantId);

    if (switchStatus !== 200) {
      throw new Error('Failed to set active tenant');
    }

    // Sync global tags into tenant via UI button
    await page.goto(`${BASE_URL}/admin/tenants/${tenantId}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="sync-tags-button"]', { timeout: 10000 });
    const syncResponse = page.waitForResponse(
      (res) => res.url().includes('/sync-global-tags') && res.status() === 200,
      { timeout: 15000 }
    );
    await page.click('[data-testid="sync-tags-button"]');
    await syncResponse;

    // Switch to tenant tags UI and verify tag is present
    await page.goto(`${BASE_URL}/tags`, { waitUntil: 'networkidle2' });
    await page.waitForSelector(`table input[value="${tagName}"]`, { timeout: 15000 });

    await page.screenshot({ path: path.join(LOG_DIR, 'admin-sync-tags.png'), fullPage: true });
    console.log('✅ Admin sync tags UI verified');
  } catch (err) {
    console.error('❌ Admin sync tags UI test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
