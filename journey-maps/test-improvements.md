# Test Selector Improvements - Implementation Guide

Consolidated list of all test selector (data-testid) improvements needed across the EngageNinja application to enable reliable automated testing. Organized by priority and feature area.

## High Priority - Critical Journeys

### Authentication

#### Signup Page (`frontend/src/pages/SignupPage.jsx`)
- **Email input** - Current: `input[name="email"]` → Add: `data-testid="signup-email"`
- **Password input** - Current: `input[name="password"]` → Add: `data-testid="signup-password"`
- **Confirm password input** - Current: `input[name="confirmPassword"]` → Add: `data-testid="signup-confirm-password"`
- **First name input** - Current: `input[name="firstName"]` → Add: `data-testid="signup-first-name"`
- **Last name input** - Current: `input[name="lastName"]` → Add: `data-testid="signup-last-name"`
- **Company name input** - Current: `input[name="companyName"]` → Add: `data-testid="signup-company-name"`
- **Phone input** - Current: `input[name="phone"]` → Add: `data-testid="signup-phone"`
- **Terms checkbox** - Current: `input[type="checkbox"]` → Add: `data-testid="signup-accept-terms"`
- **Submit button** - Current: `button[type="submit"]` → Add: `data-testid="signup-submit"`
- **Error message container** - Add: `data-testid="signup-error"`
- **ReCAPTCHA iframe** - Verify: `iframe[src*="recaptcha"]` or add: `data-testid="signup-recaptcha"`
- **Login link** - Add: `data-testid="signup-login-link"`

**Implementation Priority:** 1 (Critical - blocking signup automation)

#### Login Page (`frontend/src/pages/LoginPage.jsx`)
- **Email input** - Current: `input[name="email"]` → Add: `data-testid="login-email"`
- **Password input** - Current: `input[name="password"]` → Add: `data-testid="login-password"`
- **Submit button** - Current: `button[type="submit"]` → Add: `data-testid="login-submit"`
- **Error message container** - Add: `data-testid="login-error"`
- **Forgot password link** - Add: `data-testid="login-forgot-password-link"`
- **Signup link** - Add: `data-testid="login-signup-link"`

**Implementation Priority:** 1 (Critical)

#### Tenant Selection Page (`frontend/src/pages/TenantsPage.jsx`)
- **Tenant card container** - Current: `div.tenant-option` → Add: `data-testid="tenant-card-{tenantId}"`
- **Tenant name** - Add: `data-testid="tenant-name-{tenantId}"`
- **Tenant role badge** - Add: `data-testid="tenant-role-{tenantId}"`
- **Tenant plan badge** - Add: `data-testid="tenant-plan-{tenantId}"`
- **Tenant select button** - Add: `data-testid="tenant-select-{tenantId}"`
- **Create workspace button** - Add: `data-testid="create-workspace-button"`
- **No tenants error** - Add: `data-testid="no-tenants-error"`

**Implementation Priority:** 1 (Critical)

### Campaign Management

#### Campaigns Page (`frontend/src/pages/CampaignsPage.jsx`)
- **Create campaign button** - Add: `data-testid="create-campaign-button"`
- **Campaign list table** - Add: `data-testid="campaigns-table"`
- **Campaign row** - Add: `data-testid="campaign-row-{campaignId}"`
- **Campaign name cell** - Add: `data-testid="campaign-name-{campaignId}"`
- **Campaign status badge** - Add: `data-testid="campaign-status-{campaignId}"`
- **Campaign edit button** - Add: `data-testid="campaign-edit-{campaignId}"`
- **Campaign delete button** - Add: `data-testid="campaign-delete-{campaignId}"`
- **Search input** - Add: `data-testid="campaigns-search"`
- **Filter button** - Add: `data-testid="campaigns-filter"`

**Implementation Priority:** 1 (Critical)

#### Create Campaign Page (`frontend/src/pages/CreateCampaignPage.jsx`)
- **Campaign name input** - Add: `data-testid="campaign-name"`
- **Channel selector (WhatsApp)** - Add: `data-testid="campaign-channel-whatsapp"`
- **Channel selector (Email)** - Add: `data-testid="campaign-channel-email"`
- **Contact selector button** - Add: `data-testid="campaign-contacts-selector"`
- **Template selector dropdown** - Add: `data-testid="campaign-template-selector"`
- **Custom message textarea** - Add: `data-testid="campaign-custom-message"`
- **Schedule type selector** - Add: `data-testid="campaign-delivery-type"`
- **Schedule date input** - Add: `data-testid="campaign-schedule-date"`
- **Schedule time input** - Add: `data-testid="campaign-schedule-time"`
- **Preview button** - Add: `data-testid="campaign-preview"`
- **Preview modal** - Add: `data-testid="campaign-preview-modal"`
- **Submit button (Send)** - Add: `data-testid="campaign-submit"`
- **Submit button (Schedule)** - Add: `data-testid="campaign-schedule"`
- **Error message** - Add: `data-testid="campaign-error"`

