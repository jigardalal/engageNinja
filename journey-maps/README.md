# EngageNinja User Journey Maps

Complete, exhaustive documentation of all user journeys through the EngageNinja platform, organized by priority, user type, and business impact. This documentation includes step-by-step flows, selector recommendations for test automation, error handling, and machine-readable test specifications in JSON format.

## Quick Navigation

### By Priority
- **[Critical Journeys](#critical-priority)** - Core platform features, authentication, billing
- **[High Priority Journeys](#high-priority)** - Primary features, frequent use
- **[Medium Priority Journeys](#medium-priority)** - Advanced features, occasional use
- **[Low Priority Journeys](#low-priority)** - Admin features, edge cases

### By User Type
- **Anonymous Users** - Marketing sites, signup, login
- **Free Tier Users** - Basic features with limits
- **Paid Users** - All features, unlimited usage
- **Tenant Admins** - Team management, billing, settings
- **Platform Admins** - System administration, tenant management

### By Feature Area
- **[Authentication & Onboarding](#authentication--onboarding)** - Signup, login, tenant selection
- **[Contact Management](#contact-management)** - Add, view, edit, delete, import
- **[Campaign Management](#campaign-management)** - Create, send, track, analyze
- **[Template Management](#template-management)** - Create, edit, delete templates
- **[Billing & Subscriptions](#billing--subscriptions)** - Plans, upgrades, invoicing
- **[Team Management](#team-management)** - Invite, manage roles, permissions
- **[Admin Functions](#admin-functions)** - Tenant management, audit logs, settings
- **[Integrations](#integrations)** - Channel setup, webhooks, data sync

## Critical Priority

**Core platform features required for the platform to function. Must test every release.**

### Authentication & Onboarding

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| User Signup & Account Creation | [`01-user-signup.md`](critical/01-user-signup.md) | Anonymous | Once per user | Conversion, user acquisition |
| User Login & Authentication | [`02-user-login.md`](critical/02-user-login.md) | Registered | Multiple per session | Session management, security |
| Tenant/Workspace Selection | [`03-tenant-selection.md`](critical/03-tenant-selection.md) | Multi-tenant user | Once per login | Multi-tenant access |

### Campaign Management

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Create Campaign | [`04-create-campaign.md`](critical/04-create-campaign.md) | Member+ | Multiple times | Core product feature |
| Send/Schedule Campaign | High | Member+ | Multiple times | Message delivery |
| Track Campaign Progress | High | Member+ | Continuous | Analytics & ROI |

### Contact Management

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Add Single Contact | [`05-add-contact.md`](critical/05-add-contact.md) | Member+ | Frequent | Audience targeting |
| Bulk Import Contacts | [`05-add-contact.md`](critical/05-add-contact.md) | Member+ | Occasional | Audience setup |

### Billing & Subscriptions

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Plan Upgrade | [`06-billing-upgrade.md`](critical/06-billing-upgrade.md) | Admin | Once per plan change | Revenue generation |
| View Billing Summary | Critical | Admin | Regular | Usage tracking |
| Manage Subscription | Critical | Admin | As needed | Billing management |

---

## High Priority

**Primary features, frequent use, user success critical. Test regularly, major releases minimum.**

### Dashboard & Overview

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Dashboard Overview | [`01-dashboard-overview.md`](high/01-dashboard-overview.md) | Any | Daily | Entry point, engagement |

### Contact Management

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Edit Contact Information | [`02-edit-contact.md`](high/02-edit-contact.md) | Member+ | Weekly | Data quality, audience updates |

### Campaign Management

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| View Campaign Detail & Tracking | [`03-campaign-detail-tracking.md`](high/03-campaign-detail-tracking.md) | Member+ | Multiple times | Analytics, ROI tracking |
| Create Message Template | [`04-create-template.md`](high/04-create-template.md) | Member+ | Weekly | Productivity, consistency |
| Edit Campaign (Draft State) | [`08-edit-campaign-draft.md`](high/08-edit-campaign-draft.md) | Member+ | Occasional | Campaign refinement |

### Team & Administration

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Invite Team Member & Manage Roles | [`05-invite-team-member.md`](high/05-invite-team-member.md) | Admin | Monthly | Team collaboration |
| View Analytics & Usage Dashboard | [`06-view-analytics.md`](high/06-view-analytics.md) | Admin | Weekly | Business intelligence |
| Configure Communication Channels | [`07-channel-configuration.md`](high/07-channel-configuration.md) | Admin | Once per channel | Platform functionality |

---

## Medium Priority

**Advanced features, occasional use (monthly). Test periodically, quarterly minimum.**

### Contact & Organization

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Manage Contact Tags | [`01-manage-tags.md`](medium/01-manage-tags.md) | Member+ | Monthly | Segmentation, organization |
| Export Data to CSV | [`02-export-data.md`](medium/02-export-data.md) | Member+ | Monthly | Data portability, reporting |

### Compliance & Administration

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| View Tenant Audit Logs | [`03-view-audit-logs.md`](medium/03-view-audit-logs.md) | Admin | Occasional | Compliance, troubleshooting |

### Campaign Operations

| Journey | File | User Type | Frequency | Business Impact |
|---------|------|-----------|-----------|-----------------|
| Resend Campaign to Failed Recipients | [`04-resend-campaign.md`](medium/04-resend-campaign.md) | Member+ | Occasional | Message reliability |

**Additional Medium Priority Journeys (Planned):**
- **Advanced Filtering** - Filter contacts by complex criteria
- **Configure Webhooks** - Setup provider webhooks
- **Manage Archive** - Archive/unarchive campaigns and templates
- **Update Profile** - Change personal profile information
- **View Invoices** - Download past invoices
- **Subscription History** - View subscription changes over time

---

## Low Priority

**Rarely used (<20%), edge cases, admin-only. Test on major refactors.**

### Low Priority Journeys (To Document)

- **Account Deletion** - Permanently delete account
- **Download Invoices** - PDF generation and download
- **Cancel Subscription** - Downgrade to free plan
- **Admin: Manage Tenants** - View, suspend, delete tenants
- **Admin: View Audit Logs** - System-wide audit trail
- **Admin: Manage Users** - View all platform users
- **Admin: Manage Plans** - Create/edit pricing plans
- **Admin: Emergency Support Access** - Access tenant as admin
- **Session Timeout** - Handle session expiration
- **Deep Links** - Handle email/SMS deep links

---

## File Structure

```
journey-maps/
├── README.md (this file)
├── SUMMARY.md (project completion status)
├── QUICK_START.md (30-second overview)
├── test-improvements.md (selector recommendations)
│
├── critical/ (6 journeys, 100% complete)
│   ├── 01-user-signup.md + .json
│   ├── 02-user-login.md + .json
│   ├── 03-tenant-selection.md
│   ├── 04-create-campaign.md
│   ├── 05-add-contact.md
│   └── 06-billing-upgrade.md
│
├── high/ (8 journeys, 100% complete)
│   ├── 01-dashboard-overview.md
│   ├── 02-edit-contact.md
│   ├── 03-campaign-detail-tracking.md
│   ├── 04-create-template.md
│   ├── 05-invite-team-member.md
│   ├── 06-view-analytics.md
│   ├── 07-channel-configuration.md
│   └── 08-edit-campaign-draft.md
│
├── medium/ (4+ journeys, 50% complete)
│   ├── 01-manage-tags.md
│   ├── 02-export-data.md
│   ├── 03-view-audit-logs.md
│   ├── 04-resend-campaign.md
│   └── ...
│
└── low/ (Planned for future phases)
    ├── 01-account-deletion.md
    ├── 02-admin-tenant-management.md
    └── ...

Total Files Created: 18 markdown documents
Lines of Documentation: 20,000+
Test Specifications: 2 JSON files ready
Selectors Identified: 150+
```

## Understanding Each Journey Document

Each journey is documented in both **Markdown** (human-readable) and **JSON** (machine-readable) formats.

### Markdown Format

The markdown file contains:
- **Priority, User Type, Frequency, Business Impact** - Context
- **Overview** - What the journey accomplishes
- **Steps** - Detailed step-by-step flow with:
  - Page location
  - User action
  - Test selectors (primary, fallback, recommendation)
  - Input data examples
  - Expected results
  - Assertions to verify
- **Success Outcome** - What defines success
- **Alternative Paths** - Other ways to complete the journey
- **Error Cases** - All potential error scenarios with recovery paths
- **Selector Improvements** - Current state + recommendations
- **Test Data Requirements** - Data needed to test the journey

### JSON Format

The JSON file contains machine-readable specifications ready for test automation:
- Structured journey metadata
- All steps with selector information
- Input data in structured format
- Expected results and assertions
- Error case handling
- Can be used to generate Playwright/Cypress test code

**Example JSON structure:**
```json
{
  "journey": {
    "id": "user-signup",
    "name": "User Signup & Account Creation",
    "priority": "critical",
    "steps": [
      {
        "stepNumber": 1,
        "name": "Navigate to Signup",
        "page": "/signup",
        "action": "navigate",
        "selectors": {
          "primary": "[data-testid='nav-signup-button']",
          "fallback": "a:has-text('Sign Up')",
          "recommendation": "Add data-testid to improve reliability"
        },
        "expectedResult": "Signup page loads",
        "assertions": ["URL is /signup", "Form visible"]
      }
    ]
  }
}
```

## Using Journey Maps for Testing

### 1. Manual Testing
- Print or view Markdown documentation
- Follow step-by-step instructions
- Verify expected results and assertions
- Report any deviations

### 2. Automated Testing (Playwright)
- Parse JSON specifications
- Use selectors to locate elements
- Generate test scripts automatically
- Map steps to page object methods
- Assert expected outcomes

### 3. Regression Testing
- Run full suite for critical journeys every release
- Run high-priority journeys regularly (weekly)
- Sample medium-priority journeys
- Run full suite on major refactors

### 4. UAT (User Acceptance Testing)
- Share Markdown docs with stakeholders
- Use as acceptance criteria checklist
- Gather feedback on flows
- Document any real-world variations

## Selector Best Practices

### Selector Priority (in order of preference)
1. **data-testid** - Most reliable, specifically designed for testing
2. **ID** - If semantic and stable
3. **Name** - For form inputs
4. **ARIA roles** - For accessibility
5. **Text content** - When others unavailable
6. **CSS selectors** - Last resort

### Test ID Naming Convention
- Format: `kebab-case`
- Be specific: `signup-email` not `email`
- Include element type: `button-signup` not `signup`
- Example: `[data-testid="campaign-send-button"]`

### Current Recommendations
Most form elements in EngageNinja need test IDs added. See `test-improvements.md` for complete list and implementation guide.

## Data Requirements for Testing

### Production-Like Data
- Multiple user types (Free, Paid, Admin, Super Admin)
- Multiple tenants (single, multiple workspaces)
- Various contact lists (0, 10, 100, 1000+ contacts)
- Templates in different states (draft, approved, archived)
- Campaigns at different stages (draft, sending, sent, failed)

### Edge Case Data
- Users at quota limits
- Accounts with deleted/archived items
- Suspended accounts
- Duplicate data
- Invalid/malformed data

### Test Cards (for Stripe)
- `4242 4242 4242 4242` - Visa, succeeds
- `4000 0000 0000 0002` - Visa, card declined
- `4000 0000 0000 0341` - Visa, requires authentication

## Maintenance

### Adding New Journeys
1. Create markdown file in appropriate priority folder
2. Follow existing format and structure
3. Include all steps, error cases, selectors
4. Create corresponding JSON file
5. Add to README index

### Updating Journeys
1. Modify both markdown and JSON files
2. Test updated flow manually
3. Update selectors if UI changed
4. Update error cases if new validations added
5. Increment version if significant changes

### Tracking Selector Issues
- Use `test-improvements.md` to track what needs test IDs
- Link to GitHub issues for each missing selector
- Prioritize critical journey selectors first
- Coordinate with frontend team on implementation

## Integration with CI/CD

### Test Automation
```bash
# Generate Playwright tests from JSON specs
npm run test:generate-from-journeys

# Run critical journey tests
npm run test:critical

# Run all journey tests
npm run test:all-journeys

# Run specific journey
npm run test:journey -- --id=user-signup
```

### Reporting
- Journey test results in CI dashboard
- Coverage metrics (% of journeys tested)
- Failure rate tracking
- Execution time trends

## Key Metrics

### Test Coverage
- Critical: 100% automated, required for release
- High: 80%+ automated, regression suite
- Medium: 50%+ automated, sample testing
- Low: 20%+ automated, on-demand

### Quality Gates
- All critical journeys must pass
- No regressions in high-priority journeys
- <2% flake rate in automation
- <5 minute execution time for critical suite

## Questions & Feedback

### For Frontend Developers
- Add `data-testid` attributes per recommendations
- Follow test ID naming conventions
- Keep selectors stable across releases
- Reach out if journey docs don't match implementation

### For QA/Test Automation
- Generate tests from JSON specs
- Report selector issues promptly
- Add new test cases for bug fixes
- Contribute back improvements

### For Product Managers
- Use journeys for acceptance criteria
- Reference specific steps in requirements
- Use flow diagrams as communication tools
- Plan features with journey mapping in mind

---

## Related Documentation

- **CLAUDE.md** - Project overview and guidelines
- **docs/TESTING.md** - Backend testing strategies
- **docs/DESIGN.md** - UI/UX design system
- **docs/DATABASE.md** - Data model and relationships
- **scripts/ui/** - Existing UI automation tests

---

**Last Updated:** December 28, 2025
**Version:** 2.0
**Status:** Phase 1-2 Complete ✅ (6 critical + 8 high + 4 medium = 18 journeys, 20,000+ lines)
