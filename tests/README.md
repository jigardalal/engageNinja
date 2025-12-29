# EngageNinja E2E Tests

Comprehensive end-to-end tests for critical user journeys in EngageNinja using Playwright.

## Quick Start

### Prerequisites

- Node.js 18+
- Running frontend on `http://localhost:3173`
- Running backend on `http://localhost:5173`

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npm run test:e2e

# Run signup tests only
npm run test:signup

# Run tests with visible browser (headed mode)
npm run test:e2e:headed

# Run tests in interactive debug mode
npm run test:e2e:debug

# Run tests with UI mode (watch tests update in real-time)
npm run test:e2e:ui

# Generate new tests using Codegen (records your interactions)
npm run test:e2e:codegen
```

## Test Structure

```
tests/
├── e2e/                          # End-to-end tests
│   ├── signup.spec.js            # Signup flow tests
│   └── [other test files]
├── fixtures/                     # Test data and fixtures
├── README.md                      # This file
└── .gitignore                     # Ignore test artifacts
```

## Test Coverage

### Currently Implemented

- **Signup Flow** (`signup.spec.js`)
  - Page navigation and form visibility
  - Form field filling and validation
  - Empty form validation
  - Email format validation
  - Password matching validation
  - Terms checkbox requirement
  - Form submission
  - Optional phone field handling

### Planned Tests

- Login flow
- Tenant selection
- Campaign creation
- Contact management
- Contact import (CSV)
- Message sending
- Billing/upgrade flow

## Selector Strategy

Tests use **dual selectors** to support both current and future implementations:

```javascript
// Current implementation (name attributes)
page.locator("input[name='email']")

// Future implementation (data-testid)
page.locator("[data-testid='signup-email']")

// Combined selector (uses first match)
page.locator("[data-testid='signup-email'], input[name='email'][type='email']")
```

To improve test reliability, implement the data-testid selectors from `journey-maps/test-improvements.md`:

### Signup Page Selectors Needed

```jsx
// Add these to frontend/src/pages/SignupPage.jsx
<input data-testid="signup-first-name" name="firstName" ... />
<input data-testid="signup-last-name" name="lastName" ... />
<input data-testid="signup-company-name" name="companyName" ... />
<input data-testid="signup-email" name="email" type="email" ... />
<input data-testid="signup-phone" name="phone" ... />
<input data-testid="signup-password" name="password" type="password" ... />
<input data-testid="signup-confirm-password" name="confirmPassword" type="password" ... />
<input data-testid="signup-accept-terms" name="acceptTerms" type="checkbox" ... />
<button data-testid="signup-submit" type="submit">Create Account</button>
<div data-testid="signup-error">{error}</div>
```

## Configuration

### playwright.config.js

Located at project root. Configured for:

- **Base URL**: `http://localhost:3173` (customizable via `PLAYWRIGHT_BASE_URL`)
- **Timeout**: 30 seconds per test
- **Workers**: 1 (serial execution for consistency)
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Screenshots**: On failure only
- **Videos**: On failure only
- **Reports**: HTML, JSON, JUnit XML

### Environment Variables

```bash
# Custom base URL for frontend
export PLAYWRIGHT_BASE_URL=http://localhost:3173

# Run tests with custom reporter
npm run test:e2e
```

## Reports

After running tests, reports are available at:

- **HTML Report**: `tests/reports/html/index.html`
- **JSON Results**: `tests/reports/results.json`
- **JUnit XML**: `tests/reports/junit.xml`

### View HTML Report

```bash
npx playwright show-report
```

## CI/CD Integration

Tests are configured to auto-start the dev server if it's not already running. For CI environments, set `reuseExistingServer: false` in `playwright.config.js`.

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: npm install

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: tests/reports/
```

## Debugging Tests

### 1. Use Headed Mode

See the browser as tests run:

```bash
npm run test:e2e:headed
```

### 2. Use Debug Mode

Step through tests with interactive debugger:

```bash
npm run test:e2e:debug
```

### 3. Use UI Mode

Watch tests in real-time with full control:

```bash
npm run test:e2e:ui
```

### 4. Record New Tests

Use Codegen to record your interactions:

```bash
npm run test:e2e:codegen
```

This opens a browser where you can interact with the app and Playwright records your actions as test code.

### 5. Inspect Locators

```javascript
// In your test
await page.pause(); // Stops test execution, opens inspector

// Or use Playwright Inspector
npx playwright inspect
```

## Best Practices

1. **Use data-testid for stability**: Name attributes can change, data-testid is explicit
2. **Avoid hardcoded timeouts**: Use `waitForSelector`, `waitForNavigation`, etc.
3. **Test user flows**: Don't test implementation details
4. **Keep tests focused**: One flow per test, clear names
5. **Use fixtures**: Create reusable test data in `tests/fixtures/`
6. **Run tests before committing**: Catch regressions early

## Common Issues

### Tests timeout

- Increase timeout in `playwright.config.js`
- Check if dev server is running on correct port
- Verify network conditions (slow internet)

### Elements not found

- Check selectors in browser DevTools: `$('[data-testid="..."]')`
- Use `--debug` mode to inspect what Playwright sees
- Take screenshots: Add `await page.screenshot()` in tests

### Tests pass locally but fail in CI

- CI environment may have different setup
- Check timezone, locale, network conditions
- Use `reuseExistingServer: false` in CI

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Journey Maps](../journey-maps/) - User flow documentation
- [Test Improvements](../journey-maps/test-improvements.md) - Selector improvements needed

## Contributing

When adding new tests:

1. Follow the journey map structure
2. Use dual selectors (current + future data-testid)
3. Add comments for complex flows
4. Test all major paths and error cases
5. Update this README with new test coverage

## Questions?

Refer to:
- `CLAUDE.md` - Project architecture and patterns
- `journey-maps/` - User flow documentation
- Playwright docs - Testing patterns and best practices
