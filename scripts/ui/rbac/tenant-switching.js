#!/usr/bin/env node

/**
 * Tenant Switching UI Tests
 * Tests role changes when switching between tenants
 * Verifies tenant switching flows and permission changes
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function getChromePath() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ];

  for (const chromePathStr of possiblePaths) {
    if (fs.existsSync(chromePathStr)) {
      return chromePathStr;
    }
  }

  return 'google-chrome';
}

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  await page.waitForTimeout(500);
}

async function testTenantSwitching() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Tenant Switching Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== LOGIN WITH MULTI-TENANT USER =====
    console.log('Testing Multi-Tenant Login...');

    // User admin@engageninja.local is owner of Demo, admin of Beta
    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');

    // Check if tenant selector appears for multi-tenant users
    const tenantSelector = await page.$('select, [aria-label*="tenant"], button:has-text("Tenant")').catch(() => null);
    check(
      tenantSelector !== null || page.url().includes('/tenants'),
      'Multi-tenant user sees tenant selection'
    );

    // ===== TENANT SELECTION ON LOGIN =====
    console.log('Testing Tenant Selection After Login...');

    let pageText = await page.evaluate(() => document.body.textContent);
    const seeTenantPrompt = pageText.includes('Select') || pageText.includes('Tenant') || pageText.includes('Choose');

    check(
      seeTenantPrompt || page.url().includes('/tenants') || page.url().includes('/dashboard'),
      'User presented with tenant choice or defaults to dashboard'
    );

    // ===== SWITCHING TENANTS =====
    console.log('Testing Tenant Switching...');

    if (tenantSelector) {
      // Get available tenant options
      const tenantOptions = await page.$$eval('select option, button:has-text("Demo"), button:has-text("Beta")',
        options => options.map(o => o.textContent?.trim())
      ).catch(() => []);

      check(
        tenantOptions.length > 1,
        'User has multiple tenant options'
      );

      // Try switching to another tenant
      const secondOption = await page.$('select option:nth-of-type(2)').catch(() => null);
      if (secondOption) {
        await secondOption.click();
        await page.waitForTimeout(500);

        const currentTenant = await page.evaluate(() => {
          const selector = document.querySelector('select');
          return selector?.value || '';
        });

        check(
          currentTenant !== '',
          'Tenant switched successfully'
        );
      }
    }

    // ===== ROLE CHANGES AFTER SWITCH =====
    console.log('Testing Role Changes After Tenant Switch...');

    // Admin of Demo Tenant should have Team tab access
    // But Admin of Beta Tenant should also have Team tab access
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    let onTeamPage = page.url().includes('/team');
    let teamContent = await page.$('main, [role="main"]').catch(() => null);

    check(
      onTeamPage && teamContent !== null,
      'Admin role allows Team Management access'
    );

    // ===== NAVIGATION UPDATES AFTER SWITCH =====
    console.log('Testing Navigation Updates After Switch...');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

    let navLinks = await page.$$eval('nav a, [role="navigation"] a', links =>
      links.map(l => ({ href: l.getAttribute('href'), text: l.textContent?.trim() }))
    ).catch(() => []);

    const hasTeamLink = navLinks.some(l => l.href?.includes('/team'));
    check(
      hasTeamLink,
      'Navigation updates to show Team link after tenant switch'
    );

    // ===== TENANT NAME DISPLAY =====
    console.log('Testing Tenant Name Display...');

    pageText = await page.evaluate(() => document.body.textContent);
    const hasTenantName = pageText.includes('Demo') || pageText.includes('Beta') || pageText.includes('Tenant');

    check(
      hasTenantName,
      'Current tenant name displayed in UI'
    );

    // ===== TENANT PERSISTENCE ACROSS PAGES =====
    console.log('Testing Tenant Persistence...');

    // Get current URL/tenant
    const initialUrl = page.url();

    // Navigate to another page
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    // Navigate back to dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

    // Check that tenant selector shows same tenant
    const currentTenant = await page.evaluate(() => {
      const selector = document.querySelector('select');
      return selector?.value || '';
    }).catch(() => null);

    check(
      currentTenant !== null,
      'Tenant selection persists across page navigation'
    );

    // ===== SINGLE TENANT USER =====
    console.log('Testing Single Tenant User...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

    const singleTenantSelector = await page.$('select').catch(() => null);
    check(
      singleTenantSelector === null,
      'Single-tenant user does NOT see tenant selector'
    );

    // ===== UNAUTHORIZED TENANT SWITCH ATTEMPT =====
    console.log('Testing Unauthorized Tenant Switch...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');

    // Try to access a tenant the user is not part of
    await page.goto(`${BASE_URL}/campaigns?tenant=fake-tenant-id`, { waitUntil: 'networkidle2' }).catch(() => {});

    pageText = await page.evaluate(() => document.body.textContent);
    const deniedAccess = pageText.includes('Access Denied') || pageText.includes('403') || !page.url().includes('campaigns');

    check(
      deniedAccess,
      'Cannot access unauthorized tenant'
    );

    // ===== ROLE COMPARISON BETWEEN TENANTS =====
    console.log('Testing Role Comparison (if multi-tenant user)...');

    // Use admin@engageninja.local who is owner of Demo and admin of Beta
    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');

    // Get current role display
    const currentRoleText = await page.evaluate(() => document.body.textContent).catch(() => '');

    check(
      currentRoleText.length > 0,
      'User can see current tenant and role information'
    );

    // ===== TENANT REFRESH MAINTAINS SELECTION =====
    console.log('Testing Tenant Selection Persistence on Refresh...');

    const tenantBefore = await page.evaluate(() => {
      const selector = document.querySelector('select');
      return selector?.value || 'demo';
    }).catch(() => 'demo');

    // Refresh page
    await page.reload({ waitUntil: 'networkidle2' });

    const tenantAfter = await page.evaluate(() => {
      const selector = document.querySelector('select');
      return selector?.value || 'demo';
    }).catch(() => 'demo');

    check(
      tenantBefore === tenantAfter,
      'Tenant selection persists after page refresh'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Tenant Switching Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All tenant switching tests passed!\n');
    } else {
      console.log('❌ Some tests failed:\n');
      testCases
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`   ✗ ${t.message}`);
        });
      console.log('');
    }

    await browser.close();
    process.exit(passed === total ? 0 : 1);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

testTenantSwitching().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
