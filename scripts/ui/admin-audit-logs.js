/**
 * UI test: Admin audit log viewer filters
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
  page.setViewport({ width: 1400, height: 900 });

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', ADMIN.email);
    await page.type('input[name="password"]', ADMIN.password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 })
    ]);

    // Create a config update to guarantee an audit log
    await page.evaluate(async () => {
      const key = `ui_audit_${Date.now()}`;
      await fetch(`/api/admin/config/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value: { enabled: true } })
      });
    });

    await page.goto(`${BASE_URL}/admin/audit-logs`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 10000 });

    // Filter by action
    await page.type('input[placeholder="e.g., user.login, tenant.create"]', 'config.update');
    await page.waitForFunction(() => {
      const badges = Array.from(document.querySelectorAll('table td .inline-flex'));
      return badges.some(b => b.textContent.includes('config.update'));
    }, { timeout: 15000 });

    await page.screenshot({ path: path.join(LOG_DIR, 'admin-audit-logs.png'), fullPage: true });
    console.log('✅ Admin audit logs UI verified');
  } catch (err) {
    console.error('❌ Admin audit logs UI test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
