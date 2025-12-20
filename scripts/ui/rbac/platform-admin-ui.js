#!/usr/bin/env node

/**
 * Platform Admin UI Tests
 * Tests platform admin dashboard and administrative features
 * Verifies admin can manage tenants, view audit logs, and access restricted features
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

async function testPlatformAdminUI() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Platform Admin UI Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== ADMIN DASHBOARD ACCESS =====
    console.log('Testing Admin Dashboard Access...');

    await loginAs(page, 'platform.admin@engageninja.local', 'PlatformAdminPassword123');

    const adminLink = await page.$('a[href*="/admin"]').catch(() => null);
    check(
      adminLink !== null,
      'Platform admin sees Admin link in navigation'
    );

    if (adminLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        adminLink.click()
      ]);

      const pageText = await page.evaluate(() => document.body.textContent);
      check(
        pageText.includes('Admin') || page.url().includes('/admin'),
        'Platform admin can access Admin Dashboard'
      );
    }

    // ===== TENANT LIST =====
    console.log('Testing Tenant List...');

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });

    const tenantTable = await page.$('table, [role="grid"]').catch(() => null);
    check(
      tenantTable !== null,
      'Admin dashboard displays tenant list'
    );

    const tenantRows = await page.$$('table tbody tr, [role="row"]').catch(() => []);
    check(
      tenantRows.length > 0,
      'Tenant list has entries'
    );

    // ===== TENANT DETAIL PAGE =====
    console.log('Testing Tenant Detail Page...');

    const firstTenantLink = await page.$('a[href*="/admin/tenants/"]').catch(() => null);
    if (firstTenantLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        firstTenantLink.click()
      ]);

      const detailPageText = await page.evaluate(() => document.body.textContent);
      check(
        detailPageText.includes('Tenant') || page.url().includes('/admin/tenants/'),
        'Can access tenant detail page'
      );

      // Check for tenant info
      const tenantName = await page.$('h1, h2').catch(() => null);
      check(
        tenantName !== null,
        'Tenant detail shows name'
      );

      // Check for status display
      const statusBadge = await page.$('[class*="status"], [class*="badge"]').catch(() => null);
      check(
        statusBadge !== null,
        'Tenant detail shows status'
      );
    }

    // ===== CREATE TENANT BUTTON =====
    console.log('Testing Create Tenant Feature...');

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });

    const createButton = await page.$('button:has-text("Create"), button:has-text("Add")').catch(() => null);
    check(
      createButton !== null,
      'Admin sees Create Tenant button'
    );

    // ===== TENANT STATUS MANAGEMENT =====
    console.log('Testing Tenant Status Controls...');

    const firstTenantRow = await page.$('table tbody tr, [role="row"]').catch(() => null);
    if (firstTenantRow) {
      const statusControls = await page.$$('button, select').catch(() => []);
      check(
        statusControls.length > 0,
        'Tenant list has status control buttons'
      );
    }

    // ===== AUDIT LOG ACCESS =====
    console.log('Testing Audit Log Access...');

    const auditLink = await page.$('a[href*="audit"], button:has-text("Audit")').catch(() => null);
    check(
      auditLink !== null,
      'Admin sees link to Audit Logs'
    );

    if (auditLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        auditLink.click()
      ]);

      const auditPageText = await page.evaluate(() => document.body.textContent);
      check(
        auditPageText.includes('Audit') || page.url().includes('audit'),
        'Can access Audit Logs page'
      );

      const auditTable = await page.$('table, [role="grid"]').catch(() => null);
      check(
        auditTable !== null,
        'Audit logs displayed in table'
      );
    }

    // ===== AUDIT LOG FILTERING =====
    console.log('Testing Audit Log Filtering...');

    const filterInputs = await page.$$('input[type="search"], input[placeholder*="filter"], select').catch(() => []);
    check(
      filterInputs.length > 0,
      'Audit logs have filter controls'
    );

    const actionFilter = await page.$('select, input[aria-label*="action"]').catch(() => null);
    check(
      actionFilter !== null || filterInputs.length > 0,
      'Can filter audit logs'
    );

    // ===== STATISTICS/METRICS =====
    console.log('Testing Admin Statistics...');

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });

    const statsCards = await page.$$('[class*="card"], [class*="stat"], [class*="metric"]').catch(() => []);
    check(
      statsCards.length > 0,
      'Admin dashboard shows statistics'
    );

    const statsText = await page.evaluate(() => document.body.textContent);
    const hasMetrics = statsText.includes('Tenant') || statsText.includes('User') || statsText.includes('Active');
    check(
      hasMetrics,
      'Statistics display key metrics'
    );

    // ===== REGULAR USER CANNOT ACCESS =====
    console.log('Testing Regular User Blocking...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    const accessDenied = await page.evaluate(() =>
      document.body.textContent.includes('Access Denied') ||
      document.body.textContent.includes('403') ||
      document.body.textContent.includes('not authorized')
    );

    const isStillOnAdmin = page.url().includes('/admin');

    check(
      accessDenied || !isStillOnAdmin,
      'Regular user blocked from Admin Dashboard'
    );

    // ===== ADMIN LINK NOT VISIBLE TO REGULAR USERS =====
    console.log('Testing Admin Link Visibility...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');

    const noAdminLink = await page.$('a[href*="/admin"]').catch(() => null);
    check(
      noAdminLink === null,
      'Regular user does NOT see Admin link'
    );

    // ===== SEARCH FUNCTIONALITY =====
    console.log('Testing Search/Filter Functionality...');

    await loginAs(page, 'platform.admin@engageninja.local', 'PlatformAdminPassword123');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });

    const searchInput = await page.$('input[type="search"], input[placeholder*="search"]').catch(() => null);
    check(
      searchInput !== null,
      'Admin dashboard has search/filter input'
    );

    // ===== PAGINATION =====
    console.log('Testing Pagination...');

    const paginationControls = await page.$$('button[aria-label*="page"], button:has-text("Next"), button:has-text("Previous")').catch(() => []);
    const pageInfo = await page.$('span:has-text("Page"), span:has-text("of")').catch(() => null);

    check(
      paginationControls.length > 0 || pageInfo !== null,
      'Admin list has pagination controls'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Platform Admin UI Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All platform admin UI tests passed!\n');
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

testPlatformAdminUI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
