import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for EngageNinja E2E Tests
 * Tests critical user journeys: signup, login, campaigns, contacts, billing
 */
export default defineConfig({
  // Directory containing test files
  testDir: './tests/e2e',

  // Glob patterns to exclude
  testIgnore: ['**/*.spec.js.skip', '**/*.skip.js'],

  // Max time for the entire test suite to run
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Number of parallel workers
  workers: 1,

  // Fail on console errors/warnings
  fullyParallel: false,
  forbidOnly: false,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never', outputFolder: 'tests/reports/html' }],
    ['json', { outputFile: 'tests/reports/results.json' }],
    ['junit', { outputFile: 'tests/reports/junit.xml' }],
    ['list'], // Console output
  ],

  // Shared settings for all reporters
  use: {
    // Base URL for all requests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3173',

    // Take screenshots on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Emulate network conditions
    offline: false,

    // Navigation timeout
    navigationTimeout: 10000,
  },

  // Projects: different browser and configuration combinations
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Web server configuration (auto-start dev server if not running)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3173',
    reuseExistingServer: process.env.CI ? false : true,
    timeout: 120000,
  },
});
