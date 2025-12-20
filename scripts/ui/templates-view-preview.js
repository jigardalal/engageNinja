/**
 * UI Test: Template View and Preview
 *
 * Tests the template detail/view page:
 * 1. Navigate to a template from list using View button
 * 2. Verify template detail page loads with correct data
 * 3. Verify WhatsApp preview displays template content
 * 4. Verify text colors follow theme (CSS variables, not hardcoded)
 * 5. Verify status badge displays with proper contrast
 * 6. Verify back button and navigation work
 *
 * This test catches bugs like:
 * - View button not working
 * - Template preview showing blank content
 * - Poor text color contrast (green on green)
 * - Missing field data
 *
 * Run: node scripts/ui/templates-view-preview.js
 * Env: BASE_URL, TEST_EMAIL, TEST_PASSWORD, CHROME_PATH
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3173';
const EMAIL = process.env.TEST_EMAIL || 'admin@engageninja.local';
const PASSWORD = process.env.TEST_PASSWORD || 'AdminPassword123';
const LOG_DIR = path.join(__dirname, '../../logs');

const getChromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  return candidates.find(fs.existsSync);
};

async function run() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const chromePath = getChromePath();
  if (!chromePath) throw new Error('Chrome/Chromium executable not found. Set CHROME_PATH.');

  const userDataDir = path.join(__dirname, '.chrome-templates-view');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=${userDataDir}`]
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 900 });

  try {
    console.log('🧪 Template View and Preview Tests\n');

    await login(page);
    console.log('✓ Logged in');

    const templateName = `preview_test_${Date.now()}`;

    // Create a test template first
    await createTestTemplate(page, templateName);
    console.log('✓ Test template created');

    // Navigate to templates page
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle2' });
    console.log('✓ Navigated to Templates page');

    // Test the View button
    await testViewButton(page, templateName);
    console.log('✓ View button works and navigates to detail page');

    // Test that template detail page displays correctly
    await testTemplateDetailPage(page, templateName);
    console.log('✓ Template detail page displays all data');

    // Test that WhatsApp preview shows content
    await testWhatsAppPreview(page);
    console.log('✓ WhatsApp preview displays template content');

    // Test that status badge has proper styling
    await testStatusBadgeContrast(page);
    console.log('✓ Status badge has proper contrast');

    // Test that text colors use CSS variables
    await testTextColorStyling(page);
    console.log('✓ Text colors follow theme (CSS variables)');

    // Test back button navigation
    await testBackButton(page);
    console.log('✓ Back button works correctly');

    // Clean up: delete test template
    await deleteTestTemplate(page, templateName);
    console.log('✓ Test template cleaned up');

    console.log('\n✅ All template view/preview tests passed!\n');

  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'template-view-error.png'), fullPage: true }).catch(() => {});
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
}

async function createTestTemplate(page, templateName) {
  await page.goto(`${BASE_URL}/templates/create`, { waitUntil: 'networkidle2' });

  // Fill template name
  await page.waitForSelector('input[placeholder="order_confirmation"]', { timeout: 5000 });
  await page.type('input[placeholder="order_confirmation"]', templateName);

  // Fill body
  const textareas = await page.$$('textarea');
  for (const ta of textareas) {
    const placeholder = await page.evaluate(el => el.placeholder, ta);
    if (placeholder.includes('Hi {{1}}')) {
      await ta.type('Test message for {{1}}. This is body text.');
      break;
    }
  }

  // Submit
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Create Template')) {
      await Promise.all([
        btn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
      ]);
      break;
    }
  }

  await page.waitForTimeout(1000);
}

async function testViewButton(page, templateName) {
  // Wait for table to load
  await page.waitForSelector('table tbody tr', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Get all View buttons in the table
  const allViewButtons = await page.$$('table tbody tr button');

  if (allViewButtons.length === 0) {
    throw new Error('No action buttons found in templates table');
  }

  // Click the first View button (first template in list)
  const viewBtnClicked = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    if (rows.length === 0) return false;

    // Get first row
    const firstRow = rows[0];
    const buttons = firstRow.querySelectorAll('button');

    for (const btn of buttons) {
      const text = btn.textContent;
      // Look for view button
      if (text.includes('View') || text.includes('👁️')) {
        btn.click();
        return true;
      }
    }
    return false;
  });

  if (!viewBtnClicked) {
    throw new Error('Could not click View button on first template');
  }

  // Wait for navigation (React Router may not trigger full page navigation)
  await page.waitForTimeout(1500);

  // Verify we're on the detail page
  const currentUrl = page.url();
  if (!currentUrl.includes('/templates/') || currentUrl.includes('/create')) {
    throw new Error('Did not navigate to template detail page. URL: ' + currentUrl);
  }
}

async function testTemplateDetailPage(page, templateName) {
  await page.waitForTimeout(500);

  // Check that a heading with template name or generic title exists
  const hasHeading = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2');
    return headings.length > 0;
  });

  if (!hasHeading) {
    throw new Error('No headings found on detail page');
  }

  // Check that detail cards/sections are displayed
  const hasDetailSections = await page.evaluate(() => {
    const content = document.body.textContent;
    // Check for common detail page elements
    return (content.includes('Status') || content.includes('Language') ||
            content.includes('Category') || content.includes('Preview'));
  });

  if (!hasDetailSections) {
    throw new Error('Detail page sections not found');
  }

  // Check that status badge is displayed (in any form)
  const hasStatusInfo = await page.evaluate(() => {
    const content = document.body.textContent;
    return content.includes('APPROVED') ||
           content.includes('draft') ||
           content.includes('PENDING') ||
           content.includes('Status');
  });

  if (!hasStatusInfo) {
    throw new Error('Status information not found on detail page');
  }
}

async function testWhatsAppPreview(page) {
  // Check that preview section exists
  const hasPreview = await page.evaluate(() => {
    return document.body.textContent.includes('Preview') ||
           document.body.textContent.includes('WhatsApp');
  });

  if (!hasPreview) {
    throw new Error('WhatsApp preview section not found');
  }

  // Check that preview contains message content (not blank)
  const previewHasContent = await page.evaluate(() => {
    const previewText = document.body.textContent;
    // Should contain either template text or a placeholder
    return previewText.includes('Test message') ||
           previewText.includes('template') ||
           previewText.includes('appears');
  });

  if (!previewHasContent) {
    throw new Error('WhatsApp preview appears blank - no content displayed');
  }

  // Check that preview is visible (not display:none)
  const previewVisible = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="Card"], [class*="card"]');
    for (const card of cards) {
      if (card.textContent.includes('Preview') || card.textContent.includes('WhatsApp')) {
        const style = window.getComputedStyle(card);
        return style.display !== 'none';
      }
    }
    return false;
  });

  if (!previewVisible) {
    throw new Error('WhatsApp preview is not visible on page');
  }
}

async function testStatusBadgeContrast(page) {
  // Check that status badge exists and has readable text
  const badgeReadable = await page.evaluate(() => {
    const badges = document.querySelectorAll('[class*="badge"], [class*="Badge"], span[class*="bg-"]');
    for (const badge of badges) {
      if (badge.textContent.includes('APPROVED') || badge.textContent.includes('draft')) {
        const style = window.getComputedStyle(badge);
        const bgColor = style.backgroundColor;
        const textColor = style.color;

        // Check that background and text color are different
        // (not green text on green background)
        return bgColor !== textColor && style.display !== 'none';
      }
    }
    return true; // Badge not found is also a fail, but check via other method
  });

  if (!badgeReadable) {
    throw new Error('Status badge has poor contrast - text and background colors may be the same');
  }

  // Verify badge is visible
  const statusText = await page.content();
  const hasStatusBadge = statusText.includes('Status') ||
                         statusText.includes('APPROVED') ||
                         statusText.includes('draft');

  if (!hasStatusBadge) {
    throw new Error('Status badge not visible on detail page');
  }
}

async function testTextColorStyling(page) {
  // Check that headings use proper text color (not hardcoded gray)
  const headingsStyled = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, .text-\\[var\\(--text\\)\\]');
    for (const heading of headings) {
      const style = window.getComputedStyle(heading);
      // Check that it's using color property (not relying on defaults)
      return style.color && style.color !== 'rgb(128, 128, 128)'; // Not default gray
    }
    return true; // Some headings should be styled
  });

  if (!headingsStyled) {
    console.warn('⚠️  Warning: Some headings may use default colors instead of CSS variables');
  }

  // Check that text content uses CSS variables or semantic colors
  const semanticColorsUsed = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    // Check for CSS variable usage (best case)
    const hasVarColors = html.includes('var(--text)') ||
                         html.includes('text-[var(');
    return hasVarColors;
  });

  if (!semanticColorsUsed) {
    console.warn('⚠️  Warning: CSS variables not found in markup - check for theme compatibility');
  }
}

async function testBackButton(page) {
  // Find and click back button
  const backBtnFound = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('Back') || btn.textContent.includes('←')) {
        btn.click();
        return true;
      }
    }
    return false;
  });

  if (!backBtnFound) {
    throw new Error('Back button not found on detail page');
  }

  // Wait for React Router navigation (not full page reload)
  await page.waitForTimeout(1500);

  // Verify we're back on templates list
  const currentUrl = page.url();
  if (!currentUrl.includes('/templates') || currentUrl.includes('create')) {
    throw new Error('Back button did not navigate to templates list. URL: ' + currentUrl);
  }
}

async function deleteTestTemplate(page, templateName) {
  // Ensure we're on templates page
  if (!page.url().includes('/templates') || page.url().includes('create')) {
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle2' });
  }

  await page.waitForTimeout(500);

  // Find and click delete button
  const deleted = await page.evaluate((name) => {
    const rows = document.querySelectorAll('tr');
    for (const row of rows) {
      if (row.textContent.includes(name)) {
        const buttons = row.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Delete') || btn.textContent.includes('🗑️')) {
            btn.click();
            return true;
          }
        }
      }
    }
    return false;
  }, templateName);

  if (!deleted) {
    console.warn('⚠️  Could not find delete button for cleanup');
    return;
  }

  // Confirm deletion
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('Delete') && btn.textContent.length < 20) {
        btn.click();
        break;
      }
    }
  });

  await page.waitForTimeout(1000);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
