import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SearchPage extends BasePage {
  readonly input = this.page.getByTestId('input-search');
  /** Desktop shows a "Hasil Pencarian" title; the mobile results page starts with the result tabs. */
  readonly pageTitle = this.page.getByTestId('page-title');
  readonly storyTab = this.page.getByTestId('tab-story');
  readonly results = this.page.getByTestId('story-result-card');
  readonly notFound = this.page.getByTestId('story-not-found');

  /** Desktop searches from the header input; mobile opens /search from the header icon first. */
  async search(term: string): Promise<void> {
    if (this.isMobile && !/\/search/.test(this.page.url())) {
      await this.page.getByTestId('hd-search').click();
      await expect(this.page).toHaveURL(/\/search/);
    }
    await this.input.fill(term);
    await this.input.press('Enter');
  }

  resultTitles() {
    return this.results.getByTestId('title');
  }
}
