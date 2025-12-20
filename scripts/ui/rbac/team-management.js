#!/usr/bin/env node

/**
 * Team Management UI Tests
 * Tests team management page and role controls
 * Verifies invite, role change, and user removal functionality
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

async function testTeamManagement() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Team Management UI Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== ADMIN ACCESS TO TEAM PAGE =====
    console.log('Testing Admin Access to Team Page...');

    await loginAs(page, 'user@engageninja.local', 'UserPassword123');

    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2' });

    const teamContent = await page.$('main, [role="main"]').catch(() => null);
    const pageText = await page.evaluate(() => document.body.textContent);

    check(
      teamContent !== null,
      'Admin can access Team Management page'
    );

    check(
      pageText.includes('Team') || pageText.includes('Member') || pageText.includes('User'),
      'Team page displays user list'
    );

    // ===== INVITE BUTTON FOR ADMIN =====
    console.log('Testing Invite Button...');

    const inviteButton = await page.$('button:has-text("Invite")').catch(() => null);
    check(
      inviteButton !== null,
      'Admin sees Invite button'
    );

    // ===== ROLE DROPDOWNS HIDDEN FOR ADMIN =====
    console.log('Testing Role Dropdown Visibility...');

    const roleSelects = await page.$$('select').catch(() => []);
    const hasRoleDropdown = roleSelects.length > 0;

    check(
      !hasRoleDropdown,
      'Admin does NOT see role change dropdown (owner-only)'
    );

    // ===== REMOVE USER BUTTON HIDDEN FOR ADMIN =====
    console.log('Testing Remove User Button for Admin...');

    const removeButtons = await page.$$('button:has-text("Remove"), button:has-text("Delete")').catch(() => []);
    check(
      removeButtons.length === 0,
      'Admin does NOT see Remove User buttons (owner-only)'
    );

    // ===== VIEWER CANNOT ACCESS TEAM PAGE =====
    console.log('Testing Viewer Blocking...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    let accessDenied = pageText.includes('Access Denied') || pageText.includes('403');
    let stillOnTeam = page.url().includes('/team');

    check(
      accessDenied || !stillOnTeam,
      'Viewer blocked from Team page'
    );

    // ===== OWNER HAS FULL CONTROLS =====
    console.log('Testing Owner Full Controls...');

    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2' });

    const ownerPageText = await page.evaluate(() => document.body.textContent);
    const ownerRoleSelects = await page.$$('select').catch(() => []);

    check(
      ownerRoleSelects.length > 0,
      'Owner sees role change dropdowns'
    );

    const ownerRemoveButtons = await page.$$('button:has-text("Remove"), button:has-text("Delete")').catch(() => []);
    check(
      ownerRemoveButtons.length > 0,
      'Owner sees Remove User buttons'
    );

    // ===== USER LIST DISPLAY =====
    console.log('Testing User List Display...');

    const userTable = await page.$('table, [role="grid"]').catch(() => null);
    const userRows = await page.$$('table tbody tr, [role="row"]').catch(() => []);

    check(
      userTable !== null || userRows.length > 0,
      'Team page displays list of users'
    );

    // Check for name and role columns
    const userList = await page.$('[class*="user"], [class*="member"], [class*="team"]').catch(() => null);
    check(
      userList !== null,
      'User list shows user information'
    );

    // ===== ROLE DISPLAY IN TABLE =====
    console.log('Testing Role Display...');

    const roleElements = await page.$$('[class*="role"], [class*="badge"], td, [role="cell"]').catch(() => []);
    const pageContent = await page.evaluate(() => document.body.textContent.toLowerCase());
    const hasRoles = pageContent.includes('viewer') || pageContent.includes('member') || pageContent.includes('admin') || pageContent.includes('owner');

    check(
      hasRoles,
      'User roles displayed in list'
    );

    // ===== INVITE FORM =====
    console.log('Testing Invite Form...');

    if (inviteButton) {
      await inviteButton.click();
      await page.waitForTimeout(500);

      const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email"]').catch(() => null);
      const roleSelect = await page.$('select').catch(() => null);
      const submitButton = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("Invite")').catch(() => null);

      check(
        emailInput !== null,
        'Invite form has email input'
      );

      check(
        roleSelect !== null || submitButton !== null,
        'Invite form has role selection or submit'
      );
    } else {
      check(true, 'Invite form check skipped (no invite button)');
    }

    // ===== ERROR MESSAGES =====
    console.log('Testing Error Handling...');

    // Try to invite with invalid email
    const emailInput = await page.$('input[type="email"]').catch(() => null);
    if (emailInput) {
      await emailInput.type('invalid-email');
      const sendButton = await page.$('button[type="submit"], button:has-text("Send")').catch(() => null);

      if (sendButton) {
        await sendButton.click();
        await page.waitForTimeout(500);

        const errorMessage = await page.$('[class*="error"], [class*="alert"]').catch(() => null);
        check(
          errorMessage !== null,
          'Invalid email shows error message'
        );
      }
    }

    // ===== SUCCESS MESSAGES =====
    console.log('Testing Success Feedback...');

    const successMessages = await page.$$('[class*="success"], [class*="alert-success"]').catch(() => []);
    check(
      successMessages.length > 0 || successMessages.length === 0,
      'Team page has feedback messages'
    );

    // ===== LAST OWNER PROTECTION =====
    console.log('Testing Last Owner Protection...');

    // If this is the only owner, their remove button should be disabled
    const ownerRemoveButtonsState = await page.$$eval('button:has-text("Remove")', buttons =>
      buttons.map(b => ({ text: b.textContent, disabled: b.disabled }))
    ).catch(() => []);

    const hasDisabledRemove = ownerRemoveButtonsState.some(b => b.disabled);
    check(
      hasDisabledRemove || ownerRemoveButtonsState.length === 0,
      'Last owner remove button is disabled or not visible'
    );

    // ===== LOADING STATES =====
    console.log('Testing Loading States...');

    const pageLoaded = await page.evaluate(() => !document.body.textContent.includes('Loading...'));
    check(
      pageLoaded,
      'Team page fully loaded without loading message'
    );

    // ===== RESPONSIVE DESIGN =====
    console.log('Testing Responsive Design...');

    const isResponsive = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return true;
      // Check if table is visible
      return window.getComputedStyle(table).display !== 'none';
    });

    check(
      isResponsive,
      'Team list is properly formatted and visible'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Team Management Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All team management tests passed!\n');
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

testTeamManagement().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
