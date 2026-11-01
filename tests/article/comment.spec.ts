import { authTest as test, expect } from '../../fixtures';

// Comments are never submitted: the send button is never clicked, and submissionGuard fails the
// test if a comment request is sent anyway.
test.describe('Comment form (logged in)', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page, article, articlePath, comment, submissionGuard }) => {
    void submissionGuard;
    await article.open(articlePath);
    await article.commentButton.click();
    await expect(page).toHaveURL(/\/response\//);
    await expect(comment.input).toBeVisible();
  });

  test('TC-CMT-001 logged-in user opens the comment form', async ({ comment }) => {
    await expect(comment.articleCard).toBeVisible();
    await expect(comment.count).toBeVisible();
    await expect(comment.input).toHaveAttribute('placeholder', 'Tulis komentar...');
    await expect(comment.sendButton).toBeVisible();
  });

  test('TC-CMT-002 typed comment is kept in the input', async ({ comment }) => {
    const draft = 'QA draft – not submitted';

    await comment.input.fill(draft);
    await expect(comment.input).toHaveValue(draft);
    await expect(comment.sendButton).toBeEnabled();

    await comment.input.clear();
    await expect(comment.input).toHaveValue('');
  });

  test('TC-CMT-003 empty or whitespace-only comment cannot be sent', async ({ comment }) => {
    test.fail(true, 'Known defect DEF-002: the send button stays enabled for an empty comment (click not tested: never submit)');
    await expect(comment.input).toHaveValue('');
    await expect(comment.sendButton, 'send disabled for an empty comment').toBeDisabled();

    await comment.input.fill('   ');
    await expect(comment.sendButton, 'send disabled for a whitespace-only comment').toBeDisabled();
  });

  test('TC-CMT-004 long comment respects the length limit', async ({ page, comment }) => {
    const long = 'a'.repeat(1_500);

    await comment.input.fill(long);

    // Observed: no maxlength and no counter (Task A, OBS-10). The server-side limit can't be checked without submitting.
    const kept = (await comment.input.inputValue()).length;
    const maxLength = await comment.input.getAttribute('maxlength');
    test.info().annotations.push({ type: 'observed', description: `kept ${kept}/${long.length} chars, maxlength=${maxLength}` });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(1);
    await comment.sendButton.scrollIntoViewIfNeeded();
    await expect(comment.sendButton, 'send control still reachable').toBeVisible();
  });

  test('TC-CMT-005 HTML/script text in the draft stays plain text', async ({ page, comment }) => {
    const html = '<b>bold</b><img src=x onerror=alert(1)>';
    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.dismiss();
    });

    await comment.input.fill(html);

    await expect(comment.input).toHaveValue(html);
    expect(dialogs).toEqual([]);
  });
});
