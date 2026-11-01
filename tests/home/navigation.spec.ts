import { BASE_URLS } from '../../src/config/env';
import { expect, test } from '../../fixtures';

test.describe('Homepage and navigation', { tag: '@guest' }, () => {
  test('TC-HOME-001 homepage loads its core sections', { tag: '@smoke' }, async ({ page, home }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(home.logo).toBeVisible();
    await expect(home.searchEntry).toBeVisible();
    await expect(home.storyCards.first()).toBeVisible();
  });

  test('TC-HOME-005 opening a story card shows the same article', { tag: '@smoke' }, async ({ page, home, article }) => {
    await home.open();
    const story = await home.storyAt(0);
    expect(story.title).not.toBe('');

    await page.goto(story.href);

    await expect(article.title).toHaveText(story.title);
  });

  test('TC-HOME-002 desktop channel bar opens a channel', async ({ page, home, platform }) => {
    test.skip(platform !== 'desktop', 'channel bar is desktop only; mobile uses the sidebar (TC-HOME-003)');
    await home.open();

    await home.channelLink('Bisnis').click();

    await expect(page).toHaveURL(/\/channel\/bisnis\/?$/);
    await expect(page.locator('a[href]').filter({ has: page.getByTestId('title') }).first()).toBeVisible();
  });

  test('TC-HOME-006 Lihat lainnya opens the full trending list', async ({ page, home, platform }) => {
    test.skip(platform !== 'desktop', 'the mobile feed has per-section arrows instead');
    await home.open();
    await expect(home.seeMore).toHaveText(/Lihat lainnya/);

    await home.seeMore.click();

    await expect(page).toHaveURL(/\/trending\/?$/);
    await expect(page.locator('a[href]').filter({ has: page.getByTestId('title') }).first()).toBeVisible();
  });

  test('TC-HOME-003 mobile burger menu opens and closes the sidebar', async ({ home, platform }) => {
    test.skip(platform !== 'mobile', 'burger menu is mobile only');
    await home.open();

    await home.burgerMenu.click();
    for (const item of ['masuk', 'beranda', 'trending']) {
      await expect(home.sidebarItem(item)).toBeInViewport();
    }

    await home.closeSidebar.click();
    await expect(home.sidebarItem('beranda')).not.toBeInViewport();
  });

  test('TC-HOME-004 mobile navigation strip opens Trending', async ({ page, home, platform }) => {
    test.skip(platform !== 'mobile', 'the nb-* navigation strip is mobile only');
    await home.open();

    await home.navStrip('trending').click();

    await expect(page).toHaveURL(/\/trending\/?$/);
    await expect(page.locator('a[href]').filter({ has: page.getByTestId('title') }).first()).toBeVisible();
  });

  test('TC-HOME-009 mobile UA is redirected to m.kumparan.com with the same path', async ({ page, platform, articlePath, article }) => {
    test.skip(platform !== 'mobile', 'redirect applies to mobile user agents');

    await page.goto(new URL(articlePath, BASE_URLS.desktop).toString());

    await expect(page).toHaveURL(new URL(articlePath, BASE_URLS.mobile).toString());
    await expect(article.title).toBeVisible();
  });
});
