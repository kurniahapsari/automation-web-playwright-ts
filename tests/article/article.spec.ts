import { expect, test } from '../../fixtures';

const PUBLISH_DATE = /^\d{1,2} (Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) \d{4} \d{2}:\d{2} WIB$/;

test.describe('Article page', { tag: '@guest' }, () => {
  test('TC-ART-001 shows title, channel, author, date and body', { tag: '@smoke' }, async ({ article, articlePath }) => {
    await article.open(articlePath);

    await expect(article.title).not.toBeEmpty();
    await expect(article.channel).toBeVisible();
    await expect(article.author).toBeVisible();
    await expect(article.publishDate).toHaveText(PUBLISH_DATE);
    await expect(article.readingTime).toContainText(/baca/i);
    await expect(article.paragraphs.first()).not.toBeEmpty();
    await expect(article.likeButton).toBeVisible();
    await expect(article.commentButton).toBeVisible();
    await expect(article.shareBar).toBeVisible();
  });

  test('TC-ART-006 article renders when ad/3rd-party requests fail', async ({ page, article, articlePath }) => {
    // Ad/analytics domains are aborted by the default `blockAds` fixture; assert that is the case.
    const failed: string[] = [];
    page.on('requestfailed', (r) => failed.push(r.url()));

    await article.open(articlePath);

    await expect(article.paragraphs.first()).toBeVisible();
    await expect(article.likeButton).toBeVisible();
    expect(failed.some((url) => /doubleclick|googletag|googlesyndication/.test(url)), 'ad requests were blocked').toBe(true);
  });

  test('TC-ART-002 topic tag opens the topic page', async ({ page, article, articlePath }) => {
    await article.open(articlePath);
    const tag = article.topicTags.first();
    await tag.scrollIntoViewIfNeeded();
    await expect(tag).toBeVisible();
    const href = await tag.getAttribute('href');
    expect(href).toMatch(/^\/topic\/[a-z0-9-]+$/);

    // Lazy images above keep moving the footer ("element is not stable"), so follow the link's target.
    await page.goto(href!);

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId(/^(news-item|story-result-card|list-item-card|news-card)$/).first()).toBeVisible();
  });

  test.describe('404', () => {
    const MISSING = '/kumparannews/artikel-tidak-ada-qa-test-0000000000x';

    test('TC-ART-004 unknown article slug shows the 404 page', async ({ page }) => {
      const response = await page.goto(MISSING);

      expect(response?.status()).toBe(404);
      await expect(page.getByTestId('not-found-page')).toContainText('Maaf, halaman tidak ditemukan');
      await expect(page.getByTestId('back-to-home')).toBeVisible();
    });

    test('TC-ART-005 Lihat konten lain returns home', async ({ page, home, baseURL }) => {
      await page.goto(MISSING);

      await page.getByTestId('back-to-home').click();

      await expect(page).toHaveURL(new RegExp(`^${baseURL}/?$`));
      await expect(home.storyCards.first()).toBeVisible();
    });
  });
});
