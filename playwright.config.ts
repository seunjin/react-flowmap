import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'demo-react',
      command: 'pnpm demo:react',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      name: 'demo-tanstack',
      command: 'pnpm demo:tanstack',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      name: 'demo-next',
      command: 'pnpm demo:next',
      port: 3003,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
