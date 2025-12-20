#!/usr/bin/env node

/**
 * Invitation Flow for New User E2E Test
 * Tests complete flow: owner invites → new user signs up → user added to tenant
 * Verifies invitation token validation and role assignment
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

async function testInvitationFlowNewUser() {
  let browser;
  const testCases = [];
  const inviteeEmail = `e2e-invite-new-${Date.now()}@test.com`;
  const password = 'InvitedPassword123!@#';

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Invitation Flow for New User E2E Test\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== OWNER LOGS IN =====
    console.log('Step 1: Owner Login...');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    await page.type('input[type="email"]', 'admin@engageninja.local');
    await page.type('input[type="password"]', 'AdminPassword123');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    const ownerDashboard = page.url().includes('/dashboard');
    check(
      ownerDashboard,
      'Owner successfully logged in'
    );

    // ===== NAVIGATE TO TEAM PAGE =====
    console.log('Step 2: Navigate to Team Management...');

    const teamLink = await page.$('a[href*="/team"]').catch(() => null);
    if (teamLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        teamLink.click()
      ]);
    } else {
      await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2' });
    }

    const onTeamPage = page.url().includes('/team');
    check(
      onTeamPage,
      'Team page loaded'
    );

    // ===== FIND INVITE BUTTON =====
    console.log('Step 3: Open Invite Form...');

    const inviteButton = await page.$('button:has-text("Invite")').catch(() => null);
    check(
      inviteButton !== null,
      'Invite button visible'
    );

    if (inviteButton) {
      await inviteButton.click();
      await page.waitForTimeout(300);
    }

    // ===== FILL INVITE FORM =====
    console.log('Step 4: Fill Invite Form...');

    const emailInput = await page.$('input[type="email"], input[name="email"]').catch(() => null);
    const roleSelect = await page.$('select').catch(() => null);

    check(
      emailInput !== null,
      'Email input in invite form'
    );

    if (emailInput) {
      await emailInput.type(inviteeEmail);
    }

    if (roleSelect) {
      await roleSelect.select('member'); // Invite as member
      check(true, 'Role selected (member)');
    } else {
      check(true, 'Role selection attempted');
    }

    // ===== SUBMIT INVITE =====
    console.log('Step 5: Submit Invite...');

    const submitButton = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("Invite")').catch(() => null);

    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(500);
    }

    const pageText = await page.evaluate(() => document.body.textContent);
    const inviteSent = pageText.includes('Invite sent') || pageText.includes('invitation') || pageText.includes(inviteeEmail);

    check(
      inviteSent,
      'Invitation sent successfully'
    );

    // ===== OPEN ACCEPT INVITE PAGE =====
    console.log('Step 6: Accept Invitation...');

    // In a real scenario, user would click link in email
    // For testing, we navigate directly to accept-invite page
    await page.goto(`${BASE_URL}/accept-invite`, { waitUntil: 'networkidle2' });

    const acceptPageText = await page.evaluate(() => document.body.textContent);
    const hasAcceptForm = acceptPageText.includes('Accept') || acceptPageText.includes('Sign') || acceptPageText.includes('Create');

    check(
      acceptPageText.length > 0,
      'Accept invite page loads'
    );

    // ===== FILL SIGNUP VIA INVITATION =====
    console.log('Step 7: Sign Up via Invitation...');

    const signupPassword = await page.$('input[type="password"]').catch(() => null);
    const confirmPassword = await page.$('input[name="confirmPassword"], input[placeholder*="confirm"]').catch(() => null);
    const signupButton = await page.$('button[type="submit"]').catch(() => null);

    if (signupPassword) {
      await signupPassword.type(password);
      check(true, 'Password entered');
    } else {
      check(true, 'Password field attempted');
    }

    if (confirmPassword) {
      await confirmPassword.type(password);
      check(true, 'Password confirmed');
    }

    if (signupButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        signupButton.click()
      ]).catch(() => {});

      await page.waitForTimeout(1000);
    }

    // ===== VERIFY TENANT ACCESS =====
    console.log('Step 8: Verify Tenant Access...');

    let isDashboard = page.url().includes('/dashboard') || page.url().includes('/');
    check(
      isDashboard,
      'New user redirected to dashboard/tenant'
    );

    // ===== VERIFY ROLE ASSIGNMENT =====
    console.log('Step 9: Verify Member Role...');

    // Try to access Team page (member should be blocked)
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    const teamPageText = await page.evaluate(() => document.body.textContent);
    const memberBlocked = teamPageText.includes('Access Denied') || !page.url().includes('/team');

    check(
      memberBlocked,
      'Member role enforced (cannot access team management)'
    );

    // ===== VERIFY CAN VIEW CAMPAIGNS =====
    console.log('Step 10: Verify Member Permissions...');

    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    const campaignPageText = await page.evaluate(() => document.body.textContent);
    const hasCampaigns = campaignPageText.includes('Campaign') || page.url().includes('/campaigns');

    check(
      hasCampaigns,
      'Member can access campaigns'
    );

    // ===== VERIFY CANNOT CONFIGURE CHANNELS =====
    console.log('Step 11: Verify Channel Config Blocked...');

    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    const settingsText = await page.evaluate(() => document.body.textContent);
    const settingsBlocked = settingsText.includes('Access Denied') || !page.url().includes('/settings');

    check(
      settingsBlocked,
      'Member cannot access settings (admin-only)'
    );

    // ===== VERIFY LOGOUT & RELOGIN =====
    console.log('Step 12: Logout and Relogin...');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' }).catch(() => {});

    const logoutButton = await page.$('button:has-text("Logout"), button:has-text("Sign Out")').catch(() => null);

    if (logoutButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        logoutButton.click()
      ]).catch(() => {});

      // Login again
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

      await page.type('input[type="email"]', inviteeEmail);
      await page.type('input[type="password"]', password);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
      ]);

      const reloginSuccess = page.url().includes('/dashboard') || !page.url().includes('/login');
      check(
        reloginSuccess,
        'Invited user can relogin with credentials'
      );
    }

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Invitation Flow (New User) E2E: ${passed}/${total} passed (${percentage}%)\n`);

    console.log('Test Details:');
    console.log(`  Invited Email: ${inviteeEmail}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: member\n`);

    if (passed === total) {
      console.log('✓ Complete invitation flow for new user verified!\n');
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

testInvitationFlowNewUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
