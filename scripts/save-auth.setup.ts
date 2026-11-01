import fs from 'node:fs';
import path from 'node:path';
import { getCredentials, MISSING_CREDENTIALS } from '../src/config/env';
import { expect, test } from '../fixtures';

/**
 * TC-AUTH-001, human in the loop: `npm run auth:save`.
 * The login form is protected by Cloudflare Turnstile. This script never touches the challenge:
 * it fills the credentials from .env, waits for YOU to tick "Verify you are human", then logs in,
 * asserts the logged-in state and saves the session to .auth/<platform>.json (gitignored).
 */
test('TC-AUTH-001 log in with the test account and save the session', async ({ page, login, home, authFile, platform }) => {
  const credentials = getCredentials();
  test.skip(!credentials, MISSING_CREDENTIALS);

  await login.open();
  await login.fill(credentials!.email, credentials!.password);
  await expect(login.emailError).toBeHidden();

  await login.waitForHumanVerification();
  await login.submit.click();

  await expect(page, 'leaves /login after a successful login').not.toHaveURL(/\/login/, { timeout: 30_000 });
  await home.open();
  await home.expectLoggedIn();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  console.log(`\n>>> Saved ${platform} session to ${path.relative(process.cwd(), authFile)}\n`);
});
