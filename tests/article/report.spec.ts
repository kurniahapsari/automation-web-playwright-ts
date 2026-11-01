import { REPORT_REASONS } from '../../src/pages/ReportPage';
import { expect, test } from '../../fixtures';

const OTHER = REPORT_REASONS.indexOf('Lainnya');

// The report is never submitted ("Laporkan" is never clicked); submissionGuard fails the test if one is sent.
test.describe('Report article', { tag: '@guest' }, () => {
  test.beforeEach(async ({ article, articlePath, report, submissionGuard }) => {
    void submissionGuard;
    await article.open(articlePath);
    await article.openReportForm();
    await expect(report.heading).toBeVisible();
  });

  test('TC-RPT-001 report form shows the reasons and actions', { tag: '@smoke' }, async ({ report }) => {
    await expect(report.heading).toBeVisible();
    await expect(report.reasons).toHaveText(REPORT_REASONS.map((r) => new RegExp(r.replace(/[,()]/g, '\\$&'))));
    await expect(report.cancel).toHaveText('Batal');
    await expect(report.submit).toHaveText('Laporkan');
    await expect(report.submit).toBeDisabled();
  });

  test('TC-RPT-002 choosing a reason enables Laporkan; only one reason at a time', async ({ report }) => {
    await report.reason(0).click();
    await expect(report.reasonInput(0)).toBeChecked();
    await expect(report.submit).toBeEnabled();

    await report.reason(1).click();
    await expect(report.reasonInput(1)).toBeChecked();
    await expect(report.reasonInput(0)).not.toBeChecked();
    await expect(report.submit).toBeEnabled();
  });

  test('TC-RPT-003 Lainnya requires a written reason', async ({ report }) => {
    await report.reason(OTHER).click();

    await expect(report.otherReason).toBeVisible();
    await expect(report.otherReason).toHaveAttribute('placeholder', 'Tulis alasan anda...');
    await expect(report.submit).toBeDisabled();

    await report.otherReason.fill('a');
    await expect(report.counter).toHaveText('1/80');
    await expect(report.submit).toBeEnabled();
  });

  test('TC-RPT-004 Lainnya rejects a whitespace-only reason', async ({ page, report }, testInfo) => {
    test.fail(true, 'Known defect DEF-001: a whitespace-only reason enables "Laporkan"');
    await report.reason(OTHER).click();

    await report.otherReason.fill('   ');

    const evidence = testInfo.outputPath('DEF-001_report_whitespace.png');
    await report.submit.scrollIntoViewIfNeeded();
    await page.screenshot({ path: evidence });
    await testInfo.attach('DEF-001 evidence', { path: evidence, contentType: 'image/png' });
    await expect(report.submit).toBeDisabled({ timeout: 3_000 });
  });

  test('TC-RPT-005 Lainnya reason is limited to 80 characters', async ({ report }) => {
    await report.reason(OTHER).click();

    await report.otherReason.pressSequentially('x'.repeat(81));

    await expect(report.otherReason).toHaveValue('x'.repeat(80));
    await expect(report.counter).toHaveText('80/80');
  });

  test('TC-RPT-006 Batal leaves the report form without reporting', async ({ page, report, article }) => {
    await report.reason(0).click();

    await report.cancel.click();

    await expect(page).not.toHaveURL(/\/report\//);
    await expect(article.title).toBeVisible();
  });
});
