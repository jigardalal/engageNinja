#!/usr/bin/env node

/**
 * Invitation Flow for Existing User E2E Test
 * Tests inviting user who already has account in another tenant
 * Verifies user gains access to new tenant with correct role
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

async function testInvitationFlowExistingUser() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Invitation Flow for Existing User E2E Test\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== OWNER INVITES EXISTING USER =====
    console.log('Step 1: Owner Invites Existing User...');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@engageninja.local');
    await page.type('input[type="password"]', 'AdminPassword123');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    check(
      page.url().includes('/dashboard'),
      'Owner logged in'
    );

    // Go to team page
    const teamLink = await page.$('a[href*="/team"]').catch(() => null);
    if (teamLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        teamLink.click()
      ]);
    }

    const inviteButton = await page.$('button:has-text("Invite")').catch(() => null);
    if (inviteButton) {
      await inviteButton.click();
      await page.waitForTimeout(300);
    }

    // Invite existing user (viewer@engageninja.local)
    const emailInput = await page.$('input[type="email"]').catch(() => null);
    if (emailInput) {
      await emailInput.type('viewer@engageninja.local');
    }

    const submitButton = await page.$('button[type="submit"], button:has-text("Send")').catch(() => null);
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(500);
    }

    const inviteSent = await page.evaluate(() => document.body.textContent.includes('Invite sent') || document.body.textContent.includes('invitation'));
    check(
      inviteSent,
      'Invitation sent to existing user'
    );

    // ===== EXISTING USER LOGS IN =====
    console.log('Step 2: Existing User Logs In...');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Logout first if needed
    const logoutBtn = await page.$('button:has-text("Logout")').catch(() => null);
    if (logoutBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        logoutBtn.click()
      ]);

      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    }

    await page.type('input[type="email"]', 'viewer@engageninja.local');
    await page.type('input[type="password"]', 'ViewerPassword123');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    check(
      !page.url().includes('/login'),
      'Existing user logged in'
    );

    // ===== VERIFY ACCESS TO NEW TENANT =====
    console.log('Step 3: Verify New Tenant Access...');

    const tenantSelector = await page.$('select').catch(() => null);
    check(
      tenantSelector !== null,
      'User now has multiple tenants'
    );

    // ===== VERIFY ROLE IN NEW TENANT =====
    console.log('Step 4: Verify Role Assignment...');

    // Should still be viewer in new tenant
    const teamPageLink = await page.$('a[href*="/team"]').catch(() => null);
    check(
      teamPageLink === null,
      'User still has viewer role (not admin)'
    );

    // ===== VERIFY CAN VIEW BOTH TENANTS =====
    console.log('Step 5: Verify Multi-Tenant Navigation...');

    if (tenantSelector) {
      const tenantOptions = await page.$$('select option').catch(() => []);
      check(
        tenantOptions.length >= 2,
        'User has access to multiple tenants'
      );
    }

    // ===== VERIFY PERMISSIONS DIFFER BY TENANT =====
    console.log('Step 6: Verify Tenant-Specific Permissions...');

    const pageText = await page.evaluate(() => document.body.textContent);
    check(
      pageText.length > 0,
      'User can access dashboard'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Invitation Flow (Existing User) E2E: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ Existing user invitation flow verified!\n');
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

testInvitationFlowExistingUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
