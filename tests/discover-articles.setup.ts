import fs from 'node:fs';
import path from 'node:path';
import { ARTICLES_FILE } from '../src/config/env';
import { expect, test } from '../fixtures';

const ARTICLE_PATH = /^\/kumparan(?!plus)[a-z0-9]*\/[a-z0-9-]+-[0-9A-Za-z]{11}$/;

/**
 * Articles rotate every few minutes, so instead of hardcoding one, every run starts by collecting
 * live article links from the homepage (one navigation, shared by all workers and projects).
 */
test('discover live articles from the homepage feed', async ({ home, page }) => {
  await home.open();

  const collect = async () => {
    const paths = await page.locator('a[href]').evaluateAll((links) =>
      links
        .map((a) => new URL((a as HTMLAnchorElement).href))
        .filter((url) => url.hostname.endsWith('kumparan.com'))
        .map((url) => url.pathname),
    );
    return [...new Set(paths.filter((p) => ARTICLE_PATH.test(p)))];
  };

  // Feed cards hydrate after the header, so wait until enough article links are attached.
  await expect.poll(async () => (await collect()).length, { message: 'live article links on the homepage' })
    .toBeGreaterThanOrEqual(10);

  fs.mkdirSync(path.dirname(ARTICLES_FILE), { recursive: true });
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(await collect(), null, 2));
});
