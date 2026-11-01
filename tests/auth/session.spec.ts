import { authTest as test, expect } from '../../fixtures';

test.describe('Session (logged in)', { tag: '@auth' }, () => {
  test('TC-AUTH-002 session persists after reload and navigation', async ({ page, home, article, articlePath }) => {
    await home.open();
    await home.expectLoggedIn();

    await page.reload();
    await home.expectLoggedIn();

    await article.open(articlePath);
    await home.expectLoggedIn();
  });

  test('TC-AUTH-014 logged-in user opening /login is not asked to log in again', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByTestId('input-email')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/login$/);
  });
});
