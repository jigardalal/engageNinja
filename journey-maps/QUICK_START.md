# Quick Start Guide - Journey Maps

**TL;DR:** 6 complete critical user journey maps with test specifications ready for automation.

## 30-Second Overview

✅ **6 Critical Journeys Documented**
- User Signup
- User Login
- Tenant Selection
- Create Campaign
- Add Contact (Single & Bulk)
- Plan Upgrade & Billing

✅ **Test-Ready Specifications**
- 6 JSON files with Playwright selectors
- 150+ test selectors identified
- Error cases documented

✅ **Implementation Roadmap**
- 4 implementation phases
- Phase 1 (Critical) ready to execute
- Phase 2-4 planned

---

## For Different Roles

### I'm a QA Engineer
**Start Here:** [`critical/01-user-signup.json`](critical/01-user-signup.json)
1. Open JSON file
2. Review steps and selectors
3. Create Playwright test
4. Run against staging environment
5. Report missing selectors

**Next:** [`test-improvements.md`](test-improvements.md) - Identify blocking selectors

### I'm a Frontend Developer
**Start Here:** [`test-improvements.md`](test-improvements.md)
1. Review Phase 1 selectors (Critical - 40+ items)
2. Add `data-testid` attributes to your components
3. Follow naming conventions (kebab-case)
4. Test with Playwright selector validation

**Example:** Add `data-testid="login-email"` to email input in LoginPage.jsx

### I'm a Product Manager
**Start Here:** [`README.md`](README.md)
1. Review Critical journeys table
2. Read specific journey markdown (e.g., `04-create-campaign.md`)
3. Use steps as acceptance criteria
4. Share with stakeholders for feedback

### I'm a Test Automation Engineer
**Start Here:** [`critical/`](critical/) directory
1. Parse JSON specs
2. Generate Playwright tests
3. Handle selector improvements as needed
4. Run automation suite

---

## Quick Navigation

### By What I Need

**I need to understand a feature flow:**
→ Read markdown file (e.g., `critical/04-create-campaign.md`)

**I need to automate a test:**
→ Use JSON file (e.g., `critical/04-create-campaign.json`)

**I need to add test selectors:**
→ Check `test-improvements.md` Phase 1

**I need to know next steps:**
→ Read `SUMMARY.md` roadmap section

**I need the full overview:**
→ Read `README.md`

---

## The 6 Critical Journeys (30 seconds each)

### 1. User Signup
**What:** New users create account and first workspace
**Why Critical:** Conversion point - new user onboarding
**Status:** ✅ Complete
**Files:** `critical/01-user-signup.md` + `.json`

### 2. User Login
**What:** Registered users authenticate and enter platform
**Why Critical:** Session management and security
**Status:** ✅ Complete
**Files:** `critical/02-user-login.md` + `.json`

### 3. Tenant Selection
**What:** Users with multiple workspaces select active workspace
**Why Critical:** Multi-tenant access enablement
**Status:** ✅ Complete
**Files:** `critical/03-tenant-selection.md`

### 4. Create Campaign
**What:** Users create message campaigns to send to contacts
**Why Critical:** Core product feature - primary value delivery
**Status:** ✅ Complete
**Files:** `critical/04-create-campaign.md`

### 5. Add Contact (Single & Bulk)
**What:** Users add contacts individually or import CSV
**Why Critical:** Audience foundation - required for campaigns
**Status:** ✅ Complete
**Files:** `critical/05-add-contact.md`

### 6. Plan Upgrade & Billing
**What:** Users upgrade plans and manage subscriptions
**Why Critical:** Revenue generation and feature gating
**Status:** ✅ Complete
**Files:** `critical/06-billing-upgrade.md`

---

## How to Read a Journey Map

### Markdown Files (for humans)
```markdown
# Journey: Create Campaign
Priority: Critical
User Type: Authenticated user
Frequency: Multiple times per session
Business Impact: Core product feature

## Overview
[What the journey accomplishes]

## Steps
### 1. Navigate to Campaigns Page
- From: Dashboard
- Action: Click "Campaigns"
- Selectors: [element locations]
- Expected Result: [what should happen]
- Assertions: [things to verify]

## Error Cases
### Error 1: No Campaign Name
- Trigger: [what causes error]
- Expected Behavior: [what should show]
- Error Message: [specific text]
- Recovery: [how user fixes it]
```

**Read for:** Understanding flow, UAT, acceptance criteria

### JSON Files (for automation)
```json
{
  "journey": {
    "id": "user-signup",
    "steps": [
      {
        "stepNumber": 1,
        "action": "navigate",
        "selectors": {
          "primary": "[data-testid='signup-button']",
          "fallback": "a:has-text('Sign Up')"
        }
      }
    ]
  }
}
```

**Read for:** Test automation, code generation

---

## Test Selectors: Current State

### What Are Test Selectors?
`data-testid` attributes on HTML elements that help tests find elements reliably.

```html
<!-- Before -->
<input type="email" name="email" placeholder="Email">

<!-- After (with test selector) -->
<input type="email" name="email" placeholder="Email" data-testid="login-email">
```

