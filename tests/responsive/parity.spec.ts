import { expect, test } from '../../fixtures';

test.describe('Desktop / mobile parity', { tag: '@guest' }, () => {
  test.beforeEach(async ({ article, articlePath }) => {
    await article.open(articlePath);
  });

  test('TC-RSP-001 mobile article has no horizontal overflow', async ({ page, platform, article }) => {
    test.skip(platform !== 'mobile', 'mobile layout check');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    expect(overflow).toBeLessThanOrEqual(1);
    await expect(article.title).toBeInViewport();
  });

  test('TC-RSP-002 core article actions are reachable', { tag: '@smoke' }, async ({ article, platform }) => {
    const actions = {
      like: article.likeButton,
      comment: article.commentButton,
      share: article.whatsappShareTarget,
      report: article.reportLink,
    };

    for (const [name, control] of Object.entries(actions)) {
      await test.step(name, async () => {
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeVisible();
        await expect(control).toBeEnabled();
        if (platform === 'mobile') {
          const box = await control.boundingBox();
          expect(Math.max(box!.width, box!.height), `${name} touch target`).toBeGreaterThanOrEqual(24);
        }
      });
    }
  });
});