**Implementation Priority:** 1 (Critical)

### Contact Management

#### Contacts Page (`frontend/src/pages/ContactsPage.jsx`)
- **Add contact button** - Add: `data-testid="add-contact-button"`
- **Import contacts button** - Add: `data-testid="import-contacts-button"`
- **Contacts table** - Add: `data-testid="contacts-table"`
- **Contact row** - Add: `data-testid="contact-row-{contactId}"`
- **Contact phone cell** - Add: `data-testid="contact-phone-{contactId}"`
- **Contact name cell** - Add: `data-testid="contact-name-{contactId}"`
- **Contact edit button** - Add: `data-testid="contact-edit-{contactId}"`
- **Contact delete button** - Add: `data-testid="contact-delete-{contactId}"`
- **Bulk select checkbox** - Add: `data-testid="contacts-bulk-select"`
- **Search input** - Add: `data-testid="contacts-search"`
- **Filter button** - Add: `data-testid="contacts-filter"`

**Implementation Priority:** 1 (Critical)

#### Create/Edit Contact Modal (`frontend/src/components/CreateContactModal.jsx`, `EditContactModal.jsx`)
- **Phone input** - Add: `data-testid="contact-phone"`
- **Email input** - Add: `data-testid="contact-email"`
- **First name input** - Add: `data-testid="contact-first-name"`
- **Last name input** - Add: `data-testid="contact-last-name"`
- **Tags selector** - Add: `data-testid="contact-tags"`
- **Submit button** - Add: `data-testid="contact-submit"`
- **Cancel button** - Add: `data-testid="contact-cancel"`
- **Error message** - Add: `data-testid="contact-error"`

**Implementation Priority:** 1 (Critical)

#### Import Contacts Modal (`frontend/src/components/CSVImportModal.jsx`)
- **File input** - Add: `data-testid="csv-file-input"`
- **File name display** - Add: `data-testid="csv-file-name"`
- **Phone column mapper** - Add: `data-testid="column-mapper-phone"`
- **Email column mapper** - Add: `data-testid="column-mapper-email"`
- **Name column mapper** - Add: `data-testid="column-mapper-name"`
- **Preview table** - Add: `data-testid="import-preview"`
- **Preview row** - Add: `data-testid="import-preview-row-{index}"`
- **Import button** - Add: `data-testid="import-submit"`
- **Cancel button** - Add: `data-testid="import-cancel"`
- **Error message** - Add: `data-testid="import-error"`
- **Progress indicator** - Add: `data-testid="import-progress"`

**Implementation Priority:** 1 (Critical)

### Billing Management

#### Billing Page (`frontend/src/pages/BillingPage.jsx` or settings tab)
- **Current plan card** - Add: `data-testid="current-plan-card"`
- **Usage summary** - Add: `data-testid="usage-summary"`
- **View plans button** - Add: `data-testid="view-plans-button"`
- **Upgrade button** - Add: `data-testid="upgrade-button"`
- **Billing error** - Add: `data-testid="billing-error"`
- **Billing tab** - Add: `data-testid="billing-tab"`

**Implementation Priority:** 1 (Critical)

#### Checkout/Upgrade Page
- **Plan selection button** - Add: `data-testid="upgrade-plan-{planName}"`
- **Stripe card element** - Add: `data-testid="stripe-card-element"`
- **Order summary** - Add: `data-testid="order-summary"`
- **Order plan name** - Add: `data-testid="order-plan-name"`
- **Order price** - Add: `data-testid="order-price"`
- **Pay button** - Add: `data-testid="pay-button"`
- **Success message** - Add: `data-testid="billing-success-message"`
- **Failure message** - Add: `data-testid="billing-failure-message"`

**Implementation Priority:** 1 (Critical)

---

## Medium Priority - High Priority Journeys

### Dashboard Components

