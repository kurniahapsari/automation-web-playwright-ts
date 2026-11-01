import { getCredentials, MISSING_CREDENTIALS } from '../../src/config/env';
import { expect, test } from '../../fixtures';

/**
 * Server-side rejection of invalid accounts. Each submit needs Cloudflare Turnstile, so these run
 * only with `npm run test:human` (headed, one worker): the test fills the form, a human ticks
 * "Verify you are human", the test submits and asserts the rejection.
 */
const REJECTION = /salah|tidak (terdaftar|ditemukan|sesuai|valid)|belum terdaftar|gagal|invalid|incorrect/i;

test.describe.configure({ mode: 'serial' });

test.describe('Login rejection (human-assisted)', { tag: ['@human', '@auth'] }, () => {
  test.setTimeout(5 * 60_000);

  test('TC-AUTH-004 unregistered email is rejected with a clear message', async ({ page, login }) => {
    await login.open();
    await login.fill(`qa.kumparan+${Date.now()}@example.com`, 'Dummy#12345');
    await login.waitForHumanVerification();

    await login.submit.click();

    await expect(page.getByText(REJECTION).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(login.email).toBeVisible();
  });

  test('TC-AUTH-005 registered email with a wrong password is rejected', async ({ page, login }) => {
    const credentials = getCredentials();
    test.skip(!credentials, MISSING_CREDENTIALS);
    await login.open();
    // Exactly one wrong attempt per run, so the real account is never locked.
    await login.fill(credentials!.email, `${credentials!.password}-wrong`);
    await login.waitForHumanVerification();

    await login.submit.click();

    await expect(page.getByText(REJECTION).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
