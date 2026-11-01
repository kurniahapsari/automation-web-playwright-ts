import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import type { TestOptions } from './fixtures';
import { AUTH_FILES, BASE_URLS } from './src/config/env';

const isCI = !!process.env.CI;
const runHumanAssisted = !!process.env.HUMAN;

const NO_ARTIFACTS = { trace: 'off', video: 'off', screenshot: 'off' } as const;

// Specs that need a special project (or a human) never run in the regular projects.
const SPECIAL_SPECS = [/logout\.spec\.ts/, /\.setup\.ts/];

export default defineConfig<TestOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // Production occasionally serves its "Aku memperbaiki diri dulu ya" error page; one retry absorbs
  // that, and the report flags such tests as flaky instead of hiding them.
  retries: isCI ? 2 : 1,
  // Production site behind a WAF that rate-limits bursts (HTTP 403): stay a polite client.
  workers: Number(process.env.WORKERS ?? 2),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // @human needs a person to solve Turnstile; @quarantine = known-flaky, tracked, not blocking.
  grepInvert: runHumanAssisted ? /@quarantine/ : /@human|@quarantine/,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    testIdAttribute: 'data-qa-id',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [
    // Collects live article links once per run (articles rotate too fast to hardcode).
    {
      name: 'discover',
      testMatch: /discover-articles\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URLS.desktop, platform: 'desktop' },
    },
    {
      name: 'desktop-chrome',
      testIgnore: SPECIAL_SPECS,
      dependencies: ['discover'],
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URLS.desktop, platform: 'desktop', authFile: AUTH_FILES.desktop },
    },
    {
      name: 'mobile-chrome',
      testIgnore: SPECIAL_SPECS,
      dependencies: ['discover'],
      use: { ...devices['Pixel 7'], baseURL: BASE_URLS.mobile, platform: 'mobile', authFile: AUTH_FILES.mobile },
    },
    // Optional WebKit coverage: `npx playwright install webkit` then `--project=mobile-safari`.
    ...(process.env.WEBKIT
      ? [{
          name: 'mobile-safari',
          testIgnore: SPECIAL_SPECS,
          dependencies: ['discover'],
          use: { ...devices['iPhone 15'], baseURL: BASE_URLS.mobile, platform: 'mobile' as const, authFile: AUTH_FILES.mobile },
        }]
      : []),

    // Logout can invalidate the saved session, so it runs after everything else on that platform.
    {
      name: 'logout-desktop',
      testMatch: /logout\.spec\.ts/,
      dependencies: ['discover', 'desktop-chrome'],
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URLS.desktop, platform: 'desktop', authFile: AUTH_FILES.desktop },
    },
    {
      name: 'logout-mobile',
      testMatch: /logout\.spec\.ts/,
      dependencies: ['discover', 'mobile-chrome'],
      use: { ...devices['Pixel 7'], baseURL: BASE_URLS.mobile, platform: 'mobile', authFile: AUTH_FILES.mobile },
    },

    // Human-in-the-loop login (Cloudflare Turnstile): `npm run auth:save`. Never part of a normal run.
    // No retries (a person would have to solve Turnstile again) and no trace/video/screenshot,
    // because traces record the typed credentials.
    {
      name: 'auth-desktop',
      testDir: './scripts',
      testMatch: /save-auth\.setup\.ts/,
      timeout: 5 * 60_000,
      retries: 0,
      use: {
        ...devices['Desktop Chrome'], ...NO_ARTIFACTS, baseURL: BASE_URLS.desktop, platform: 'desktop',
        authFile: AUTH_FILES.desktop, channel: process.env.AUTH_CHANNEL,
      },
    },
    {
      name: 'auth-mobile',
      testDir: './scripts',
      testMatch: /save-auth\.setup\.ts/,
      timeout: 5 * 60_000,
      retries: 0,
      use: {
        ...devices['Pixel 7'], ...NO_ARTIFACTS, baseURL: BASE_URLS.mobile, platform: 'mobile',
        authFile: AUTH_FILES.mobile, channel: process.env.AUTH_CHANNEL,
      },
    },

    // Alternative when Turnstile rejects the automated browser: `npm run auth:import` turns a manual
    // browser login (copied Cookie header) into the session files. Headless; no credentials typed.
    {
      name: 'auth-import-desktop',
      testDir: './scripts',
      testMatch: /import-session\.setup\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'], ...NO_ARTIFACTS, baseURL: BASE_URLS.desktop, platform: 'desktop', authFile: AUTH_FILES.desktop },
    },
    {
      name: 'auth-import-mobile',
      testDir: './scripts',
      testMatch: /import-session\.setup\.ts/,
      retries: 0,
      use: { ...devices['Pixel 7'], ...NO_ARTIFACTS, baseURL: BASE_URLS.mobile, platform: 'mobile', authFile: AUTH_FILES.mobile },
    },
  ],
});