#### Dashboard Page (`frontend/src/pages/DashboardPage.jsx`)
- **Stats card - contacts total** - Add: `data-testid="stat-contacts-total"`
- **Stats card - campaigns total** - Add: `data-testid="stat-campaigns-total"`
- **Stats card - active sending** - Add: `data-testid="stat-active-sending"`
- **Stats card - read rate** - Add: `data-testid="stat-read-rate"`
- **Recent campaigns list** - Add: `data-testid="recent-campaigns-list"`
- **Create campaign CTA** - Add: `data-testid="dashboard-create-campaign"`
- **View contacts CTA** - Add: `data-testid="dashboard-view-contacts"`
- **Plan context card** - Add: `data-testid="plan-context-card"`
- **Welcome carousel** - Add: `data-testid="welcome-carousel"`

**Implementation Priority:** 2 (High - used frequently)

### Template Management

#### Templates Page (`frontend/src/pages/TemplatesPage.jsx`)
- **Create template button** - Add: `data-testid="create-template-button"`
- **Templates table** - Add: `data-testid="templates-table"`
- **Template row** - Add: `data-testid="template-row-{templateId}"`
- **Template name cell** - Add: `data-testid="template-name-{templateId}"`
- **Template type badge** - Add: `data-testid="template-type-{templateId}"`
- **Template edit button** - Add: `data-testid="template-edit-{templateId}"`
- **Template delete button** - Add: `data-testid="template-delete-{templateId}"`
- **Template preview** - Add: `data-testid="template-preview-{templateId}"`

**Implementation Priority:** 2 (High)

#### Create Template Page (`frontend/src/pages/CreateTemplatePage.jsx`)
- **Template name input** - Add: `data-testid="template-name"`
- **Template channel selector** - Add: `data-testid="template-channel"`
- **Template body textarea** - Add: `data-testid="template-body"`
- **Template variables button** - Add: `data-testid="template-variables"`
- **Submit button** - Add: `data-testid="template-submit"`
- **Error message** - Add: `data-testid="template-error"`

**Implementation Priority:** 2 (High)

### Settings & Team Management

#### Team Page (`frontend/src/pages/TeamPage.jsx`)
- **Invite member button** - Add: `data-testid="invite-member-button"`
- **Team members list** - Add: `data-testid="team-members-list"`
- **Team member row** - Add: `data-testid="team-member-row-{userId}"`
- **Member email cell** - Add: `data-testid="member-email-{userId}"`
- **Member role select** - Add: `data-testid="member-role-{userId}"`
- **Member remove button** - Add: `data-testid="member-remove-{userId}"`
- **Invite modal** - Add: `data-testid="invite-modal"`
- **Invite email input** - Add: `data-testid="invite-email"`
- **Invite role select** - Add: `data-testid="invite-role"`
- **Invite send button** - Add: `data-testid="invite-send"`

**Implementation Priority:** 2 (High)

#### Settings Page (`frontend/src/pages/SettingsPage.jsx`)
- **Settings tabs container** - Add: `data-testid="settings-tabs"`
- **Channels tab** - Add: `data-testid="settings-tab-channels"`
- **Billing tab** - Add: `data-testid="settings-tab-billing"`
- **Tenant tab** - Add: `data-testid="settings-tab-tenant"`
- **Team tab** - Add: `data-testid="settings-tab-team"`
- **Save button** - Add: `data-testid="settings-save"`
- **Settings error** - Add: `data-testid="settings-error"`

**Implementation Priority:** 2 (High)

---

## Low Priority - Medium/Low Priority Journeys

### Additional Pages & Components

#### Tags Page (`frontend/src/pages/TagsPage.jsx`)
- **Create tag button** - Add: `data-testid="create-tag-button"`
- **Tags list** - Add: `data-testid="tags-list"`
- **Tag item** - Add: `data-testid="tag-item-{tagId}"`
- **Tag edit button** - Add: `data-testid="tag-edit-{tagId}"`
- **Tag delete button** - Add: `data-testid="tag-delete-{tagId}"`

**Implementation Priority:** 3 (Medium)

#### Profile Page (`frontend/src/pages/ProfilePage.jsx`)
- **Profile name input** - Add: `data-testid="profile-name"`
- **Profile email input** - Add: `data-testid="profile-email"`
- **Save button** - Add: `data-testid="profile-save"`

**Implementation Priority:** 3 (Medium)

#### Usage Page (`frontend/src/pages/UsagePage.jsx`)
- **Usage chart** - Add: `data-testid="usage-chart"`
- **Usage table** - Add: `data-testid="usage-table"`
- **Usage projection** - Add: `data-testid="usage-projection"`

