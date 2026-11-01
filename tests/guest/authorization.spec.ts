import { expect, test } from '../../fixtures';

test.describe('Guest authorization', { tag: '@guest' }, () => {
  test('TC-AUTHZ-001 guest clicking Like is redirected to login', { tag: '@smoke' }, async ({ page, article, articlePath }) => {
    await article.open(articlePath);
    const likesBefore = await article.likeCount();

    await article.likeButton.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('input-email')).toBeVisible();

    await test.step('like count is unchanged', async () => {
      await page.goBack();
      await expect(article.title).toBeVisible();
      expect(await article.likeCount()).toBe(likesBefore);
    });
  });

  test('TC-AUTHZ-002 guest can read the comment page', async ({ page, article, comment, articlePath }) => {
    await article.open(articlePath);
    await article.commentButton.click();

    await expect(page).toHaveURL(/\/response\//);
    await expect(comment.articleCard).toBeVisible();
    await expect(comment.count).toBeVisible();
    await expect(comment.input).toBeVisible();
    await expect(comment.input).toHaveAttribute('placeholder', 'Tulis komentar...');
    await expect(comment.sendButton).toBeVisible();
  });

  test('TC-AUTHZ-004 guest login entry point opens the login page', { tag: '@smoke' }, async ({ page, home, login }) => {
    await home.open();
    await home.openLogin();

    await expect(page).toHaveURL(/\/login$/);
    await expect(login.email).toBeVisible();
    await expect(login.password).toBeVisible();
    await expect(login.submit).toHaveText('Masuk');
  });
});
