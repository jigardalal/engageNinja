const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log('🌐 BROWSER:', msg.text());
  });

  console.log('=== Testing with Console Log Capture ===\n');

  try {
    await page.goto('http://localhost:3173/login', { waitUntil: 'networkidle2' });

    await page.type('input[name="email"]', 'user@engageninja.local');
    await page.type('input[name="password"]', 'UserPassword123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });

    const url1 = page.url();
    console.log('After login:', url1, '\n');

    // Now try to access /settings
    console.log('Navigating to /settings...\n');
    await page.goto('http://localhost:3173/settings?tab=tenant', { waitUntil: 'networkidle2' });

    const url2 = page.url();
    console.log('\nFinal URL:', url2);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