**Implementation Priority:** 3 (Medium)

#### Admin Pages
- **Admin dashboard** - Add: `data-testid="admin-dashboard"`
- **Admin tenants list** - Add: `data-testid="admin-tenants-list"`
- **Admin users list** - Add: `data-testid="admin-users-list"`
- **Admin audit logs** - Add: `data-testid="admin-audit-logs"`

**Implementation Priority:** 3 (Low)

---

## Navigation & Layout

### Global Navigation (`frontend/src/components/Sidebar.jsx`, `AppShell.jsx`)
- **Sidebar toggle** - Add: `data-testid="sidebar-toggle"`
- **Nav item - Dashboard** - Add: `data-testid="nav-dashboard"`
- **Nav item - Contacts** - Add: `data-testid="nav-contacts"`
- **Nav item - Campaigns** - Add: `data-testid="nav-campaigns"`
- **Nav item - Templates** - Add: `data-testid="nav-templates"`
- **Nav item - Team** - Add: `data-testid="nav-team"`
- **Nav item - Settings** - Add: `data-testid="nav-settings"`
- **Tenant switcher** - Add: `data-testid="tenant-switcher"`
- **User menu** - Add: `data-testid="user-menu"`
- **Logout button** - Add: `data-testid="logout-button"`

**Implementation Priority:** 2 (High - used in all journeys)

---

## Implementation Checklist

### Phase 1 (Critical - Week 1)
- [ ] Signup page selectors
- [ ] Login page selectors
- [ ] Tenant selection selectors
- [ ] Campaign creation selectors
- [ ] Contact management selectors
- [ ] Billing selectors

### Phase 2 (High - Week 2)
- [ ] Navigation selectors
- [ ] Dashboard selectors
- [ ] Templates selectors
- [ ] Team management selectors
- [ ] Settings page selectors

### Phase 3 (Medium - Week 3)
- [ ] Additional page selectors
- [ ] Error message selectors
- [ ] Modal selectors
- [ ] Component-specific selectors

### Phase 4 (Low - Week 4)
- [ ] Admin page selectors
- [ ] Analytics page selectors
- [ ] Profile page selectors
- [ ] Audit log selectors

---

## Implementation Guidelines

### Adding data-testid Attributes

**React Components:**
```jsx
// Before
<input type="email" name="email" placeholder="Email" />

// After
<input
  type="email"
  name="email"
  placeholder="Email"
  data-testid="login-email"
/>
```

**Buttons:**
```jsx
// Before
<button type="submit">Login</button>

// After
<button type="submit" data-testid="login-submit">Login</button>
```

**Containers/Lists:**
```jsx
// Before
<div className="campaign-row">
  <div className="campaign-name">{campaign.name}</div>
</div>

// After
<div className="campaign-row" data-testid={`campaign-row-${campaign.id}`}>
  <div className="campaign-name" data-testid={`campaign-name-${campaign.id}`}>
    {campaign.name}
  </div>
</div>
```

### Naming Conventions

- Use kebab-case: `login-email` not `loginEmail`
- Be descriptive: `campaign-send-button` not `send-btn`
- Include IDs where relevant: `campaign-row-{id}`
- Prefix with feature: `billing-upgrade-button` not `upgrade-button`

### Testing the Selectors

```javascript
// Verify selector works in tests
describe('Signup', () => {
  it('should find email input', async ({ page }) => {
    await page.goto('/signup');
    const emailInput = page.getByTestId('signup-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('test@example.com');
  });
});
```

---

## Validation Checklist

Before marking a selector as complete:
- [ ] Added to component (not just CSS class)
- [ ] Used in Playwright/Cypress test
- [ ] Works in all browsers (Chrome, Firefox, Safari)
- [ ] Tested with UI automation tool
- [ ] Documented in journey map
- [ ] No duplicate IDs in DOM

---

## Issues & Tracking

Link to GitHub issues for tracking implementation:
- Use label: `test-selectors`
- Priority levels: P0 (critical), P1 (high), P2 (medium), P3 (low)
- Cross-reference with journey map files

**Template Issue:**
```
Title: Add data-testid selectors to [Page Name]
Description: Add test selectors per journey-maps/test-improvements.md
Phase: [1/2/3/4]
Selectors needed:
- signup-email (signup page, email input)
- signup-password (signup page, password input)
...
```

---

**Last Updated:** December 28, 2025
**Total Selectors Needed:** 150+
**Phase 1 Selectors:** 40+ (Critical)
