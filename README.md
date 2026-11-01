# kumparan-web-playwright

Playwright + TypeScript end-to-end tests for **kumparan.com (desktop)** and **m.kumparan.com (mobile)**. This is Task B of the kumparan QA Engineer skill test.

The tests automate the test cases designed in Task A. Every test title starts with its Task A ID (e.g. `TC-SHR-004`), so results trace straight back to the workbook.

| Part of the submission | Link |
|---|---|
| Task A: test cases & risk analysis (XLSX) | `docs/kumparan-qa-test-cases.xlsx` · Google Sheets: `<GOOGLE_SHEETS_LINK>` |
| Task B: Playwright web tests | this repo |
| Task C: Playwright Agents | `<TASK_C_REPO_URL>` |
| Task D: GraphQL API tests | `<TASK_D_REPO_URL>` |

## Quick start

```bash
npm ci
npx playwright install chromium
npm test                  # guest suite on desktop + mobile (logged-in tests skip until you save a session)
npm run report            # open the HTML report
```

### Logged-in tests (like, comment, session, logout)

The kumparan login form is protected by **Cloudflare Turnstile**. The suite does **not** bypass it: a human logs in, and the session is reused. The sessions live in `.auth/*.json` (gitignored). Two ways to create them:

**A. `npm run auth:save`**: the human ticks Turnstile in the Playwright window.

```bash
cp .env.example .env      # fill KUMPARAN_EMAIL / KUMPARAN_PASSWORD (email/password account, not SSO)
npm run auth:save         # opens desktop, then mobile; tick "Verify you are human" in each window
npm test                  # now also runs the @auth tests
```

On kumparan production this did not work: Turnstile never passed in the Playwright-controlled browser (Chromium or `AUTH_CHANNEL=chrome`), which is exactly what it is designed to detect. The option is kept for environments where it passes (e.g. staging with a Turnstile test key).

**B. `npm run auth:import`** (used for this submission): reuse a manual login from your normal browser.

1. Log in to https://kumparan.com in your normal browser.
2. Copy the Cookie request header:
   - Open DevTools → Network.
   - Reload the page and select the first `kumparan.com` document request.
   - Under Request Headers, copy the value of `cookie`.
3. Run `npm run auth:cookie` (macOS): it writes the clipboard into `.env` as `KUMPARAN_COOKIE` without printing it (gitignored; treat it like a password).
4. Run `npm run auth:import`. It writes `.auth/desktop.json` and `.auth/mobile.json` and checks that both sites show you as logged in.

Cloudflare's own cookies (`cf_clearance`, `__cf_bm`, …) are dropped, so only kumparan's login session is reused; no bot check is bypassed. Both A and B are TC-AUTH-001.

Note: desktop and mobile share that one session, and `TC-AUTH-003` (logout) ends it. That logs your browser out too, and the other platform's logout test then needs a fresh import. Run them one platform at a time: `npx playwright test --project=logout-desktop --no-deps`.

### Useful commands

| Command | What it runs |
|---|---|
| `npm run test:desktop` / `npm run test:mobile` | one platform |
| `npm run test:smoke` | `@smoke` subset |
| `npm run test:guest` / `npm run test:auth` | by access level |
| `npm run test:human` | `@human` tests: invalid-account login rejection (headed; you solve Turnstile per attempt) |
| `npm run test:flaky-check` | smoke suite × 3 (`--repeat-each=3`) |
| `WEBKIT=1 npx playwright test --project=mobile-safari` | optional iPhone/WebKit run (`npx playwright install webkit` first) |
| `npm run typecheck` | `tsc --noEmit` |

## How it is built

```
playwright.config.ts      projects: discover → desktop-chrome + mobile-chrome → logout-*; auth-* (human-in-the-loop)
fixtures/index.ts         test / authTest: platform, page objects, articlePath, ad blocking, submissionGuard, window.open stub
src/config/env.ts         base URLs, .env credentials, session file paths
src/pages/                HomePage, LoginPage, SearchPage, ArticlePage, CommentPage, ReportPage (platform-aware)
src/support/network.ts    third-party/ad blocking + SubmissionGuard (never submit comments/reports)
scripts/import-session.setup.ts  TC-AUTH-001 (auth:import): session from a manual browser login, verified on both sites
scripts/save-auth.setup.ts  TC-AUTH-001 (auth:save): human solves Turnstile in the Playwright window
scripts/cookie-from-clipboard.mjs  auth:cookie: clipboard → KUMPARAN_COOKIE in .env, never printed
tests/discover-articles.setup.ts  collects live article links once per run
tests/**.spec.ts          specs grouped by feature
docs/STRATEGY.md          parallelism, data cleanup, timeouts, retries, flaky handling, locator strategy
```

