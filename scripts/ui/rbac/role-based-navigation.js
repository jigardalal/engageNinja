#!/usr/bin/env node

/**
 * Role-Based Navigation UI Tests
 * Tests that navigation menu changes based on user role
 * Verifies navigation items visibility and active states
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper functions from existing scripts
function getChromePath() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    '/usr/bin/google-chrome', // Linux
    '/usr/bin/chromium'
  ];

  for (const chromePathStr of possiblePaths) {
    if (fs.existsSync(chromePathStr)) {
      return chromePathStr;
    }
  }

  return 'google-chrome'; // Fallback
}

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

  // Fill in login form
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);

  // Click login button
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  await page.waitForTimeout(500); // Wait for UI to settle
}

async function getNavLinks(page) {
  // Get all navigation links
  return await page.$$eval('nav a, [role="navigation"] a', links =>
    links.map(link => ({
      text: link.textContent?.trim(),
      href: link.getAttribute('href'),
      visible: link.offsetParent !== null
    }))
  );
}

async function testRoleBasedNavigation() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Role-Based Navigation Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== VIEWER ROLE NAVIGATION =====
    console.log('Testing Viewer Navigation...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');

    let links = await getNavLinks(page);
    let navText = links.map(l => l.href).join(' | ');

    check(
      links.some(l => l.href?.includes('/dashboard')),
      'Viewer sees Dashboard link'
    );
    check(
      links.some(l => l.href?.includes('/contacts')),
      'Viewer sees Contacts link'
    );
    check(
      links.some(l => l.href?.includes('/campaigns')),
      'Viewer sees Campaigns link'
    );
    check(
      links.some(l => l.href?.includes('/templates')),
      'Viewer sees Templates link'
    );
    check(
      links.some(l => l.href?.includes('/settings')),
      'Viewer sees Settings link'
    );
    check(
      !links.some(l => l.href?.includes('/team')),
      'Viewer does NOT see Team link'
    );
    check(
      !links.some(l => l.href?.includes('/admin')),
      'Viewer does NOT see Admin link'
    );

    // ===== MEMBER ROLE NAVIGATION =====
    console.log('Testing Member Navigation...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');

    links = await getNavLinks(page);

    check(
      links.some(l => l.href?.includes('/dashboard')),
      'Member sees Dashboard link'
    );
    check(
      links.some(l => l.href?.includes('/campaigns')),
      'Member sees Campaigns link'
    );
    check(
      !links.some(l => l.href?.includes('/team')),
      'Member does NOT see Team link'
    );
    check(
      !links.some(l => l.href?.includes('/admin')),
      'Member does NOT see Admin link'
    );

    // ===== ADMIN ROLE NAVIGATION =====
    console.log('Testing Admin Navigation...');

    await loginAs(page, 'user@engageninja.local', 'UserPassword123');

    links = await getNavLinks(page);

    check(
      links.some(l => l.href?.includes('/dashboard')),
      'Admin sees Dashboard link'
    );
    check(
      links.some(l => l.href?.includes('/campaigns')),
      'Admin sees Campaigns link'
    );
    check(
      links.some(l => l.href?.includes('/team')),
      'Admin sees Team link'
    );
    check(
      !links.some(l => l.href?.includes('/admin')),
      'Admin does NOT see Platform Admin link'
    );

    // ===== OWNER ROLE NAVIGATION =====
    console.log('Testing Owner Navigation...');

    await loginAs(page, 'admin@engageninja.local', 'AdminPassword123');

    links = await getNavLinks(page);

    check(
      links.some(l => l.href?.includes('/dashboard')),
      'Owner sees Dashboard link'
    );
    check(
      links.some(l => l.href?.includes('/campaigns')),
      'Owner sees Campaigns link'
    );
    check(
      links.some(l => l.href?.includes('/team')),
      'Owner sees Team link'
    );
    check(
      !links.some(l => l.href?.includes('/admin')),
      'Owner does NOT see Platform Admin link'
    );

    // ===== PLATFORM ADMIN NAVIGATION =====
    console.log('Testing Platform Admin Navigation...');

    await loginAs(page, 'platform.admin@engageninja.local', 'PlatformAdminPassword123');

    links = await getNavLinks(page);

    check(
      links.some(l => l.href?.includes('/admin')),
      'Platform Admin sees Admin link'
    );
    check(
      !links.some(l => l.href?.includes('/dashboard')),
      'Platform Admin does NOT see regular Dashboard (no tenant context)'
    );

    // ===== NAVIGATION PERSISTENCE ACROSS PAGES =====
    console.log('Testing Navigation Persistence...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');

    // Navigate to campaigns page
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });
    let linksOnCampaigns = await getNavLinks(page);

    check(
      !linksOnCampaigns.some(l => l.href?.includes('/team')),
      'Navigation consistent on Campaigns page'
    );

    // Navigate to contacts page
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'networkidle2' });
    let linksOnContacts = await getNavLinks(page);

    check(
      !linksOnContacts.some(l => l.href?.includes('/team')),
      'Navigation consistent on Contacts page'
    );

    // ===== ACTIVE LINK HIGHLIGHTING =====
    console.log('Testing Active Link Highlighting...');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });

    const activeLink = await page.$('nav a[class*="active"], [role="navigation"] a[class*="active"]');
    check(
      activeLink !== null,
      'Active link has highlight/styling'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Navigation Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All role-based navigation tests passed!\n');
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

// Run tests
testRoleBasedNavigation().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
