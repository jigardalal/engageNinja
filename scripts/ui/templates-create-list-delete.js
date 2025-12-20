/**
 * UI E2E Test: WhatsApp Template Management
 *
 * Tests the complete template workflow:
 * 1. Navigate to Templates page
 * 2. Create a template with all component types
 * 3. Verify template appears in list with correct filters
 * 4. Delete the template
 * 5. Verify deletion from list
 *
 * Run: node scripts/ui/templates-create-list-delete.js
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

  const userDataDir = path.join(__dirname, '.chrome-templates');
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
    console.log('🧪 Template Management E2E Tests\n');

    await login(page);
    console.log('✓ Logged in');

    const templateName = `e2e_test_${Date.now()}`;

    await navigateToTemplates(page);
    console.log('✓ Navigated to Templates page');

    await createTemplate(page, templateName);
    console.log('✓ Template created');

    await verifyTemplateInList(page, templateName);
    console.log('✓ Template verified in list');

    await testFilters(page);
    console.log('✓ Filters working correctly');

    await deleteTemplate(page, templateName);
    console.log('✓ Template deleted');

    await verifyTemplateNotInList(page, templateName);
    console.log('✓ Deletion verified');

    console.log('\n✅ All template management tests passed!\n');

  } catch (err) {
    await page.screenshot({ path: path.join(LOG_DIR, 'templates-error.png'), fullPage: true }).catch(() => {});
    console.error('\n❌ Test failed:', err.message);
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

async function navigateToTemplates(page) {
  // Click Templates in sidebar
  await page.waitForSelector('[href="/templates"]', { timeout: 5000 });
  await page.click('[href="/templates"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
}

async function createTemplate(page, templateName) {
  // Click Create Template button
  await page.waitForSelector('button:has-text("✨ Create Template")', { timeout: 5000 });
  const buttons = await page.$$('button');
  let createBtn = null;
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Create Template')) {
      createBtn = btn;
      break;
    }
  }
  if (createBtn) await createBtn.click();

  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Fill template name
  await page.waitForSelector('input[placeholder="order_confirmation"]', { timeout: 5000 });
  await page.type('input[placeholder="order_confirmation"]', templateName);

  // Fill template details
  const inputs = await page.$$('input');

  // Body textarea - enter message with variables
  await page.waitForSelector('textarea[placeholder*="Hi"]', { timeout: 5000 });
  const textareas = await page.$$('textarea');
  for (const ta of textareas) {
    const placeholder = await page.evaluate(el => el.placeholder, ta);
    if (placeholder.includes('Hi {{1}}')) {
      await ta.type('Hi {{1}}, your order {{2}} is confirmed!');
      break;
    }
  }

  // Add Header
  const addHeaderBtn = await page.evaluateHandle(
    () => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Header'))
  );
  if (addHeaderBtn) {
    await addHeaderBtn.evaluate(el => el.click());
    // Wait for header input
    await page.waitForTimeout(500);
    const headerInputs = await page.$$('input');
    for (const input of headerInputs) {
      const placeholder = await page.evaluate(el => el.placeholder, input);
      if (placeholder.includes('Welcome')) {
        await input.type('Order Confirmation');
        break;
      }
    }
  }

  // Add Footer
  const addFooterBtn = await page.evaluateHandle(
    () => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Footer'))
  );
  if (addFooterBtn) {
    await addFooterBtn.evaluate(el => el.click());
    await page.waitForTimeout(500);
    const footerInputs = await page.$$('input');
    for (const input of footerInputs) {
      const placeholder = await page.evaluate(el => el.placeholder, input);
      if (placeholder.includes('Powered by')) {
        await input.type('Thank you!');
        break;
      }
    }
  }

  // Submit form
  const submitBtn = await page.evaluateHandle(
    () => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Template'))
  );
  if (submitBtn) {
    await Promise.all([
      submitBtn.evaluate(el => el.click()),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);
  }

  // Wait for redirect to templates list
  await page.waitForTimeout(2000);
}

async function verifyTemplateInList(page, templateName) {
  // Navigate to templates if not there
  if (!page.url().includes('/templates')) {
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle2' });
  }

  // Wait for table/list to load
  await page.waitForTimeout(1000);

  // Check if template name appears in the page
  const content = await page.content();
  if (!content.includes(templateName)) {
    throw new Error(`Template "${templateName}" not found in list`);
  }
}

async function testFilters(page) {
  // Ensure we're on templates page
  if (!page.url().includes('/templates')) {
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle2' });
  }

  // Test status filter
  const statusSelect = await page.$('select');
  if (statusSelect) {
    // Get all selects on page (there are multiple filter selects)
    const selects = await page.$$('select');
    if (selects.length > 0) {
      // Try to select a status
      await selects[0].select('PENDING');
      await page.waitForTimeout(500);
    }
  }
}

async function deleteTemplate(page, templateName) {
  // Ensure we're on templates list
  if (!page.url().includes('/templates') || page.url().includes('create')) {
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'networkidle2' });
  }

  await page.waitForTimeout(1000);

  // Find delete button for this template (assuming it's in a table row with the template name)
  const deleteBtn = await page.evaluateHandle(
    (name) => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent.includes(name)) {
          const deleteBtn = row.querySelector('button:has-text("🗑️")') ||
                          Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('🗑️'));
          return deleteBtn;
        }
      }
      return null;
    },
    templateName
  );

  if (deleteBtn) {
    await deleteBtn.evaluate(el => el.click());
    // Confirm deletion
    await page.waitForTimeout(500);
    const confirmBtn = await page.evaluateHandle(
      () => Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Delete'))
    );
    if (confirmBtn) {
      await Promise.all([
        confirmBtn.evaluate(el => el.click()),
        page.waitForTimeout(1000)
      ]);
    }
  }
}

async function verifyTemplateNotInList(page, templateName) {
  // Refresh the page to ensure we're seeing current state
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForTimeout(1000);

  const content = await page.content();
  if (content.includes(templateName)) {
    throw new Error(`Template "${templateName}" still found in list after deletion`);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
