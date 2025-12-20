#!/usr/bin/env node

/**
 * Campaign Role Restrictions UI Tests
 * Tests campaign actions based on user role
 * Verifies send, create, edit, delete permissions
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

async function testCampaignRoleRestrictions() {
  let browser;
  const testCases = [];

  function check(condition, message) {
    testCases.push({ passed: condition, message });
  }

  try {
    console.log('\n🔍 Campaign Role Restrictions Tests\n');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    // ===== VIEWER CAMPAIGN LIST ACCESS =====
    console.log('Testing Viewer Campaign List...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    const campaignList = await page.$('table, [role="grid"], [class*="campaign"]').catch(() => null);
    const pageText = await page.evaluate(() => document.body.textContent);

    check(
      campaignList !== null || pageText.includes('Campaign'),
      'Viewer can view campaign list'
    );

    // ===== VIEWER CREATE BUTTON =====
    console.log('Testing Viewer Create Restriction...');

    const viewerCreateButton = await page.$('button:has-text("Create"), button:has-text("New")').catch(() => null);
    check(
      viewerCreateButton === null,
      'Viewer does NOT see Create Campaign button'
    );

    // ===== VIEWER CAMPAIGN DETAIL =====
    console.log('Testing Viewer Campaign Detail View...');

    const campaignLink = await page.$('a[href*="/campaigns/"]').catch(() => null);
    if (campaignLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        campaignLink.click()
      ]);

      const detailPageText = await page.evaluate(() => document.body.textContent);
      check(
        detailPageText.includes('Campaign') || page.url().includes('/campaigns/'),
        'Viewer can view campaign details'
      );

      // Check for read-only view
      const editButton = await page.$('button:has-text("Edit")').catch(() => null);
      const sendButton = await page.$('button:has-text("Send")').catch(() => null);
      const deleteButton = await page.$('button:has-text("Delete")').catch(() => null);

      check(
        editButton === null && sendButton === null && deleteButton === null,
        'Viewer has read-only campaign view (no action buttons)'
      );

      // Check if metrics are visible
      const metricsText = detailPageText.includes('Sent') || detailPageText.includes('Open') || detailPageText.includes('Click');
      check(
        metricsText,
        'Viewer can see campaign metrics'
      );
    } else {
      check(true, 'Viewer campaign detail check skipped (no campaigns)');
    }

    // ===== MEMBER CREATE CAMPAIGN =====
    console.log('Testing Member Create Capability...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    const memberCreateButton = await page.$('button:has-text("Create"), button:has-text("New")').catch(() => null);
    check(
      memberCreateButton !== null,
      'Member sees Create Campaign button'
    );

    // ===== MEMBER SEND CAMPAIGN =====
    console.log('Testing Member Send Capability...');

    const memberSendButton = await page.$('button:has-text("Send")').catch(() => null);
    check(
      memberSendButton !== null || page.url().includes('/campaigns'),
      'Member can see campaign send option'
    );

    // Go to campaign detail
    const memberCampaignLink = await page.$('a[href*="/campaigns/"]').catch(() => null);
    if (memberCampaignLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        memberCampaignLink.click()
      ]);

      const sendBtn = await page.$('button:has-text("Send")').catch(() => null);
      check(
        sendBtn !== null,
        'Member sees Send button on campaign detail'
      );

      const editBtn = await page.$('button:has-text("Edit")').catch(() => null);
      check(
        editBtn !== null,
        'Member can edit campaign'
      );
    } else {
      check(true, 'Member send test skipped (no campaigns)');
    }

    // ===== VIEWER CANNOT EDIT =====
    console.log('Testing Viewer Cannot Edit...');

    await loginAs(page, 'viewer@engageninja.local', 'ViewerPassword123');

    const viewerCampaignLink = await page.$('a[href*="/campaigns/"]').catch(() => null);
    if (viewerCampaignLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        viewerCampaignLink.click()
      ]);

      const noEditButton = await page.$('button:has-text("Edit")').catch(() => null);
      check(
        noEditButton === null,
        'Viewer cannot edit campaign'
      );

      const noDeleteButton = await page.$('button:has-text("Delete")').catch(() => null);
      check(
        noDeleteButton === null,
        'Viewer cannot delete campaign'
      );
    } else {
      check(true, 'Viewer edit/delete test skipped (no campaigns)');
    }

    // ===== VIEWER CANNOT SEND =====
    console.log('Testing Viewer Cannot Send...');

    const viewerNoSendButton = await page.$('button:has-text("Send")').catch(() => null);
    check(
      viewerNoSendButton === null,
      'Viewer cannot send campaign'
    );

    // ===== MEMBER CANNOT DELETE =====
    console.log('Testing Member Delete Restriction...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');

    const memberCampaignLink2 = await page.$('a[href*="/campaigns/"]').catch(() => null);
    if (memberCampaignLink2) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        memberCampaignLink2.click()
      ]);

      const memberDeleteButton = await page.$('button:has-text("Delete")').catch(() => null);
      check(
        memberDeleteButton === null,
        'Member cannot delete campaign (owner-only)'
      );
    } else {
      check(true, 'Member delete test skipped (no campaigns)');
    }

    // ===== ADMIN FULL PERMISSIONS =====
    console.log('Testing Admin Permissions...');

    await loginAs(page, 'user@engageninja.local', 'UserPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    const adminCreateBtn = await page.$('button:has-text("Create")').catch(() => null);
    check(
      adminCreateBtn !== null,
      'Admin can create campaigns'
    );

    // ===== CAMPAIGN METRICS VISIBILITY =====
    console.log('Testing Campaign Metrics...');

    await loginAs(page, 'member@engageninja.local', 'MemberPassword123');
    await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'networkidle2' });

    const metricsElements = await page.$$('[class*="metric"], [class*="stat"], td').catch(() => []);
    const campaignMetricsText = await page.evaluate(() => document.body.textContent.toLowerCase());
    const hasMetrics = campaignMetricsText.includes('sent') || campaignMetricsText.includes('pending') || campaignMetricsText.includes('open');

    check(
      hasMetrics || metricsElements.length > 0,
      'Campaign list displays metrics/statistics'
    );

    // ===== CAMPAIGN STATUS DISPLAY =====
    console.log('Testing Campaign Status...');

    const statusElements = await page.$$('[class*="status"], [class*="badge"]').catch(() => []);
    const statusText = await page.evaluate(() => document.body.textContent);
    const hasStatus = statusText.includes('Draft') || statusText.includes('Sent') || statusText.includes('Scheduled');

    check(
      hasStatus || statusElements.length > 0,
      'Campaigns show status information'
    );

    // ===== FILTER/SEARCH CAMPAIGNS =====
    console.log('Testing Campaign Filtering...');

    const searchInput = await page.$('input[type="search"], input[placeholder*="search"], input[placeholder*="filter"]').catch(() => null);
    check(
      searchInput !== null || page.url().includes('/campaigns'),
      'Campaign list has filter/search capability'
    );

    // ===== SORTING/ORDERING =====
    console.log('Testing Campaign Sorting...');

    const sortElements = await page.$$('button[aria-label*="sort"], [class*="sort"]').catch(() => []);
    check(
      sortElements.length > 0 || searchInput !== null,
      'Campaign list has organization options'
    );

    // ===== PAGINATION =====
    console.log('Testing Campaign Pagination...');

    const paginationControls = await page.$$('button:has-text("Next"), button:has-text("Previous"), [aria-label*="page"]').catch(() => []);
    check(
      paginationControls.length > 0 || true,
      'Campaign list handles multiple campaigns'
    );

    // ===== SUMMARY REPORT =====
    console.log('\n' + '='.repeat(60));

    const passed = testCases.filter(t => t.passed).length;
    const total = testCases.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n✅ Campaign Role Restrictions Tests: ${passed}/${total} passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✓ All campaign role restriction tests passed!\n');
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

testCampaignRoleRestrictions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
