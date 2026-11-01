import fs from 'node:fs';
import { test as base, expect } from '@playwright/test';
import { ARTICLES_FILE, hasSavedSession, MISSING_SESSION, type Platform } from '../src/config/env';
import { ArticlePage } from '../src/pages/ArticlePage';
import { CommentPage } from '../src/pages/CommentPage';
import { HomePage } from '../src/pages/HomePage';
import { LoginPage } from '../src/pages/LoginPage';
import { ReportPage } from '../src/pages/ReportPage';
import { SearchPage } from '../src/pages/SearchPage';
import { blockThirdPartyNoise, SubmissionGuard } from '../src/support/network';

/** Options set per project in playwright.config.ts. */
export interface TestOptions {
  platform: Platform;
  authFile: string;
  blockAds: boolean;
}

interface WorkerFixtures {
  /** Live article paths scraped once per worker; articles rotate too fast to hardcode. */
  articlePaths: string[];
}

interface Fixtures {
  home: HomePage;
  login: LoginPage;
  search: SearchPage;
  article: ArticlePage;
  comment: CommentPage;
  report: ReportPage;
  /** An article path for this test; desktop and mobile get different ones so they never share like state. */
  articlePath: string;
  submissionGuard: SubmissionGuard;
  /** URLs passed to window.open (share buttons). Stubbed so no external site is opened. */
  openedWindows: () => Promise<string[]>;
}

export const test = base.extend<TestOptions & Fixtures, WorkerFixtures>({
  platform: ['desktop', { option: true }],
  authFile: ['', { option: true }],
  blockAds: [true, { option: true }],

  context: async ({ context, blockAds }, use) => {
    if (blockAds) await blockThirdPartyNoise(context);
    await use(context);
  },

  page: async ({ page }, use) => {
    // Over-the-page ad modal can still appear when an ad slot falls back to a house ad.
    await page.addLocatorHandler(page.getByTestId('otp-ads-close-modal-btn'), (close) => close.click());
    await use(page);
  },

  articlePaths: [
    async ({}, use) => {
      expect(fs.existsSync(ARTICLES_FILE), 'article list from the "discover" setup project').toBe(true);
      await use(JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8')) as string[]);
    },
    { scope: 'worker' },
  ],

  articlePath: async ({ articlePaths, platform }, use, testInfo) => {
    const offset = platform === 'mobile' ? Math.floor(articlePaths.length / 2) : 0;
    await use(articlePaths[(testInfo.parallelIndex + offset) % articlePaths.length]);
  },

  home: async ({ page, platform }, use) => use(new HomePage(page, platform)),
  login: async ({ page, platform }, use) => use(new LoginPage(page, platform)),
  search: async ({ page, platform }, use) => use(new SearchPage(page, platform)),
  article: async ({ page, platform }, use) => use(new ArticlePage(page, platform)),
  comment: async ({ page, platform }, use) => use(new CommentPage(page, platform)),
  report: async ({ page, platform }, use) => use(new ReportPage(page, platform)),

  submissionGuard: async ({ context }, use) => {
    const guard = new SubmissionGuard();
    await guard.attach(context);
    await use(guard);
    expect(guard.blocked, 'comment/report submissions must never be sent').toEqual([]);
  },

  openedWindows: async ({ page }, use) => {
    await page.addInitScript(() => {
      const opened: string[] = [];
      (window as unknown as { __opened: string[] }).__opened = opened;
      window.open = ((url?: string | URL) => {
        opened.push(String(url));
        return null;
      }) as typeof window.open;
    });
    await use(() => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened));
  },
});

/** Tests that need a logged-in user. Skipped with a clear reason until `npm run auth:save` has run. */
export const authTest = test.extend({
  storageState: async ({ authFile }, use, testInfo) => {
    testInfo.skip(!hasSavedSession(authFile), MISSING_SESSION);
    await use(authFile);
  },
});

export { expect };
