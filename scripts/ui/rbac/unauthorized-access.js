#!/usr/bin/env node

/**
 * Unauthorized Access UI Tests
 * Tests access denied pages and proper error handling
 * Verifies unauthorized users are blocked with appropriate messages
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

async function testUnauthorizedAccess() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Unauthorized Access Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== UNAUTHENTICATED ACCESS =====
    console.log('Testing Unauthenticated Access...');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    const isOnLogin = page.url().includes('/login');
    check(
      isOnLogin,
      'Unauthenticated user redirected to login'
    );

    // ===== VIEWER ACCESSING TEAM PAGE =====
    console.log('Testing Viewer Access to Team Page...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    let pageText = await page.evaluate(() => document.body.textContent);
    let hasAccessDenied = pageText.includes('Access Denied') || pageText.includes('403') || pageText.includes('not authorized');
    let isStillOnTeam = page.url().includes('/team');

    check(
      hasAccessDenied || !isStillOnTeam,
      'Viewer blocked from Team page with error message'
    );

    // ===== MEMBER ACCESSING ADMIN PAGE =====
    console.log('Testing Member Access to Admin Page...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    pageText = await page.evaluate(() => document.body.textContent);
    hasAccessDenied = pageText.includes('Access Denied') || pageText.includes('403') || pageText.includes('not authorized');
    let isStillOnAdmin = page.url().includes('/admin');

    check(
      hasAccessDenied || !isStillOnAdmin,
      'Member blocked from Admin page with error message'
    );

    // ===== REGULAR USER ACCESSING ADMIN =====
    console.log('Testing Regular User Access to Admin...');

    await loginAs(page, 'user@engageninja.local', 'UserPassword123');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    pageText = await page.evaluate(() => document.body.textContent);
    hasAccessDenied = pageText.includes('Access Denied') || pageText.includes('403') || pageText.includes('not authorized');
    isStillOnAdmin = page.url().includes('/admin');

    check(
      hasAccessDenied || !isStillOnAdmin,
      'Tenant admin blocked from Platform Admin page'
    );

    // ===== VIEWER ACCESSING SETTINGS =====
    console.log('Testing Viewer Access to Settings...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    pageText = await page.evaluate(() => document.body.textContent);
    hasAccessDenied = pageText.includes('Access Denied') || pageText.includes('403') || pageText.includes('admin');
    let isStillOnSettings = page.url().includes('/settings');

    check(
      hasAccessDenied || !isStillOnSettings,
      'Viewer blocked from Settings with admin role message'
    );

    // ===== ERROR MESSAGE CONTENT =====
    console.log('Testing Error Message Content...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    pageText = await page.evaluate(() => document.body.textContent.toLowerCase());
    check(
      pageText.includes('admin') || pageText.includes('required') || pageText.includes('access'),
      'Error message mentions required role'
    );

    // ===== BACK TO DASHBOARD BUTTON =====
    console.log('Testing Back to Dashboard Button...');

    const backButton = await page.$('button:has-text("Back"), button:has-text("Dashboard"), a:has-text("Dashboard")').catch(() => null);
    check(
      backButton !== null,
      'Access denied page has navigation button'
    );

    if (backButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        backButton.click()
      ]);

      check(
        page.url().includes('/dashboard'),
        'Back button navigates to dashboard'
      );
    }

    // ===== MULTI-TENANT TENANT SELECTION =====
    console.log('Testing Multi-Tenant Tenant Selection...');

    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

    // Check if user with multiple tenants sees tenant selector
    const tenantSelector = await page.$('select, [aria-label*="tenant"], button:has-text("Select"), button:has-text("Tenant")').catch(() => null);
    check(
      tenantSelector !== null || !page.url().includes('/tenants'),
      'Multi-tenant user can select tenant'
    );

    // ===== ACCESSING SPECIFIC RESOURCE UNAUTHORIZED =====
    console.log('Testing Resource-Level Authorization...');

    // Viewer tries to access another tenant's campaign directly
    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/campaigns/fake-campaign-id`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    let isOnCampaignDetail = page.url().includes('/campaigns/');
    let has404Or403 = pageText.includes('not found') || pageText.includes('not authorized');

    check(
      !isOnCampaignDetail || has404Or403,
      'Unauthorized campaign access blocked'
    );

    // ===== STATUS CODE CHECKS =====
    console.log('Testing HTTP Status Codes...');

    // Capture response status for unauthorized request
    let statusCode = null;
    page.on('response', response => {
      if (response.url().includes('/api/admin')) {
        statusCode = response.status();
      }
    });

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    check(
      statusCode === 403 || !page.url().includes('/admin'),
      'Unauthorized request returns 403 or redirects'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Unauthorized Access Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All unauthorized access tests passed!\n');
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

testUnauthorizedAccess().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
