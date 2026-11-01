import type { BrowserContext, Request } from '@playwright/test';

/**
 * Ads and analytics are not part of the system under test, and on kumparan they cause layout
 * shifts and click interception (see Task A, OBS-01). Blocking them makes runs faster and stable.
 * Cloudflare (Turnstile) and kumparan's own domains are never blocked.
 */
const THIRD_PARTY_NOISE = new RegExp(
  [
    'doubleclick\\.net', 'googlesyndication\\.com', 'googletagservices\\.com', 'googletagmanager\\.com',
    'google-analytics\\.com', 'adservice\\.google\\.', 'pagead2\\.', 'imasdk\\.googleapis\\.com',
    'amazon-adsystem\\.com', 'criteo\\.(com|net)', 'taboola\\.com', 'outbrain\\.com', 'adsrvr\\.org',
    'pubmatic\\.com', 'rubiconproject\\.com', 'openx\\.net', 'teads\\.tv', 'smartadserver\\.com',
    'scorecardresearch\\.com', 'chartbeat\\.(com|net)', 'hotjar\\.com', 'clarity\\.ms',
    'connect\\.facebook\\.net', 'analytics\\.tiktok\\.com', 'onesignal\\.com', 'moengage\\.com',
  ].join('|'),
);

export async function blockThirdPartyNoise(context: BrowserContext): Promise<void> {
  await context.route(THIRD_PARTY_NOISE, (route) => route.abort('blockedbyclient'));
}

/**
 * Safety net for the rule "never actually submit comments or reports".
 * Any write request that looks like a comment/report submission is aborted and recorded,
 * and the owning fixture fails the test. Tests never click submit; this only catches mistakes.
 */
export class SubmissionGuard {
  readonly blocked: string[] = [];

  static isSubmission(request: Request): boolean {
    if (request.method() === 'GET' || request.method() === 'OPTIONS') return false;
    const target = `${request.url()} ${request.postData() ?? ''}`;
    const isMutation = /\bmutation\b/i.test(target) || /\/(comments?|reports?|responses?)\b/i.test(request.url());
    return isMutation && /comment|response|report/i.test(target);
  }

  async attach(context: BrowserContext): Promise<void> {
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (SubmissionGuard.isSubmission(request)) {
        this.blocked.push(`${request.method()} ${request.url()}`);
        return route.abort('blockedbyclient');
      }
      return route.fallback();
    });
  }
}
