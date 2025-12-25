const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== Testing Tenant Selection Redirect Flow ===\n');

  try {
    // Step 1: Go to dashboard (should redirect to login)
    console.log('1. Navigating to dashboard...');
    await page.goto('http://localhost:3173/dashboard', { waitUntil: 'networkidle2', timeout: 10000 });
    let url = page.url();
    console.log('   Redirected to:', url);
    if (url.includes('/login')) {
      console.log('   ✅ Correctly redirected to login\n');
    }

    // Step 2: Login
    console.log('2. Logging in...');
    await page.type('input[name="email"]', 'user@engageninja.local');
    await page.type('input[name="password"]', 'UserPassword123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    url = page.url();
    console.log('   Redirected to:', url);

    if (url.includes('/tenants')) {
      console.log('   ✅ Correctly redirected to /tenants (tenant selection)\n');
    } else if (url.includes('/dashboard')) {
      console.log('   ✅ User has single tenant, went directly to dashboard\n');
    }

    // Step 3: Try to access settings without selecting tenant (if on /tenants)
    if (url.includes('/tenants')) {
      console.log('3. Testing protection: Try accessing /settings without selecting tenant...');
      await page.goto('http://localhost:3173/settings?tab=tenant', { waitUntil: 'networkidle2', timeout: 10000 });
      url = page.url();
      console.log('   Navigated to:', url);

      if (url.includes('/tenants')) {
        console.log('   ✅ Correctly redirected back to /tenants\n');
      } else if (url.includes('/settings')) {
        console.log('   ⚠️  Warning: Was able to access /settings without selecting tenant\n');
      }

      // Step 4: Select a tenant
      console.log('4. Selecting a tenant...');
      // Look for the first "Switch" or "Select" button
      const buttons = await page.$$('button');
      let foundSwitch = false;

      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Switch') || text.includes('Select')) {
          console.log('   Found button:', text.trim());
          await btn.click();
          foundSwitch = true;
          break;
        }
      }

      if (foundSwitch) {
        await page.waitForNavigation({ timeout: 10000 });
        url = page.url();
        console.log('   Redirected to:', url);
        if (url.includes('/dashboard')) {
          console.log('   ✅ Successfully switched to dashboard\n');
        }
      }

      // Step 5: Now access settings
      console.log('5. Accessing /settings after tenant selection...');
      await page.goto('http://localhost:3173/settings?tab=tenant', { waitUntil: 'networkidle2', timeout: 10000 });
      url = page.url();
      console.log('   Navigated to:', url);

      if (url.includes('/settings')) {
        console.log('   ✅ Successfully accessed settings page\n');

        // Check for errors on the page
        const pageErrors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
          return Array.from(errorElements).map(el => el.textContent);
        });

        if (pageErrors.length > 0) {
          console.log('   ⚠️  Errors found on page:');
          pageErrors.forEach(err => console.log('      -', err.substring(0, 100)));
        } else {
          console.log('   ✅ No errors on settings page');
        }
      }
    }

    console.log('\n========================================');
    console.log('✅ Flow test completed');
    console.log('========================================');

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
  }
})();
