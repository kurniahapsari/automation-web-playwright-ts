import { expect, test } from '../../fixtures';

test.describe('Search', { tag: '@guest' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('TC-SRCH-001 popular keyword returns relevant stories', { tag: '@smoke' }, async ({ page, search, platform }) => {
    await search.search('jokowi');

    await expect(page).toHaveURL(/\/search\/jokowi$/);
    if (platform === 'desktop') await expect(search.pageTitle).toHaveText('Hasil Pencarian');
    await expect(search.storyTab).toBeVisible();
    await expect(search.results.first()).toBeVisible();
    await expect(search.resultTitles().filter({ hasText: /jokowi/i }).first()).toBeVisible();
  });

  test('TC-SRCH-002 no matches shows the empty state', async ({ search }) => {
    await search.search('zxqvbnmlkjhg12345');

    await expect(search.notFound).toContainText('Story tidak ditemukan');
    await expect(search.results).toHaveCount(0);
  });

  test('TC-SRCH-003 script input is treated as text', async ({ page, search }) => {
    const probe = '<script>alert(1)</script>';
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await search.search(probe);

    await expect(page).toHaveURL(/\/search\/%3Cscript%3Ealert\(1\)%3C%2Fscript%3E$/);
    await expect(search.input).toHaveValue(probe);
    await expect(search.notFound.or(search.results.first())).toBeVisible();
    expect(dialogs, 'no script executed').toEqual([]);
  });

  test('TC-SRCH-004 empty search does not break the page', async ({ page, search, platform }) => {
    if (platform === 'mobile') await page.getByTestId('hd-search').click();

    await search.input.fill('');
    await search.input.press('Enter');

    // Allowed outcomes: stay on the page, or land on the search page — never a results/error page for "".
    await expect(page).toHaveURL(/\/(search)?$/);
    await expect(search.input).toBeVisible();
    await expect(search.input).toHaveValue('');
    await expect(page.getByTestId('not-found-page')).toBeHidden();
  });

  test('TC-SRCH-005 300-character keyword is handled gracefully', async ({ page, search }) => {
    const responses: number[] = [];
    page.on('response', (r) => r.request().isNavigationRequest() && responses.push(r.status()));

    await search.search('a'.repeat(300));

    await expect(search.notFound.or(search.results.first())).toBeVisible();
    expect(responses.filter((s) => s >= 500), 'no server error').toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(1);
  });

  test('TC-SRCH-007 special and unicode characters are encoded correctly', async ({ page, search }) => {
    for (const term of ['kopi & teh', 'café']) {
      await test.step(term, async () => {
        await search.search(term);
        await expect(page).toHaveURL(new RegExp(`/search/${encodeURIComponent(term).replace(/[()]/g, '\\$&')}$`));
        await expect(search.input).toHaveValue(term);
        await expect(search.notFound.or(search.results.first())).toBeVisible();
      });
    }
  });

  test('TC-SRCH-008 mobile search icon opens search and returns results', async ({ page, search, platform }) => {
    test.skip(platform !== 'mobile', 'search icon entry point is mobile only');

    await page.getByTestId('hd-search').click();
    await expect(page).toHaveURL(/\/search$/);
    await search.search('jokowi');

    await expect(search.results.first()).toBeVisible();
  });
});
