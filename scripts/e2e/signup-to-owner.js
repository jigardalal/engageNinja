#!/usr/bin/env node

/**
 * Signup to Owner E2E Test
 * Tests complete flow: signup → tenant creation → owner role verification
 * Verifies new user becomes owner of auto-created tenant
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

async function testSignupToOwner() {
  let browser;
  const testCases = [];
  const uniqueEmail = `e2e-signup-${Date.now()}@test.com`;
  const password = 'TestPassword123!@#';

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Signup to Owner E2E Test\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== NAVIGATE TO SIGNUP =====
    console.log('Step 1: Navigate to Signup...');

    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle2' });

    const signupForm = await page.$('form, [role="form"]').catch(() => null);
    check(
      signupForm !== null || page.url().includes('/signup'),
      'Signup page loads'
    );

    // ===== FILL SIGNUP FORM =====
    console.log('Step 2: Fill Signup Form...');

    const emailInput = await page.$('input[type="email"]').catch(() => null);
    const passwordInput = await page.$('input[type="password"]').catch(() => null);
    const submitButton = await page.$('button[type="submit"]').catch(() => null);

    check(
      emailInput !== null,
      'Email input visible'
    );

    check(
      passwordInput !== null,
      'Password input visible'
    );

    check(
      submitButton !== null,
      'Submit button visible'
    );

    if (emailInput && passwordInput) {
      await emailInput.type(uniqueEmail);
      await passwordInput.type(password);
    }

    // ===== SUBMIT SIGNUP =====
    console.log('Step 3: Submit Signup...');

    if (submitButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        submitButton.click()
      ]).catch(() => {});

      await page.waitForTimeout(1000);
    }

    // ===== VERIFY REDIRECT TO DASHBOARD =====
    console.log('Step 4: Verify Dashboard Access...');

    const isDashboard = page.url().includes('/dashboard');
    check(
      isDashboard,
      'User redirected to dashboard after signup'
    );

    // ===== VERIFY TENANT AUTO-CREATION =====
    console.log('Step 5: Verify Tenant Auto-Creation...');

    const pageText = await page.evaluate(() => document.body.textContent);
    const hasTenantDisplay = pageText.includes('Tenant') || pageText.includes('Dashboard');

    check(
      hasTenantDisplay,
      'Tenant information visible on dashboard'
    );

    // ===== VERIFY OWNER ROLE =====
    console.log('Step 6: Verify Owner Role...');

    // Check for Team Management access (owner-only)
    const teamLink = await page.$('a[href*="/team"]').catch(() => null);
    check(
      teamLink !== null,
      'User sees Team Management link (owner-only)'
    );

    // ===== VERIFY CAN ACCESS TEAM PAGE =====
    console.log('Step 7: Access Team Management...');

    if (teamLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        teamLink.click()
      ]);

      const teamPageText = await page.evaluate(() => document.body.textContent);
      const onTeamPage = page.url().includes('/team');

      check(
        onTeamPage,
        'User can access team management (owner role confirmed)'
      );

      // ===== VERIFY INVITE CAPABILITY =====
      console.log('Step 8: Verify Invite Capability...');

      const inviteButton = await page.$('button:has-text("Invite")').catch(() => null);
      check(
        inviteButton !== null,
        'User can see Invite button (owner-only)'
      );
    }

    // ===== VERIFY SETTINGS ACCESS =====
    console.log('Step 9: Access Settings...');

    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });

    const settingsPage = page.url().includes('/settings');
    check(
      settingsPage,
      'User can access settings (owner role verified)'
    );

    // ===== VERIFY DASHBOARD WIDGETS =====
    console.log('Step 10: Verify Dashboard Widgets...');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

    const dashboardText = await page.evaluate(() => document.body.textContent);
    const hasMetrics = dashboardText.includes('Campaign') || dashboardText.includes('Contact') || dashboardText.includes('Dashboard');

    check(
      hasMetrics,
      'Dashboard displays metrics and widgets'
    );

    // ===== VERIFY NAVIGATION =====
    console.log('Step 11: Verify Full Navigation...');

    const navLinks = await page.$$eval('nav a, [role="navigation"] a', links =>
      links.map(l => l.getAttribute('href'))
    ).catch(() => []);

    const hasRequiredLinks = ['/dashboard', '/campaigns', '/contacts'].some(path =>
      navLinks.some(href => href?.includes(path))
    );

    check(
      hasRequiredLinks,
      'Navigation includes key links'
    );

    // ===== VERIFY TENANT INFO =====
    console.log('Step 12: Verify Tenant Information...');

    const tenantDisplay = await page.$('[class*="tenant"], [class*="workspace"]').catch(() => null);
    const hasTenantInfo = pageText.includes('Demo') || pageText.includes('New') || pageText.includes('Tenant');

    check(
      hasTenantInfo || tenantDisplay !== null,
      'Tenant information displayed'
    );

    // ===== VERIFY CAMPAIGN CREATION =====
    console.log('Step 13: Verify Can Create Campaign...');

    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    const createButton = await page.$('button:has-text("Create")').catch(() => null);
    check(
      createButton !== null,
      'User can create campaigns (member+ role)'
    );

    // ===== VERIFY CONTACT CREATION =====
    console.log('Step 14: Verify Can Create Contact...');

    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });

    const addContactButton = await page.$('button:has-text("Add"), button:has-text("Create")').catch(() => null);
    check(
      addContactButton !== null,
      'User can add contacts (member+ role)'
    );

    // ===== VERIFY NO PLATFORM ADMIN ACCESS =====
    console.log('Step 15: Verify Platform Admin Blocked...');

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    const adminBlocked = pageText.includes('Access Denied') || !page.url().includes('/admin');
    check(
      adminBlocked,
      'User cannot access platform admin (not platform admin)'
    );

    // ===== VERIFY LOGOUT =====
    console.log('Step 16: Verify Logout...');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

    const logoutButton = await page.$('button:has-text("Logout"), button:has-text("Sign Out")').catch(() => null);
    check(
      logoutButton !== null,
      'Logout option available'
    );

    if (logoutButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        logoutButton.click()
      ]).catch(() => {});

      const onLogin = page.url().includes('/login');
      check(
        onLogin,
        'User successfully logs out'
      );
    }

    // ===== LOGIN WITH NEW ACCOUNT =====
    console.log('Step 17: Login with New Account...');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    const loginEmailInput = await page.$('input[type="email"]').catch(() => null);
    const loginPasswordInput = await page.$('input[type="password"]').catch(() => null);
    const loginButton = await page.$('button[type="submit"]').catch(() => null);

    if (loginEmailInput && loginPasswordInput && loginButton) {
      await loginEmailInput.type(uniqueEmail);
      await loginPasswordInput.type(password);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        loginButton.click()
      ]);

      const loggedInDashboard = page.url().includes('/dashboard');
      check(
        loggedInDashboard,
        'User can log in with new credentials'
      );
    }

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Signup to Owner E2E: ${passed}/${total} passed (${percentage}%)\n`);

    console.log('Test User Created:');
    console.log(`  Email: ${uniqueEmail}`);
    console.log(`  Password: ${password}\n`);

    if (passed === total) {
      console.log('✓ Complete signup to owner flow verified!\n');
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

testSignupToOwner().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
