import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export const REPORT_REASONS = [
  'Spam, Komersial, atau Iklan',
  'Memiliki unsur pornografi',
  'Membahayakan atau menjurus tindakan berbahaya',
  'Mengandung konten kekerasan',
  'Menyinggung SARA',
  'Lainnya',
] as const;

/** /report/story/{slug}-{id}. The "Laporkan" submit button is never clicked by automation. */
export class ReportPage extends BasePage {
  readonly heading = this.page.getByText('Laporkan Konten', { exact: true });
  readonly reasons = this.page.getByTestId(/^radio-btn-option-report-\d$/);
  readonly otherReason = this.page.getByTestId('input-report');
  readonly counter = this.page.getByText(/^\d+\/80$/);
  readonly cancel = this.page.getByTestId('btn-cancel');
  readonly submit = this.page.getByTestId('btn-report');

  reason(index: number): Locator {
    return this.page.getByTestId(`radio-btn-option-report-${index}`);
  }

  /** Options are <label> wrapping an <input type=checkbox>, used as a single-select group. */
  reasonInput(index: number): Locator {
    return this.reason(index).locator('input');
  }
}
