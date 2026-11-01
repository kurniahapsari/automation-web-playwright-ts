import { expect, test } from '../../fixtures';

const DUMMY_PASSWORD = 'Dummy#12345'; // not a real credential

test.describe('Login form validation (client side)', { tag: '@guest' }, () => {
  test.beforeEach(async ({ login }) => {
    await login.open();
  });

  test('TC-AUTH-006 invalid email format shows inline validation', { tag: '@smoke' }, async ({ login }) => {
    await login.email.fill('bukan-email');
    await login.leave('email');

    await expect(login.emailError).toHaveText('Harus diisi dengan format email');
    await expect(login.submit).toBeDisabled();
  });

  test('TC-AUTH-007 empty email and password show required messages', async ({ login }) => {
    await login.email.focus();
    await login.leave('email');
    await login.password.focus();
    await login.leave('password');

    await expect(login.emailError).toHaveText('Tidak boleh kosong');
    await expect(login.passwordError).toHaveText('Tidak boleh kosong');
    await expect(login.submit).toBeDisabled();
  });

  test('TC-AUTH-008 shortest valid email format passes client validation', async ({ login }) => {
    await login.email.fill('a@b.co');
    await login.leave('email');

    await expect(login.emailError).toBeHidden();
  });

  test('TC-AUTH-009 overlong email is handled gracefully', async ({ page, login }) => {
    test.fail(true, 'Known defect DEF-003: a 262-character email is accepted with no validation message or length limit');
    const overlong = `${'a'.repeat(250)}@example.com`;
    await login.email.fill(overlong);
    await login.leave('email');

    const kept = (await login.email.inputValue()).length;
    const rejected = await login.emailError.isVisible();
    test.info().annotations.push({ type: 'observed', description: `kept ${kept}/${overlong.length} chars, error shown: ${rejected}` });
    expect(rejected || kept < overlong.length, 'either a validation message or a length limit').toBe(true);

    await test.step('form layout is intact', async () => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(login.submit).toBeInViewport();
    });
  });

  test('TC-AUTH-010 show/hide password toggle', async ({ login }) => {
    await login.password.fill(DUMMY_PASSWORD);
    await expect(login.password).toHaveAttribute('type', 'password');

    await login.passwordToggle.click();
    await expect(login.password).toHaveAttribute('type', 'text');
    await expect(login.password).toHaveValue(DUMMY_PASSWORD);

    await login.passwordToggle.click();
    await expect(login.password).toHaveAttribute('type', 'password');
  });

  test('TC-AUTH-011 Masuk stays disabled until bot verification passes', { tag: '@smoke' }, async ({ login }) => {
    await login.fill('qa.dummy@example.com', DUMMY_PASSWORD);
    await login.leave('password');

    await expect(login.emailError).toBeHidden();
    await expect(login.passwordError).toBeHidden();
    await expect(login.turnstile).toBeAttached();
    await expect(login.submit).toBeDisabled();
  });

  test('TC-AUTH-012 alternative login options are displayed', async ({ login }) => {
    await expect(login.facebook).toBeVisible();
    await expect(login.google).toBeVisible();
    await expect(login.phone).toBeVisible();
    await expect(login.register).toBeVisible();
  });

  test('TC-AUTH-013 Lupa Password opens the reset password page', async ({ page, login }) => {
    await login.forgotPassword.click();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByRole('textbox', { name: /email/i }).or(page.getByTestId('input-email'))).toBeVisible();
  });
});
