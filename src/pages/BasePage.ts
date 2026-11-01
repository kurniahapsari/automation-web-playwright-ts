import type { Locator, Page } from '@playwright/test';
import type { Platform } from '../config/env';

export abstract class BasePage {
  constructor(
    readonly page: Page,
    readonly platform: Platform,
  ) {}

  get isMobile(): boolean {
    return this.platform === 'mobile';
  }

  /** Picks the locator for the current platform; desktop and mobile are separate sites. */
  protected byPlatform(desktop: Locator, mobile: Locator): Locator {
    return this.isMobile ? mobile : desktop;
  }
}
