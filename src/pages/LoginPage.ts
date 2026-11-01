import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly email = this.page.getByTestId('input-email');
  readonly password = this.page.getByTestId('input-password');
  readonly emailError = this.page.getByTestId('input-email-errorMessage');
  readonly passwordError = this.page.getByTestId('input-password-errorMessage');
  /** Toggle icon is "eye-off" while the password is hidden and "eye" while it is shown. */
  readonly passwordToggle = this.page.getByTestId(/^eye(-off)?$/);
  readonly submit = this.page.getByTestId('btn-save');
  readonly forgotPassword = this.page.getByTestId('btn-forgot-password');
  readonly facebook = this.page.getByTestId('btn-login-fb');
  readonly google = this.page.getByTestId('btn-login-google');
  readonly phone = this.page.getByTestId('btn-login-phone');
  readonly register = this.page.getByTestId('btn-register');
  /** Cloudflare Turnstile widget. Never interacted with by automation. */
  readonly turnstile = this.page.locator('iframe[src*="challenges.cloudflare.com"], [name="cf-turnstile-response"]').first();

  async open(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.email).toBeVisible();
  }

  async fill(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
  }

  /** Triggers the field's blur validation. */
  async leave(field: 'email' | 'password'): Promise<void> {
    await (field === 'email' ? this.email : this.password).blur();
  }

  /**
   * Waits until "Masuk" is enabled, i.e. until a human (or Cloudflare itself) has passed Turnstile.
   * Automation never clicks or solves the challenge.
   */
  async waitForHumanVerification(timeout = 3 * 60_000): Promise<void> {
    console.log(
      `\n>>> [${this.platform}] Tick "Verify you are human" in the browser window (do not close it; the script clicks "Masuk").` +
        '\n>>> Waiting up to 3 minutes. If Cloudflare keeps failing, stop and rerun with AUTH_CHANNEL=chrome.\n',
    );
    await expect(this.submit).toBeEnabled({ timeout });
  }
}
