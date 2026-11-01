import { BasePage } from './BasePage';

/** /{channel}/response/{slug}-{id}. The send button is never clicked by automation. */
export class CommentPage extends BasePage {
  readonly section = this.page.getByTestId('comment-section');
  readonly articleCard = this.page.getByTestId('selected-commented-card');
  readonly input = this.page.getByTestId('input-comment').locator('textarea');
  readonly sendButton = this.page.getByTestId('btn-send-comment');
  readonly emptyState = this.page.getByTestId('no-comment');
  readonly count = this.page.getByText(/^\d+ Komentar$/);
}
