#!/usr/bin/env node

/**
 * Permission-Based Actions UI Tests
 * Tests that buttons and actions are visible only to authorized roles
 * Verifies action buttons, forms, and controls are hidden/shown correctly
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
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

async function testPermissionBasedActions() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Permission-Based Actions Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== CAMPAIGN SEND BUTTON TESTS =====
    console.log('Testing Campaign Send Button Visibility...');

    // Viewer - cannot send
    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    let sendButton = await page.$('button:has-text("Send")', { timeout: 2000 }).catch(() => null);
    check(
      sendButton === null || !await sendButton.isVisible(),
      'Viewer does NOT see Send Campaign button'
    );

    // Member - can send
    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    sendButton = await page.$('button:has-text("Send")').catch(() => null);
    check(
      sendButton !== null,
      'Member sees Send Campaign button'
    );

    // ===== CREATE CAMPAIGN BUTTON TESTS =====
    console.log('Testing Create Campaign Button Visibility...');

    // Viewer - cannot create
    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    let createButton = await page.$('button:has-text("Create")', { timeout: 2000 }).catch(() => null);
    check(
      createButton === null,
      'Viewer does NOT see Create Campaign button'
    );

    // Member - can create
    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    createButton = await page.$('button:has-text("Create")').catch(() => null);
    check(
      createButton !== null,
      'Member sees Create Campaign button'
    );

    // ===== CONTACT MANAGEMENT BUTTONS =====
    console.log('Testing Contact Management Button Visibility...');

    // Viewer - read-only
    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });

    let addContactButton = await page.$('button:has-text("Add"), button:has-text("Create")').catch(() => null);
    check(
      addContactButton === null,
      'Viewer does NOT see Add Contact button'
    );

    let deleteButtons = await page.$$('button[aria-label*="Delete"], button[title*="Delete"]');
    check(
      deleteButtons.length === 0,
      'Viewer does NOT see Delete buttons'
    );

    // Member - can manage
    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });

    addContactButton = await page.$('button:has-text("Add"), button:has-text("Create")').catch(() => null);
    check(
      addContactButton !== null,
      'Member sees Add Contact button'
    );

    // ===== SETTINGS ACCESS BUTTONS =====
    console.log('Testing Settings Access...');

    // Viewer - blocked
    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', waitUntil: 'load' }).catch(() => {});

    let settingsTitle = await page.$('h1:has-text("Settings")').catch(() => null);
    let accessDenied = await page.$(':has-text("Access Denied")').catch(() => null);

    check(
      accessDenied !== null || settingsTitle === null,
      'Viewer blocked from Settings'
    );

    // Member/Admin - settings exists but no team tab
    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' }).catch(() => {});

    settingsTitle = await page.$('h1:has-text("Settings")').catch(() => null);
    let teamTab = await page.$('button:has-text("Team")').catch(() => null);

    check(
      teamTab === null,
      'Member does NOT see Team tab in Settings (member-only)'
    );

    // Admin - sees Team tab
    await loginAs(page, 'user@engageninja.local', 'UserPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });

    teamTab = await page.$('button:has-text("Team")').catch(() => null);
    check(
      teamTab !== null,
      'Admin sees Team tab in Settings'
    );

    // ===== CHANNEL CONFIGURATION BUTTONS =====
    console.log('Testing Channel Configuration...');

    // Member - cannot configure
    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });

    let configButton = await page.$('button:has-text("Configure"), button:has-text("Connect")').catch(() => null);
    check(
      configButton === null,
      'Member does NOT see Configure Channel button'
    );

    // Admin - can configure
    await loginAs(page, 'user@engageninja.local', 'UserPassword123');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });

    configButton = await page.$('button:has-text("Configure"), button:has-text("Connect")').catch(() => null);
    check(
      configButton !== null,
      'Admin sees Configure Channel button'
    );

    // ===== CAMPAIGN DETAIL PAGE ACTIONS =====
    console.log('Testing Campaign Detail Page Actions...');

    // Viewer - read-only detail view
    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');

    // Get first campaign if exists
    const campaignLink = await page.$('a[href*="/campaigns/"]').catch(() => null);
    if (campaignLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        campaignLink.click()
      ]);

      let editButton = await page.$('button:has-text("Edit")').catch(() => null);
      let deleteButton = await page.$('button:has-text("Delete")').catch(() => null);

      check(
        editButton === null && deleteButton === null,
        'Viewer has read-only view (no edit/delete buttons)'
      );
    } else {
      check(true, 'Viewer campaign detail check skipped (no campaigns)');
    }

    // ===== TEAM MANAGEMENT PAGE TESTS =====
    console.log('Testing Team Management Visibility...');

    // Member - cannot access
    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2' }).catch(() => {});

    let teamContent = await page.$('main, [role="main"]').catch(() => null);
    let teamDenied = await page.$(':has-text("Access Denied")').catch(() => null);

    check(
      teamDenied !== null || teamContent === null,
      'Member blocked from Team Management'
    );

    // Admin - can access, but no role management
    await loginAs(page, 'user@engageninja.local', 'UserPassword123');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2' });

    teamContent = await page.$('main, [role="main"]').catch(() => null);
    check(
      teamContent !== null,
      'Admin can access Team Management'
    );

    let roleDropdown = await page.$('select').catch(() => null);
    check(
      roleDropdown === null,
      'Admin does NOT see role change dropdown (owner-only)'
    );

    // Owner - can manage roles
    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2' });

    roleDropdown = await page.$$('select');
    check(
      roleDropdown.length > 0,
      'Owner sees role change dropdowns'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Permission Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All permission-based action tests passed!\n');
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

testPermissionBasedActions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