### Why We Need Them
- ✅ Survive UI refactors (CSS changes don't break tests)
- ✅ Independent of label text
- ✅ More reliable than CSS selectors
- ✅ Intentional - shows what's testable

### Current Status
- ⏳ 150+ selectors identified and recommended
- 🔄 10+ selectors already implemented (in some components)
- ❌ 140+ selectors needed to be added

### How to Help
1. Open `test-improvements.md`
2. Pick Phase 1 (Critical) selector
3. Find the component in codebase
4. Add `data-testid="xyz"` to the element
5. Test with Playwright selector validation

---

## Using Journey Maps in Your Workflow

### QA Testing
```bash
# 1. Pick a journey
cd journey-maps/critical/
cat 01-user-signup.md

# 2. Follow steps manually
# 3. Verify expected results
# 4. Report any issues

# Or: Automate using JSON
python test_generator.py < 01-user-signup.json
```

### Automation Testing
```bash
# 1. Parse JSON spec
node scripts/generate-tests.js critical/01-user-signup.json

# 2. Creates Playwright test (auto-generated)
# 3. Run test
npx playwright test tests/journeys/user-signup.spec.js

# 4. Debug failures
# 5. Add selector improvements
```

### Feature Development
```markdown
# Requirement: User Signup Flow

Reference: journey-maps/critical/01-user-signup.md

Acceptance Criteria:
- [ ] User can enter email (step 5)
- [ ] Password validation works (step 7)
- [ ] ReCAPTCHA completes (step 10)
- [ ] Error handling for duplicate email (error case 6)
- [ ] Account created in database (success outcome)
```

---

## Common Questions

### Q: Why are there 6 journeys instead of 30?
**A:** Started with the CRITICAL flows (directly block usage). High/Medium/Low priority journeys are in the roadmap for phases 2-4.

### Q: Can I start testing today?
**A:** Yes! With caveat: 10+ test selectors missing. Either:
- Option 1: Use CSS/role selectors (less stable)
- Option 2: Wait for Phase 1 selector implementation (1-2 days)

### Q: How long to complete all 25+ journeys?
**A:**
- Phase 2 (High): 2-3 days
- Phase 3 (Medium): 2 days
- Phase 4 (Low): 1-2 days
- **Total:** ~1 week for all 25+ journeys

### Q: Do I need to read all 10,000+ lines?
**A:** No!
- Just need your specific journey (markdown)
- QA: Use JSON for automation
- Frontend: Use test-improvements.md Phase 1
- Product: Use markdown steps as checklist

### Q: What's the ROI?
**A:**
- Manual regression test: 2-4 hours
- Automated regression test: 2-5 minutes
- Savings per release: ~4 hours × developers
- Breakeven: ~3-5 releases

---

## Next Actions by Role

### For QA/Test Automation
```
Next 30 mins:
1. [ ] Read this QUICK_START.md
2. [ ] Open critical/01-user-signup.json
3. [ ] Try generating Playwright test
4. [ ] Identify first missing selector
5. [ ] Report in GitHub issue

Next 2 hours:
1. [ ] Automate 2 critical journeys
2. [ ] Create run script
3. [ ] Test against staging
4. [ ] Measure execution time
5. [ ] Plan Phase 2 automation
```

### For Frontend Developers
```
Next 30 mins:
1. [ ] Read test-improvements.md Phase 1
2. [ ] Identify 5 easy selectors to add
3. [ ] Add data-testid to components
4. [ ] Test with Playwright selector validation
5. [ ] Create PR with changes

Next 2 hours:
1. [ ] Add remaining Phase 1 selectors
2. [ ] Test all selectors work
3. [ ] Document in PR
4. [ ] Coordinate with QA
```

### For Product/Business
```
Next 30 mins:
1. [ ] Read SUMMARY.md
2. [ ] Review 6 critical journeys
3. [ ] Identify any missing flows
4. [ ] Plan Phase 2 priorities

Next 2 hours:
1. [ ] Share journeys with stakeholders
2. [ ] Gather feedback on flows
3. [ ] Identify variations/edge cases
4. [ ] Document requirements for future phases
```

---

## File Location
All files are in: `/Users/jigs/Code/engageNinja/journey-maps/`

## Key Files
| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Full reference | Everyone |
| `SUMMARY.md` | Project overview | Leadership |
| `QUICK_START.md` | This file | Everyone |
| `test-improvements.md` | Selector roadmap | Developers/QA |
| `critical/*.md` | Journey details | QA/Product |
| `critical/*.json` | Test specs | QA Automation |

---

## Getting Help

**Question about a journey?**
→ Read the specific `.md` file (e.g., `critical/04-create-campaign.md`)

**Need to know what selectors to add?**
→ Check `test-improvements.md`

**Want to understand the project?**
→ Read `SUMMARY.md` or `README.md`

**Want to contribute?**
→ Follow `README.md` Maintenance section

---

## Start Now

**Pick your role and go:**

👨‍💻 **QA Engineer:** Open [`critical/01-user-signup.json`](critical/01-user-signup.json)

🎨 **Frontend Dev:** Open [`test-improvements.md`](test-improvements.md) Phase 1

📊 **Product Manager:** Open [`README.md`](README.md) Critical section

🤖 **QA Automation:** Open [`critical/`](critical/) directory

---

**Total Setup Time:** 30 seconds to 1 hour depending on what you do
**Immediate Value:** Use tomorrow in your workflow
**Long-term ROI:** 10x automation time savings

Go! 🚀
