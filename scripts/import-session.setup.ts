import fs from 'node:fs';
import path from 'node:path';
import { getCookieHeader, MISSING_COOKIE } from '../src/config/env';
import { expect, test } from '../fixtures';

/** Cloudflare's own bot-clearance cookies are never reused: only kumparan's login session is. */
const CLOUDFLARE_COOKIES = /^(cf_clearance|__cf_bm|_cfuvid|__cflb|cf_chl_.*)$/;

/**
 * TC-AUTH-001, alternative to `auth:save`: `npm run auth:import`.
 * Cloudflare Turnstile rejects browsers controlled by automation, so the tester logs in by hand in their
 * normal browser (solving Turnstile as a human) and copies the Cookie request header into KUMPARAN_COOKIE
 * in .env. This setup turns it into .auth/<platform>.json and verifies the logged-in state.
 * Cookie values are never printed.
 */
test('TC-AUTH-001 import the session from a manual browser login', async ({ context, home, authFile, platform }) => {
  const header = getCookieHeader();
  test.skip(!header, MISSING_COOKIE);

  const cookies = header!
    .split(/;\s*/)
    .map((pair) => [pair.slice(0, pair.indexOf('=')).trim(), pair.slice(pair.indexOf('=') + 1).trim()] as const)
    .filter(([name]) => name && !CLOUDFLARE_COOKIES.test(name))
    .map(([name, value]) => ({ name, value, domain: '.kumparan.com', path: '/', secure: true, sameSite: 'Lax' as const }));
  expect(cookies.length, 'cookies found in the copied header').toBeGreaterThan(0);

  await context.addCookies(cookies);
  await home.open();
  await home.expectLoggedIn();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await context.storageState({ path: authFile });
  console.log(`\n>>> Imported ${cookies.length} cookies into the ${platform} session (${path.relative(process.cwd(), authFile)})\n`);
});
