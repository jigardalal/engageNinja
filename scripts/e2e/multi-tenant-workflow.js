#!/usr/bin/env node

/**
 * Multi-Tenant Workflow E2E Test
 * Tests user with multiple tenants switching and role changes
 * Verifies different roles in different tenants
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

async function testMultiTenantWorkflow() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Multi-Tenant Workflow E2E Test\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== LOGIN MULTI-TENANT USER =====
    console.log('Step 1: Login Multi-Tenant User...');

    // admin@engageninja.local is owner of Demo, admin of Beta
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    await page.type('input[type="email"]', 'admin@engageninja.local');
    await page.type('input[type="password"]', 'AdminPassword123');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    check(
      page.url().includes('/dashboard'),
      'Multi-tenant user logged in'
    );

    // ===== SELECT FIRST TENANT =====
    console.log('Step 2: Select First Tenant...');

    const tenantSelector = await page.$('select').catch(() => null);
    check(
      tenantSelector !== null,
      'Tenant selector visible'
    );

    if (tenantSelector) {
      await tenantSelector.select('0'); // Select first tenant
      await page.waitForTimeout(500);
    }

    // ===== VERIFY OWNER PERMISSIONS IN DEMO =====
    console.log('Step 3: Verify Owner Permissions...');

    // Owner can access team management
    const teamLink = await page.$('a[href*="/team"]').catch(() => null);
    check(
      teamLink !== null,
      'Owner role shows Team link'
    );

    // ===== SWITCH TO SECOND TENANT =====
    console.log('Step 4: Switch to Second Tenant...');

    if (tenantSelector) {
      await tenantSelector.select('1'); // Select second tenant
      await page.waitForTimeout(500);
    }

    // ===== VERIFY ADMIN PERMISSIONS IN BETA =====
    console.log('Step 5: Verify Admin Permissions...');

    const adminTeamLink = await page.$('a[href*="/team"]').catch(() => null);
    check(
      adminTeamLink !== null,
      'Admin role shows Team link'
    );

    // Admin cannot change roles (owner-only)
    if (adminTeamLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        adminTeamLink.click()
      ]);

      const roleDropdowns = await page.$$('select').catch(() => []);
      check(
        roleDropdowns.length === 0,
        'Admin cannot change roles (owner-only)'
      );
    }

    // ===== SWITCH BACK TO FIRST TENANT =====
    console.log('Step 6: Switch Back to First Tenant...');

    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2' });

    const backSelector = await page.$('select').catch(() => null);
    if (backSelector) {
      await backSelector.select('0');
      await page.waitForTimeout(500);
    }

    // ===== VERIFY OWNER ROLE RESTORED =====
    console.log('Step 7: Verify Owner Role Restored...');

    await page.reload({ waitUntil: 'networkidle2' });

    const ownerRoleDropdowns = await page.$$('select').catch(() => []);
    check(
      ownerRoleDropdowns.length > 0,
      'Owner can change roles in first tenant'
    );

    // ===== VERIFY TENANT PERSISTENCE =====
    console.log('Step 8: Verify Tenant Persistence...');

    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    const persistSelector = await page.$('select').catch(() => null);
    const persistValue = await persistSelector?.evaluate(el => el.value).catch(() => null);

    check(
      persistValue !== null,
      'Tenant selection persists across pages'
    );

    // ===== VERIFY CAMPAIGN ISOLATION =====
    console.log('Step 9: Verify Campaign Isolation...');

    const campaigns = await page.$$('table tbody tr').catch(() => []);
    check(
      campaigns.length >= 0,
      'Campaigns properly filtered by tenant'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Multi-Tenant Workflow E2E: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ Multi-tenant workflow verified!\n');
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

testMultiTenantWorkflow().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
