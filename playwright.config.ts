import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';
const REPORT_DIR = process.env.REPORT_DIR || './reports/output';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,           // Run sequentially — audit needs determinism
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                     // Single worker for ordered audit phases
  timeout: parseInt(process.env.DEFAULT_TIMEOUT || '15000'),
  expect: { timeout: 8000 },

  reporter: [
    ['list'],
    ['json',  { outputFile: `${REPORT_DIR}/results.json` }],
    ['html',  { outputFolder: `${REPORT_DIR}/html`, open: 'never' }],
    ['./utils/custom-reporter.ts'],
  ],

  use: {
    baseURL: BASE_URL,
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0'),
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000'),
    actionTimeout: 10000,

    // Evidence capture
    screenshot: 'on',
    video: 'on',
    trace: 'on',

    // Storage of auth state
    storageState: undefined,

    // Viewport
    viewport: { width: 1280, height: 800 },

    // Extra HTTP headers for audit identification
    extraHTTPHeaders: {
      'X-Audit-Run': 'nutropact-playwright-audit',
    },
  },

  projects: [
    // ── Setup projects (run first, produce auth state) ──────────────────
    {
      name: 'setup-admin',
      testMatch: '**/auth/setup-admin.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-customer',
      testMatch: '**/auth/setup-customer.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Main audit suite (desktop) ───────────────────────────────────────
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup-admin'],
    },

    // ── Unauthenticated (for auth / security tests) ──────────────────────
    {
      name: 'chromium-anon',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Mobile viewport ──────────────────────────────────────────────────
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        storageState: '.auth/customer.json',
      },
      dependencies: ['setup-customer'],
    },

    // ── Firefox cross-browser ────────────────────────────────────────────
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup-admin'],
    },
  ],

  outputDir: `${REPORT_DIR}/test-artifacts`,
  globalSetup:    './utils/global-setup.ts',
  globalTeardown: './utils/global-teardown.ts',
});
