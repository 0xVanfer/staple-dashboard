const fs = require('fs');
const { defineConfig } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${process.env.DASHBOARD_PORT || '8787'}`;
const basePort = Number(new URL(baseURL).port || (baseURL.startsWith('https://') ? 443 : 80));
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome';
const executablePath = fs.existsSync(chromePath) ? chromePath : undefined;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 180000,
  expect: {
    timeout: 60000
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  },
  webServer: {
    command: `python3 -m http.server ${basePort}`,
    port: basePort,
    reuseExistingServer: true,
    cwd: '.'
  }
});
