/**
 * UI test: Admin dashboard summary cards render stats
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
  page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', ADMIN.email);
    await page.type('input[name="password"]', ADMIN.password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 12000 })
    ]);

    await page.waitForFunction(() => {
      const h1s = Array.from(document.querySelectorAll('h1'));
      return h1s.some(h => h.textContent.includes('Admin Dashboard'));
    }, { timeout: 10000 });
    await page.waitForSelector('div.grid div.text-3xl', { timeout: 10000 });

    const labels = await page.$$eval('div.grid > div', nodes => nodes.map(n => {
      const first = n.querySelector('div');
      return first ? first.textContent.trim() : '';
    }));
    const required = ['Total Tenants', 'Active Tenants', 'Total Users', 'Active Users', 'WhatsApp Messages Sent', 'Email Messages Sent'];
    for (const label of required) {
      if (!labels.some(l => l.includes(label))) {
        throw new Error(`Missing dashboard card: ${label}`);
      }
    }

    await page.screenshot({ path: path.join(LOG_DIR, 'admin-dashboard-summary.png'), fullPage: true });
    console.log('✅ Admin dashboard summary verified');
  } catch (err) {
    console.error('❌ Admin dashboard summary test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
