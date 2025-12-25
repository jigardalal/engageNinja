const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== Testing Tenant Selection Redirect with Debugging ===\n');

  try {
    // Login
    console.log('1. Going to login...');
    await page.goto('http://localhost:3173/login', { waitUntil: 'networkidle2' });

    await page.type('input[name="email"]', 'user@engageninja.local');
    await page.type('input[name="password"]', 'UserPassword123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });

    let url = page.url();
    console.log('   After login, redirected to:', url);

    if (url.includes('/tenants')) {
      console.log('   ✅ Correctly at tenant selection page\n');
    }

    // Try accessing /settings without selecting tenant
    console.log('2. Attempting to access /settings without selecting tenant...');

    // Navigate to settings
    await page.goto('http://localhost:3173/settings?tab=tenant', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    url = page.url();
    console.log('   Final URL:', url);

    // Check what the React state shows
    const activeTenant = await page.evaluate(() => {
      // Try to find React DevTools or check window object
      try {
        return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || 'DevTools not available';
      } catch (e) {
        return 'Error checking DevTools';
      }
    });

    // Try to check document for errors or redirects
    const pageContent = await page.evaluate(() => {
      return document.location.href;
    });

    console.log('   Document location:', pageContent);

    if (url.includes('/settings')) {
      console.log('   ❌ Still on /settings - redirect did NOT happen');
      console.log('   ⚠️  This is a BUG - should have been redirected to /tenants');
    } else if (url.includes('/tenants')) {
      console.log('   ✅ Correctly redirected to /tenants');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
