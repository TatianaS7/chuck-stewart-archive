// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @see https://playwright.dev/docs/test-configuration */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global.setup.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
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
      command: 'node server.js',
      cwd: rootDir,
      url: 'http://localhost:8000/api/prints/all',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npx vite',
      cwd: rootDir,
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});


