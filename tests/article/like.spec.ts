import type { ArticlePage } from '../../src/pages/ArticlePage';
import { authTest, expect } from '../../fixtures';

/**
 * Leaves the article unliked on the server. A quick like → unlike is sometimes lost server-side even though
 * both mutations return 200 (Task A, DEF-005), so the state is re-read after it has had time to settle,
 * and the cleanup repeats until the server agrees. Tests only use articles published in the last hours,
 * so "not liked" is their original state.
 */
async function ensureUnliked(article: ArticlePage, path: string): Promise<void> {
  await expect(async () => {
    if (await article.openWithLikeState(path)) await article.toggleLike();
    await article.page.waitForTimeout(2_000); // settle time for the like mutation (DEF-005), cleanup only
    expect(await article.openWithLikeState(path), 'article not liked on the server').toBe(false);
  }).toPass({ timeout: 45_000 });
}

const test = authTest.extend<{ likeRestore: { article: ArticlePage; initialCount: number } }>({
  likeRestore: async ({ article, articlePath }, use) => {
    await ensureUnliked(article, articlePath); // precondition: article not liked yet
    await use({ article, initialCount: await article.likeCount() });
    await ensureUnliked(article, articlePath);
  },
});

// One account, shared state: like tests on a platform run one after another.
test.describe.configure({ mode: 'serial' });

test.describe('Like (logged in)', { tag: '@auth' }, () => {
  test('TC-LIKE-001 logged-in user likes an article', async ({ page, likeRestore: { article, initialCount } }) => {
    await article.toggleLike();

    await expect(page, 'no redirect to login').not.toHaveURL(/\/login/);
    await expect(article.likeIcon).toHaveAttribute('data-qa-id', 'like-active');
    expect(await article.likeCount()).toBe(initialCount + 1);
  });

  test('TC-LIKE-002 logged-in user removes a like', async ({ likeRestore: { article, initialCount } }) => {
    await article.toggleLike();
    await expect(article.likeIcon).toHaveAttribute('data-qa-id', 'like-active');

    await article.toggleLike();

    await expect(article.likeIcon).toHaveAttribute('data-qa-id', 'like');
    expect(await article.likeCount()).toBe(initialCount);
  });

  test('TC-LIKE-003 like state persists after reload', async ({ articlePath, likeRestore: { article, initialCount } }) => {
    await article.toggleLike();

    await article.openWithLikeState(articlePath);

    await expect(article.likeIcon).toHaveAttribute('data-qa-id', 'like-active');
    expect(await article.likeCount()).toBe(initialCount + 1);
  });
});
