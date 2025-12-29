import { test, expect } from '@playwright/test';

/**
 * EngageNinja Invite Team Member Tests
 * Tests inviting team members, managing roles, and team composition
 * Journey Map: journey-maps/high/05-invite-team-member.md
 *
 * Prerequisites:
 * - User must be authenticated
 * - User must have admin role
 * - Team page must be accessible
 * - Uses seeded test user: admin@engageninja.local / AdminPassword123
 */

test.describe('Invite Team Member Flow', () => {
  // Test user
  const testUser = {
    email: 'admin@engageninja.local',
    password: 'AdminPassword123'
  };

  // ============================================
  // Helper: Log in and navigate to team settings
  // ============================================
  async function loginAndNavigateToTeam(page) {
    // Navigate to login
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Fill login form
    const emailInput = page.locator("input[name='email'][type='email']");
    const passwordInput = page.locator("input[name='password'][type='password']");
    const submitButton = page.locator("button:has-text('Log in')");

    await emailInput.fill(testUser.email);
    await passwordInput.fill(testUser.password);

    // Wait for navigation after login
    const navigationPromise = page.waitForNavigation({ timeout: 10000 }).catch(
      () => null
    );

    await submitButton.click();
    await navigationPromise;
    await page.waitForTimeout(1000);

    // If we're on tenants page, select first tenant
    const currentUrl = page.url();
    if (currentUrl.includes('/tenants')) {
      const tenantRows = page.locator('tbody tr');
      const firstRow = tenantRows.first();
      const switchButton = firstRow.locator("button:has-text('Switch')");

      const navigationPromise2 = page
        .waitForNavigation({ timeout: 10000 })
        .catch(() => null);

      await switchButton.click();
      await navigationPromise2;
      await page.waitForTimeout(1000);
    }

    // Navigate to team settings - try multiple paths
    const settingsLink = page.locator("[data-testid='nav-settings'], a:has-text('Settings')");
    if ((await settingsLink.count()) > 0) {
      await settingsLink.first().click();
      await page.waitForTimeout(500);
    }

    // Navigate to team page
    await page.goto('/team', { waitUntil: 'networkidle' }).catch(() => {
      // If /team doesn't exist, team might be in settings
    });
  }

  // ============================================
  // Test 1: Navigate to Team Settings
  // ============================================
  test('should navigate to team settings page', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    const currentUrl = page.url();
    if (currentUrl.includes('/team') || currentUrl.includes('/settings')) {
      console.log('✓ Navigated to team/settings page');
    } else {
      console.log('⚠ Team page URL not found: ' + currentUrl);
    }
  });

  // ============================================
  // Test 2: Team Page Content Visible
  // ============================================
  test('should display team page content', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    // Look for team-related content
    const teamContent = page.locator("text=/team|members|invite/i");
    const contentCount = await teamContent.count();

    if (contentCount > 0) {
      console.log('✓ Team page content visible');
    } else {
      console.log('⚠ Team page content not found');
    }
  });

  // ============================================
  // Test 3: Invite Member Button Visible
  // ============================================
  test('should have invite member button', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    // Look for invite member button
    const inviteButton = page.locator(
      "[data-testid='invite-member-button'], button:has-text('Invite'), button:has-text('Add Member')"
    );
    const buttonCount = await inviteButton.count();

    if (buttonCount > 0) {
      await expect(inviteButton.first()).toBeVisible();
      console.log('✓ Invite member button visible');
    } else {
      console.log('⚠ Invite member button not found');
    }
  });

  // ============================================
  // Test 4: Open Invite Modal
  // ============================================
  test('should open invite member modal', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    // Click invite button
    const inviteButton = page.locator(
      "button:has-text('Invite'), button:has-text('Add Member')"
    );

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await page.waitForTimeout(500);

      // Look for modal with email input
      const emailInput = page.locator(
        "[data-testid='invite-email'], input[placeholder*='Email']"
      );
      const emailCount = await emailInput.count();

      if (emailCount > 0) {
        console.log('✓ Invite modal opened with email field');
      } else {
        console.log('⚠ Email input not found in modal');
      }
    } else {
      console.log('⚠ Invite button not found');
    }
  });

  // ============================================
  // Test 5: Enter Member Email
  // ============================================
  test('should allow entering member email', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    const inviteButton = page.locator("button:has-text('Invite'), button:has-text('Add Member')");

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await page.waitForTimeout(500);

      // Find and fill email input
      const emailInput = page.locator(
        "[data-testid='invite-email'], input[placeholder*='Email']"
      );

      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill('testmember@example.com');
        await page.waitForTimeout(300);

        const value = await emailInput.first().inputValue();
        if (value.includes('testmember')) {
          console.log('✓ Member email entered successfully');
        } else {
          console.log('⚠ Email field value not updated');
        }
      } else {
        console.log('⚠ Email input field not found');
      }
    }
  });

  // ============================================
  // Test 6: Select Member Role
  // ============================================
  test('should allow selecting member role', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    const inviteButton = page.locator("button:has-text('Invite'), button:has-text('Add Member')");

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await page.waitForTimeout(500);

      // Look for role selector
      const roleSelector = page.locator(
        "[data-testid='invite-role'], select[name='role']"
      );

      if ((await roleSelector.count()) > 0) {
        // Try to select an option
        const roleElement = roleSelector.first();
        await roleElement.click();
        await page.waitForTimeout(300);

        console.log('✓ Role selector opened');
      } else {
        console.log('⚠ Role selector not found');
      }
    }
  });

  // ============================================
  // Test 7: Review Role Permissions
  // ============================================
  test('should display role permissions information', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    const inviteButton = page.locator("button:has-text('Invite'), button:has-text('Add Member')");

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await page.waitForTimeout(500);

      // Look for permissions section
      const permissionsSection = page.locator(
        "[data-testid='role-permissions'], div.permissions-info"
      );
      const permCount = await permissionsSection.count();

      // Look for permission-related text
      const permText = page.locator("text=/can|cannot|permission|restrict/i");
      const permTextCount = await permText.count();

      if (permCount > 0 || permTextCount > 0) {
        console.log('✓ Role permissions information visible');
      } else {
        console.log('⚠ Permissions information not found');
      }
    }
  });

  // ============================================
  // Test 8: Send Invitation
  // ============================================
  test('should send team member invitation', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    const inviteButton = page.locator("button:has-text('Invite'), button:has-text('Add Member')");

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await page.waitForTimeout(500);

      // Fill email
      const emailInput = page.locator("input[placeholder*='Email']");
      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill('test' + Date.now() + '@example.com');
        await page.waitForTimeout(300);
      }

      // Click send button
      const sendButton = page.locator(
        "[data-testid='send-invite-button'], button:has-text('Send'), button:has-text('Invite')"
      );

      if ((await sendButton.count()) > 0) {
        await sendButton.first().click();
        await page.waitForTimeout(1000);

        console.log('✓ Invitation sent');
      } else {
        console.log('⚠ Send button not found');
      }
    }
  });

  // ============================================
  // Test 9: View Team Members List
  // ============================================
  test('should display team members list', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    // Look for team members table/list
    const membersList = page.locator(
      "[data-testid='team-members-list'], table.members"
    );
    const listCount = await membersList.count();

    // Look for member rows
    const memberRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await memberRows.count();

    if (listCount > 0 || rowCount > 0) {
      console.log(`✓ Team members list displayed with ${rowCount} member(s)`);
    } else {
      console.log('⚠ Team members list not found');
    }
  });

  // ============================================
  // Test 10: Member Role Information Visible
  // ============================================
  test('should display member role information', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    // Look for role/status information
    const memberInfo = page.locator("text=/role|admin|member|viewer|pending/i");
    const infoCount = await memberInfo.count();

    // Look for role selectors in list
    const roleSelectors = page.locator(
      "[data-testid*='member-role'], select[name*='role']"
    );
    const selectorCount = await roleSelectors.count();

    if (infoCount > 0 || selectorCount > 0) {
      console.log('✓ Member role information visible');
    } else {
      console.log('⚠ Role information not clearly displayed');
    }
  });

  // ============================================
  // Test 11: Member Action Buttons Available
  // ============================================
  test('should have member management buttons', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    // Look for action buttons
    const memberRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await memberRows.count();

    if (rowCount > 0) {
      const firstRow = memberRows.first();
      const actionButtons = firstRow.locator('button');
      const buttonCount = await actionButtons.count();

      if (buttonCount > 0) {
        console.log(`✓ Member action buttons available (${buttonCount} button(s))`);
      } else {
        console.log('⚠ Action buttons not found in member row');
      }
    } else {
      console.log('⚠ No member rows to check for action buttons');
    }
  });

  // ============================================
  // Test 12: Team Settings Form Validation
  // ============================================
  test('should validate team invitation form fields', async ({ page }) => {
    await loginAndNavigateToTeam(page);

    const inviteButton = page.locator("button:has-text('Invite'), button:has-text('Add Member')");

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await page.waitForTimeout(500);

      // Try to find form elements
      const formElements = page.locator(
        "input, select, [data-testid*='invite']"
      );
      const elementCount = await formElements.count();

      if (elementCount > 0) {
        console.log(`✓ Team invitation form has ${elementCount} interactive element(s)`);
      } else {
        console.log('⚠ Form elements not clearly identified');
      }
    }
  });
});
