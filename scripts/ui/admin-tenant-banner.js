/**
 * UI test: Platform admin switches to tenant context and sees admin banner
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

    // Resolve a tenant id via API and switch
    const tenantId = await page.evaluate(async () => {
      const res = await fetch('/api/admin/tenants?search=Demo', { credentials: 'include' });
      const data = await res.json();
      const demo = (data.tenants || []).find(t => t.name === 'Demo Tenant') || data.tenants?.[0];
      if (!demo) return null;
      await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId: demo.id })
      });
      return demo.id;
    });

    if (!tenantId) throw new Error('No tenant found to switch');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="admin-tenant-banner"]', { timeout: 12000 });
    await page.screenshot({ path: path.join(LOG_DIR, 'admin-tenant-banner.png'), fullPage: true });
    console.log('✅ Admin tenant banner verified');
  } catch (err) {
    console.error('❌ Admin tenant banner test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
