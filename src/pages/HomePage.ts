import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly logo = this.page.getByTestId('hd-logo').first();
  /** Feed cards: headline-card (both sites), news-item and trending-story-item (desktop). */
  readonly storyCards = this.page.getByTestId(/^(news-item|headline-card|trending-story-item)$/);
  /** "Lihat lainnya" at the end of the desktop feed (a link, not an infinite load-more). */
  readonly seeMore = this.page.getByTestId('ft-loadmore');

  // Desktop header
  readonly desktopLoginButton = this.page.getByTestId('hd-login');
  readonly channelBar = this.page.getByTestId('main-menu');

  // Mobile header, sidebar and the navigation strip under the header (nb-*)
  readonly burgerMenu = this.page.getByTestId('burger-menu');
  readonly closeSidebar = this.page.getByTestId('close-sidebar');
  readonly sidebarLogin = this.page.getByTestId('label-list-item-masuk');

  readonly searchEntry = this.byPlatform(this.page.getByTestId('input-search'), this.page.getByTestId('hd-search'));

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.logo.waitFor();
  }

  sidebarItem(label: string): Locator {
    return this.page.getByTestId(`label-list-item-${label}`);
  }

  navStrip(id: 'top-news' | 'video-story' | 'audio-story' | 'trending'): Locator {
    return this.page.getByTestId(`nb-${id}`);
  }

  channelLink(name: string): Locator {
    return this.channelBar.getByRole('link', { name, exact: true });
  }

  /**
   * Path + title of the n-th fully loaded story link in the feed (skips "Sedang memuat..." placeholders).
   * Story links are the anchors that wrap a data-qa-id="title" element.
   */
  async storyAt(index: number): Promise<{ href: string; title: string }> {
    const stories = this.page.locator('a[href]').filter({ has: this.page.getByTestId('title') });
    const loaded = async () =>
      (await stories.evaluateAll((links) =>
        links
          .map((a) => ({
            href: new URL((a as HTMLAnchorElement).href).pathname,
            title: a.querySelector('[data-qa-id="title"]')?.textContent?.trim() ?? '',
          }))
          .filter((s) => /^\/kumparan[a-z0-9]*\/[a-z0-9-]+-[0-9A-Za-z]{11}$/.test(s.href) && s.title && !/sedang memuat/i.test(s.title)),
      ));
    await expect.poll(async () => (await loaded()).length, { message: 'loaded story links' }).toBeGreaterThan(index);
    return (await loaded())[index];
  }

  async openLogin(): Promise<void> {
    if (this.isMobile) {
      await this.burgerMenu.click();
      await this.sidebarLogin.click();
    } else {
      await this.desktopLoginButton.click();
    }
  }

  // Logged-in markers. The desktop header renders the guest "Masuk" button first and swaps it for the
  // avatar a few seconds later (Task A, OBS-09), so only positive markers are trusted.
  readonly desktopAvatar = this.page.getByTestId('hd-pic-user').first();
  /** The link and its icon both carry data-qa-id="log-out". */
  readonly desktopLogout = this.page.getByRole('link').and(this.page.getByTestId('log-out'));
  readonly sidebarLogout = this.page.getByTestId('label-list-item-keluar');

  async expectLoggedIn(): Promise<void> {
    if (this.isMobile) {
      await this.burgerMenu.click();
      await expect(this.sidebarLogout).toBeVisible();
      await expect(this.sidebarLogin).toHaveCount(0);
      await this.closeSidebar.click();
    } else {
      await expect(this.desktopAvatar).toBeVisible({ timeout: 20_000 });
      await expect(this.desktopLoginButton).toHaveCount(0);
    }
  }

  /** Logged out, judged by the server: /login shows the form to guests and redirects logged-in users. */
  async expectLoggedOut(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(this.page.getByTestId('input-email')).toBeVisible();
  }

  /** Desktop: avatar menu → "Keluar". Mobile: sidebar → "Keluar". Confirms the dialog if one appears. */
  async logout(): Promise<void> {
    if (this.isMobile) {
      await this.burgerMenu.click();
      await this.sidebarLogout.click();
    } else {
      await this.desktopAvatar.click();
      await this.desktopLogout.click();
    }
    const confirm = this.page.getByRole('button', { name: /^(ya|keluar)/i });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
  }
}