- **Locators**: `testIdAttribute: 'data-qa-id'`, so `page.getByTestId('btn-like')`. Where kumparan has no unique `data-qa-id`, the fallbacks are documented in [docs/STRATEGY.md §7](docs/STRATEGY.md#7-locator-strategy-data-qa-id-first).
- **Desktop vs mobile**: the sites differ (header input vs search icon, channel bar vs burger menu and the navigation strip under the header). Page objects pick the right locator from the `platform` option; tests only express behaviour.
- **Safety on production**:
  - likes are undone after each test and confirmed against the server;
  - comments and reports are never submitted (enforced by `submissionGuard`);
  - only one wrong-password attempt runs per run;
  - logout runs last.

## Coverage (Task A → spec)

| Spec | Test cases | Access |
|---|---|---|
| `tests/guest/authorization.spec.ts` | TC-AUTHZ-001, 002, 004 | guest |
| `tests/auth/login-validation.spec.ts` | TC-AUTH-006 … 013 | guest |
| `tests/auth/login-human-assisted.spec.ts` | TC-AUTH-004, 005 | human (Turnstile) |
| `scripts/import-session.setup.ts`, `scripts/save-auth.setup.ts` | TC-AUTH-001 | human login |
| `tests/auth/session.spec.ts` | TC-AUTH-002, 014 | logged in |
| `tests/auth/logout.spec.ts` | TC-AUTH-003, 015 | logged in, runs last |
| `tests/home/navigation.spec.ts` | TC-HOME-001 … 006, 009 | guest |
| `tests/search/search.spec.ts` | TC-SRCH-001 … 005, 007, 008 | guest |
| `tests/article/article.spec.ts` | TC-ART-001, 002, 004, 005, 006 | guest |
| `tests/article/share.spec.ts` | TC-SHR-001 … 005 | guest |
| `tests/article/report.spec.ts` | TC-RPT-001 … 006 | guest (never submitted) |
| `tests/article/like.spec.ts` | TC-LIKE-001 … 003 | logged in (state restored) |
| `tests/article/comment.spec.ts` | TC-CMT-001 … 005 | logged in (never submitted) |
| `tests/responsive/parity.spec.ts` | TC-RSP-001, 002 | guest |

Test cases marked *Manual only* or *Backlog (automatable)* in the workbook are deliberately not here (P2–P3, or they need SSO, a second account, or live ad timing).

## Known defects (kept visible with `test.fail`)

| Defect | Test | Summary |
|---|---|---|
| DEF-001 | TC-RPT-004 | A report reason of only spaces enables "Laporkan" |
| DEF-002 | TC-CMT-003 | The comment send button is enabled for an empty comment |
| DEF-003 | TC-AUTH-009 | Email > 254 characters is accepted with no validation |
| DEF-004 | TC-SHR-004 Facebook | Facebook share URL isn't encoded, so `utm_medium`/`shareID` are lost |
| DEF-006 | TC-AUTH-015 | The session token still works for about a minute after logout (the test measures the seconds) |

DEF-005 (a quick like → unlike is sometimes lost server-side) is intermittent, so it is documented with a scripted reproduction, and `like.spec.ts` cleanup re-checks the server until the article is unliked.

These count as *expected* failures. If kumparan fixes one, the test reports "unexpectedly passed" and the annotation can be removed. Full reports, with steps and evidence, are in the workbook's *Defects & Findings* sheet.

## Reports

- `playwright-report/`: HTML report with traces (on first retry), screenshots and videos (on failure).
- `test-results/results.json`: JSON results. The Task A workbook builder merges them into the Desktop/Mobile status columns (`python build_workbook.py --playwright-json …/results.json`).
