import type { ShareNetwork } from '../../src/pages/ArticlePage';
import { expect, test } from '../../fixtures';

/** The kumparan article URL carried inside a share URL (WhatsApp puts it in `text`, the others in a param). */
function sharedArticleUrl(shareUrl: string, param: string): URL {
  const value = new URL(shareUrl).searchParams.get(param) ?? '';
  const match = value.match(/https:\/\/(m\.)?kumparan\.com\/\S+/);
  expect(match, `kumparan URL inside "${param}" of ${shareUrl}`).not.toBeNull();
  return new URL(match![0]);
}

test.describe('Share', { tag: '@guest' }, () => {
  test.beforeEach(async ({ article, articlePath, openedWindows }) => {
    void openedWindows; // installs the window.open stub before the page loads
    await article.open(articlePath);
  });

  test('TC-SHR-001 WhatsApp share opens with the article title and URL', { tag: '@smoke' }, async ({ article, openedWindows }) => {
    const title = (await article.title.innerText()).trim();
    const id = article.articleId();

    await article.whatsappShare.click();

    await expect.poll(openedWindows).toHaveLength(1);
    const [shareUrl] = await openedWindows();
    expect(new URL(shareUrl).hostname).toBe('api.whatsapp.com');
    expect(new URL(shareUrl).searchParams.get('text')).toContain(title);
    expect(sharedArticleUrl(shareUrl, 'text').pathname).toContain(id);
  });

  test('TC-SHR-005 shared URL carries the platform UTM parameters', async ({ article, openedWindows, platform }) => {
    await article.whatsappShare.click();

    await expect.poll(openedWindows).toHaveLength(1);
    const shared = sharedArticleUrl((await openedWindows())[0], 'text');
    expect(shared.searchParams.get('utm_source')).toBe(platform === 'desktop' ? 'Desktop' : 'Mobile');
    expect(shared.searchParams.get('utm_medium')).toBe('wa');
    expect(shared.searchParams.get('shareID')).toMatch(/^\w+$/);
  });

  test('TC-SHR-002 copy link copies the article URL', async ({ page, context, article, browserName }) => {
    const id = article.articleId();
    await expect(article.copyLinkSource).toHaveAttribute('data-clipboard-text', new RegExp(`^https://kumparan\\.com/\\w+/${id}\\?`));

    test.skip(browserName !== 'chromium', 'clipboard read is only supported in Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await article.copyLink.click();

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(id);
  });

  test('TC-SHR-003 share modal lists all channels and closes', async ({ article }) => {
    await article.openShareModal();

    for (const label of ['WhatsApp', 'Facebook', 'X', 'Line', 'Salin', 'Laporkan Tulisan'] as const) {
      await expect(article.shareLabel(label)).toBeVisible();
    }

    await article.shareModalClose.click();
    await expect(article.shareButton('fb')).toHaveCount(0);
  });

  const NETWORKS: { network: ShareNetwork; name: string; host: string; param: string; medium: string; knownDefect?: string }[] = [
    { network: 'fb', name: 'Facebook', host: 'www.facebook.com', param: 'u', medium: 'fb',
      knownDefect: 'DEF-004: the article URL in `u` is not URL-encoded, so utm_medium/shareID leak into the sharer URL' },
    { network: 'twitter', name: 'X', host: 'twitter.com', param: 'url', medium: 'tw' },
    { network: 'line', name: 'Line', host: 'social-plugins.line.me', param: 'url', medium: 'line' },
  ];

  for (const { network, name, host, param, medium, knownDefect } of NETWORKS) {
    test(`TC-SHR-004 ${name} share URL contains the encoded article URL`, async ({ article, openedWindows }) => {
      if (knownDefect) test.fail(true, knownDefect);
      const id = article.articleId();
      await article.openShareModal();

      await article.shareButton(network).click();

      await expect.poll(openedWindows).toHaveLength(1);
      const [shareUrl] = await openedWindows();
      expect(new URL(shareUrl).hostname).toBe(host);
      const shared = sharedArticleUrl(shareUrl, param);
      expect(shared.pathname).toContain(id);
      expect(shared.searchParams.get('utm_medium'), 'UTM medium survives inside the shared URL').toBe(medium);
    });
  }
});
