import { authTest as test, expect } from '../../fixtures';

// Runs in the logout-desktop / logout-mobile projects, after every other test of that platform.
// TC-AUTH-015 depends on the logout that TC-AUTH-003 just did, so the two run in order.
test.describe.configure({ mode: 'serial' });

test.describe('Logout', { tag: '@auth' }, () => {
  test('TC-AUTH-003 logout ends the session', async ({ page, home, article, articlePath }) => {
    await home.open();
    await home.expectLoggedIn();

    await home.logout();

    await home.expectLoggedOut();

    await test.step('still logged out after reload; Like asks to log in', async () => {
      await article.open(articlePath);
      await page.reload();
      await article.likeButton.click();
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test('TC-AUTH-015 the session token is rejected right after logout', async ({ page }) => {
    test.fail(true, 'Known defect DEF-006: the pre-logout session token keeps working for a while after logout');
    test.setTimeout(6 * 60_000);
    // This test's browser starts from the session saved BEFORE the logout above (storageState = authFile).
    // Measure how long the server still accepts it: /login redirects logged-in users and shows the form to guests.
    const start = Date.now();
    let acceptedFor = 0;
    await expect(async () => {
      await page.goto('/login');
      const guest = await page.getByTestId('input-email').isVisible({ timeout: 5_000 }).catch(() => false);
      acceptedFor = Math.round((Date.now() - start) / 1000);
      expect(guest, 'old token rejected').toBe(true);
    }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 5 * 60_000 });

    test.info().annotations.push({ type: 'observed', description: `old session token accepted for ~${acceptedFor}s after logout` });
    expect(acceptedFor, 'seconds the old token was still accepted after logout').toBeLessThanOrEqual(5);
  });
});
