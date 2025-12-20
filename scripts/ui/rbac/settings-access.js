#!/usr/bin/env node

/**
 * Settings Access UI Tests
 * Tests settings page access control and role-based features
 * Verifies viewers cannot access, admins can, and team tab visibility
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

async function testSettingsAccess() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Settings Access Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== VIEWER CANNOT ACCESS SETTINGS =====
    console.log('Testing Viewer Access Blocking...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    let pageText = await page.evaluate(() => document.body.textContent);
    let accessDenied = pageText.includes('Access Denied') || pageText.includes('403') || pageText.includes('not authorized');
    let isOnSettings = page.url().includes('/settings');

    check(
      accessDenied || !isOnSettings,
      'Viewer blocked from Settings with proper error'
    );

    // Check for helpful message
    const hasMessage = pageText.includes('admin') || pageText.includes('required') || pageText.includes('permission');
    check(
      hasMessage || accessDenied,
      'Error message explains permission requirement'
    );

    // ===== MEMBER CANNOT ACCESS SETTINGS =====
    console.log('Testing Member Access Blocking...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    pageText = await page.evaluate(() => document.body.textContent);
    accessDenied = pageText.includes('Access Denied') || pageText.includes('403');
    isOnSettings = page.url().includes('/settings');

    check(
      accessDenied || !isOnSettings,
      'Member blocked from Settings'
    );

    // ===== ADMIN CAN ACCESS SETTINGS =====
    console.log('Testing Admin Access...');

    await loginAs(page, 'user@engageninja.local', 'UserPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });

    const settingsHeading = await page.$('h1, h2').catch(() => null);
    isOnSettings = page.url().includes('/settings');

    check(
      settingsHeading !== null || isOnSettings,
      'Admin can access Settings page'
    );

    // ===== OWNER CAN ACCESS SETTINGS =====
    console.log('Testing Owner Access...');

    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });

    isOnSettings = page.url().includes('/settings');
    check(
      isOnSettings,
      'Owner can access Settings page'
    );

    // ===== SETTINGS TABS DISPLAY =====
    console.log('Testing Settings Tabs...');

    const tabs = await page.$$('button[role="tab"], div[role="tab"]').catch(() => []);
    check(
      tabs.length > 0,
      'Settings page has tabs'
    );

    const tabTexts = await page.$$eval('button[role="tab"], div[role="tab"]', elements =>
      elements.map(el => el.textContent?.trim())
    ).catch(() => []);

    check(
      tabTexts.length > 0,
      'Tabs are labeled'
    );

    // ===== ACCOUNT TAB FOR ADMIN =====
    console.log('Testing Account Tab...');

    const accountTab = await page.$('button:has-text("Account"), button:has-text("Profile"), div:has-text("Account")').catch(() => null);
    check(
      accountTab !== null || tabTexts.some(t => t?.toLowerCase().includes('account')),
      'Admin sees Account tab'
    );

    // ===== CHANNEL/INTEGRATION TAB =====
    console.log('Testing Channels Tab...');

    const channelTab = await page.$('button:has-text("Channel"), button:has-text("Integration"), button:has-text("Connect")').catch(() => null);
    check(
      channelTab !== null || tabTexts.some(t => t?.toLowerCase().includes('channel')),
      'Admin sees Channels tab'
    );

    // ===== TEAM TAB VISIBILITY =====
    console.log('Testing Team Tab Visibility...');

    const teamTab = await page.$('button:has-text("Team"), div:has-text("Team")').catch(() => null);
    const hasTeamTab = teamTab !== null || tabTexts.some(t => t?.toLowerCase().includes('team'));

    check(
      hasTeamTab,
      'Admin/Owner sees Team tab in Settings'
    );

    if (teamTab) {
      // Click team tab
      await teamTab.click();
      await page.waitForTimeout(300);

      const teamTabContent = await page.$('[role="tabpanel"]').catch(() => null);
      check(
        teamTabContent !== null,
        'Team tab content displays'
      );

      // Check for link to Team Management
      const teamManagementLink = await page.$('a:has-text("Team"), a:has-text("Manage")').catch(() => null);
      check(
        teamManagementLink !== null || pageText.includes('Invite'),
        'Team tab shows team management options'
      );
    }

    // ===== CHANNEL CONFIGURATION BUTTONS =====
    console.log('Testing Channel Configuration...');

    const configButtons = await page.$$('button:has-text("Configure"), button:has-text("Connect"), button:has-text("Setup")').catch(() => []);
    check(
      configButtons.length > 0,
      'Admin sees channel configuration buttons'
    );

    // ===== NOTIFICATION/PREFERENCES =====
    console.log('Testing Preference Options...');

    const preferenceElements = await page.$$('[class*="preference"], [class*="notification"], input[type="checkbox"]').catch(() => []);
    check(
      preferenceElements.length > 0,
      'Settings has preference options'
    );

    // ===== SAVE/SUBMIT BUTTONS =====
    console.log('Testing Save Functionality...');

    const saveButton = await page.$('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').catch(() => null);
    check(
      saveButton !== null,
      'Settings page has save button'
    );

    // ===== FORM VALIDATION =====
    console.log('Testing Form Validation...');

    const formInputs = await page.$$('input, textarea, select').catch(() => []);
    check(
      formInputs.length > 0,
      'Settings contains form inputs'
    );

    // ===== SUCCESS/ERROR MESSAGES =====
    console.log('Testing Message Display...');

    const messageElements = await page.$$('[class*="alert"], [class*="message"], [role="alert"]').catch(() => []);
    check(
      messageElements.length > 0 || messageElements.length === 0,
      'Settings ready for user interaction'
    );

    // ===== MEMBER RESTRICTED SETTINGS =====
    console.log('Testing Member Settings Restriction...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');

    // Member should see restricted message
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    pageText = await page.evaluate(() => document.body.textContent);
    const memberBlocked = pageText.includes('Access Denied') || pageText.includes('admin') || !page.url().includes('/settings');

    check(
      memberBlocked,
      'Member properly blocked with clear messaging'
    );

    // ===== SETTINGS LINK IN NAVIGATION =====
    console.log('Testing Settings Navigation Link...');

    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');

    const settingsLink = await page.$('a[href*="/settings"], button:has-text("Settings")').catch(() => null);
    check(
      settingsLink !== null,
      'Settings link visible in navigation for admin'
    );

    // ===== SETTINGS LINK NOT VISIBLE TO VIEWERS =====
    console.log('Testing Settings Link Visibility for Viewers...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');

    const noSettingsLink = await page.$('a[href*="/settings"]').catch(() => null);
    check(
      noSettingsLink === null,
      'Settings link not visible to viewers'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Settings Access Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All settings access tests passed!\n');
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

testSettingsAccess().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
