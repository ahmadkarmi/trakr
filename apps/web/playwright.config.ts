import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    // Point to the dev server. Ensure it's running (npm run dev) or use browser_preview
    baseURL: process.env.BASE_URL || 'http://localhost:3002',
    headless: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Do not auto-start web server from Playwright; we connect to an existing dev server.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
