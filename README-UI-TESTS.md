# UI Automation Tests with Playwright

This directory contains comprehensive UI automation tests for the EngageNinja application using Playwright.

## Test Structure

```
tests/
├── playwright.config.js          # Playwright configuration
├── package.json                  # Test dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── auth/                        # Authentication tests
│   ├── login.spec.ts            # Login flow tests
│   └── tenant-selection.spec.ts # Multi-tenant selection
├── dashboard/                   # Dashboard tests
│   └── overview.spec.ts         # Dashboard overview and navigation
├── contacts/                    # Contact management tests
│   ├── create.spec.ts           # Contact creation
│   ├── edit.spec.ts             # Contact editing
│   └── delete.spec.ts           # Contact deletion
├── campaigns/                   # Campaign management tests
│   ├── create.spec.ts           # Campaign creation wizard
│   └── manage.spec.ts           # Campaign operations
├── templates/                   # Template management tests
│   ├── create.spec.ts           # Template creation
│   └── manage.spec.ts           # Template operations
└── utils/                       # Test utilities
    ├── auth.setup.ts           # Authentication setup
    ├── test-data.ts            # Test data generators
    └── helpers.ts              # Helper functions
```

## Critical User Flows Covered

### 1. Authentication Flow
- Login with valid credentials
- Error handling for invalid credentials
- Field validation
- Session management
- Logout functionality

### 2. Dashboard Overview
- Dashboard metrics display
- Plan context card for free users
- Recent campaigns list
- Welcome carousel for new users
- Navigation to main sections

### 3. Contact Management (CRUD)
- Create new contacts with validation
- Edit existing contacts
- Delete contacts with confirmation
- Duplicate contact prevention
- Tag management

### 4. Campaign Creation & Management
- Multi-step campaign wizard
- Channel selection (WhatsApp, Email)
- Template selection and variable mapping
- Audience configuration
- Campaign status tracking
- Send, archive, delete operations

### 5. Template Management
- Create templates with content validation
- Template variable validation
- Template preview functionality
- Duplicate, archive, delete templates
- Search and filtering

## Running Tests

### Install Dependencies
```bash
cd tests
npm install
```

### Run All Tests
```bash
# Run all tests
npm run test

# Run with headed browser (visible)
npm run test:headed

# Run in debug mode
npm run test:debug
```

### Run Specific Test Suites
```bash
# Authentication tests only
npm run test:auth

# Dashboard tests only
npm run test:dashboard

# Contact management tests
npm run test:contacts

# Campaign tests
npm run test:campaigns

# Template tests
npm run test:templates
```

### View Test Results
```bash
# View HTML report
npm run test

# View trace for failed tests
npm run test:ui
```

## Test Data

Tests use realistic test data defined in `utils/test-data.ts`:
- `TEST_CONTACTS`: Sample contact data
- `TEST_CAMPAIGNS`: Sample campaign configurations
- `TEST_TEMPLATES`: Template examples
- Helper functions for generating random data

## Helper Functions

Common UI operations are abstracted in `utils/helpers.ts`:
- `UIHelpers` class for common interactions
- Login helpers
- Form validation checks
- Toast notification handling
- Screenshot utilities

## Configuration

### Playwright Config
- Runs on Chrome, Firefox, and WebKit
- Auto-starts dev server on port 3174
- Screenshots on failure
- Retries on CI
- Traces on retry

### Environment
- Frontend: http://localhost:3173 (test environment)
- Backend: http://localhost:5174 (test environment)
- Test database with seeded data

## Best Practices

1. **Atomic Tests**: Each test focuses on a single user flow
2. **Wait Strategies**: Proper waiting for elements and network idle
3. **Error Handling**: Graceful handling of API errors and timeouts
4. **Accessibility**: Tests work with keyboard navigation
5. **Responsive**: Tests verify UI works on different screen sizes
6. **Idempotent**: Tests can be run multiple times

## Adding New Tests

1. Create test file in appropriate directory
2. Use existing helpers from `utils/`
3. Follow naming convention: `feature.action.spec.ts`
4. Include positive and negative test cases
5. Add proper cleanup and teardown

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- No UI dependencies required
- Fast execution with parallel execution
- Automatic screenshot capture on failure
- HTML report generation
- Retries for flaky tests

## Troubleshooting

1. **Dev Server Not Starting**: Ensure backend is running on port 5174
2. **Element Not Found**: Check if selectors match the actual DOM
3. **Authentication Issues**: Verify test credentials in `auth.setup.ts`
4. **Timeout Issues**: Adjust timeout in helper functions
5. **Network Issues**: Check that backend APIs are responding

## Future Enhancements

1. **Visual Testing**: Add visual regression testing
2. **Performance Tests**: Add performance metrics
3. **Cross-Browser Testing**: Expand browser coverage
4. **Mobile Testing**: Add mobile device testing
5. **API Integration**: Add API state verification