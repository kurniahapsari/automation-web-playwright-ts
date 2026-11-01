import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type ShareNetwork = 'whatsapp' | 'fb' | 'twitter' | 'line' | 'copy-clipboard';

export class ArticlePage extends BasePage {
  readonly title = this.page.getByTestId('story-title');
  readonly channel = this.page.getByTestId('channel-name');
  readonly author = this.page.getByTestId('story-author');
  readonly publishDate = this.page.getByTestId('publish-date');
  readonly readingTime = this.page.getByTestId('reading-time');
  readonly paragraphs = this.page.getByTestId('story-paragraph');
  readonly breadcrumbHome = this.page.getByTestId('home-breadcrumb');
  readonly topicTags = this.page.getByTestId('tag-topic');

  readonly likeButton = this.page.getByTestId('btn-like');
  readonly commentButton = this.page.getByTestId('btn-comment');

  // Share bar under the title: icons are <img data-qa-id>, the clickable element is the wrapping div.
  readonly shareBar = this.page.getByTestId('share-wrapper');
  readonly whatsappShare = this.shareBar.getByTestId('sosmed-whatsapp-white');
  readonly copyLink = this.shareBar.getByTestId('copy-circle');
  readonly copyLinkSource = this.shareBar.locator('[data-clipboard-text]:has([data-qa-id="copy-circle"])');
  readonly whatsappShareTarget = this.shareBar.locator('[data-clipboard-text]:has([data-qa-id="sosmed-whatsapp-white"])');
  readonly moreShare = this.shareBar.getByTestId('more-vertical');

  /** "Laporkan tulisan" in the story footer (the share modal reuses the same data-qa-id). */
  readonly reportLink = this.page.getByTestId('btn-report').filter({ hasText: /laporkan tulisan/i, visible: true }).first();

  // "Bagikan" modal: buttons have data-qa-id, but the labels sit outside them, so labels are asserted by text.
  readonly shareModalClose = this.page.getByTestId('btn-close-modal');
  readonly shareModal = this.page.locator('div').filter({ has: this.shareModalClose })
    .filter({ hasText: 'Bagikan' }).filter({ hasText: 'Salin' }).last();

  async open(path: string): Promise<void> {
    await this.page.goto(path);
    await expect(this.title).toBeVisible();
  }

  shareLabel(label: 'WhatsApp' | 'Facebook' | 'X' | 'Line' | 'Salin' | 'Laporkan Tulisan'): Locator {
    return this.shareModal.getByText(label, { exact: true });
  }

  shareButton(network: ShareNetwork): Locator {
    return this.page.getByTestId(`share-${network}`).filter({ visible: true });
  }

  async openShareModal(): Promise<void> {
    await this.moreShare.click();
    await expect(this.shareButton('fb')).toBeVisible();
  }

  /** Icon inside the like button: "like" (not liked) or "like-active" (liked by the current user). */
  readonly likeIcon = this.likeButton.locator('img').first();

  /**
   * Opens an article as a logged-in user and returns whether the server says the user already likes it.
   * The icon shows "like" until IsCurrentUserLikeObjectIDAndObjectType returns and React re-renders,
   * so this waits for the icon to match the server's answer before anything reads it.
   */
  async openWithLikeState(path: string): Promise<boolean> {
    const likeState = this.page.waitForResponse((r) => /IsCurrentUserLike/.test(r.request().postData() ?? ''));
    await this.open(path);
    const body = (await (await likeState).json()) as { data?: Record<string, unknown> }[];
    const liked = body.some((entry) => entry.data?.IsCurrentUserLikeObjectIDAndObjectType === true);
    await expect(this.likeIcon).toHaveAttribute('data-qa-id', liked ? 'like-active' : 'like');
    return liked;
  }

  async isLiked(): Promise<boolean> {
    return (await this.likeIcon.getAttribute('data-qa-id')) === 'like-active';
  }

  /**
   * Clicks like/unlike and waits for the CreateLike / Unlike mutation to succeed. The UI updates
   * optimistically, so acting before the mutation returns (clicking again, reloading) cancels it.
   */
  async toggleLike(): Promise<void> {
    const mutation = this.page.waitForResponse((r) => /"operationName":"(CreateLike|Unlike)"/.test(r.request().postData() ?? ''));
    await this.likeButton.click();
    const response = await mutation;
    expect(response.status(), 'like mutation HTTP status').toBe(200);
    expect((await response.json()).errors, 'like mutation GraphQL errors').toBeUndefined();
  }

  /** Like count is the button's text, e.g. "0" or "12". */
  async likeCount(): Promise<number> {
    const text = (await this.likeButton.innerText()).trim();
    expect(/rb|jt|k/i.test(text), `like count "${text}" is abbreviated; pick a newer article`).toBe(false);
    return Number.parseInt(text.replace(/\D/g, '') || '0', 10);
  }

  /** Article id is the last URL segment after the slug, e.g. ...-28TwSD7PSVP. */
  articleId(): string {
    const match = new URL(this.page.url()).pathname.match(/-([0-9A-Za-z]{11})$/);
    expect(match, `article id in ${this.page.url()}`).not.toBeNull();
    return match![1];
  }

  /**
   * Opens the report form through the footer link's href. On mobile the truncated article can put a
   * "read more" overlay over the footer, so navigating by href keeps the test about the report form.
   */
  async openReportForm(): Promise<void> {
    const href = await this.reportLink.getAttribute('href');
    expect(href).toMatch(/^\/report\/story\/.+-[0-9A-Za-z]{11}$/);
    await this.page.goto(href!);
  }
}
