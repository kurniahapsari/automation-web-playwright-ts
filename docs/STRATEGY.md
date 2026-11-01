# Test strategy — parallelism, data, timeouts, retries, flakiness

The suite runs against **production** (kumparan.com / m.kumparan.com). Every decision below follows from that: tests must be safe, leave no trace, and stay stable on a live site full of ads, rotating content and bot protection.

## 1. Isolation (fixtures and setup)

| Concern | How it is handled |
|---|---|
| Browser state | Every test gets a fresh `BrowserContext` (Playwright default). No cookies or storage leak between tests. |
| Guest vs logged-in | `test` = guest context. `authTest` (in `fixtures/index.ts`) overrides `storageState` with the session saved by `npm run auth:save`, per platform (`.auth/desktop.json`, `.auth/mobile.json`). Without a session, auth tests **skip with a clear reason** instead of failing. |
| Platform | Project option `platform` (`desktop`/`mobile`) is injected into every page object, so one test body runs on both sites even though their layouts and navigation differ. |
| Test data | Articles rotate every few minutes. The `discover` setup project collects live article links once per run (`.cache/articles.json`). The `articlePath` fixture hands each test an article; desktop and mobile get **different** articles so they never touch the same like state. |
| Page objects | `src/pages/*` hold the locators; tests only describe behaviour. |
| Network | The `context` fixture blocks ad and analytics domains (`src/support/network.ts`). `openedWindows` stubs `window.open`, so share tests assert the generated URL without opening Facebook/X/WhatsApp. |

## 2. Data cleanup

- **Likes**: the `likeRestore` fixture (in `tests/article/like.spec.ts`) makes sure the article starts unliked and, in teardown, unlikes it again, even when the test failed.
  - The fixture trusts the **server** (`IsCurrentUserLikeObjectIDAndObjectType`), not the icon.
  - It re-checks after a short settle time, because a quick like → unlike is sometimes lost server-side (DEF-005).
  - It only uses articles published in the last hours, so "not liked" is their original state.
  - After the runs, the test account's profile "Suka" tab shows *Belum ada yang disukai*.
- **Comments / reports are never submitted** (rule of the brief). The send/"Laporkan" buttons are never clicked. The `submissionGuard` fixture also aborts any write request that looks like a comment or report submission, and **fails the test** if one happened.
- **Login negatives** use a random unregistered email. At most one wrong-password attempt per run is made against the real account, so it cannot be locked.
- **Logout** may invalidate the saved session, so it runs in its own projects (`logout-desktop`, `logout-mobile`) that depend on the main projects and therefore run **last**.
- Nothing else is created. No cleanup jobs are needed.

## 3. Parallel execution

- `fullyParallel: true`: tests in a file run in parallel.
- **2 workers by default** (`WORKERS=n` to override). kumparan's WAF returns HTTP 403 to bursts of parallel requests and to non-browser user agents, so the suite stays a polite client.
- Shared mutable state is serialized only where it must be: like tests use `describe.configure({ mode: 'serial' })` (one account), and desktop and mobile use different articles.
- Projects: `discover` → `desktop-chrome` + `mobile-chrome` (in parallel) → `logout-*`. `mobile-safari` (WebKit) is opt-in with `WEBKIT=1`.
- In CI the same config shards cleanly (`--shard=1/2`), because tests share no state beyond the read-only article list.

## 4. Timeouts

| Level | Value | Why |
|---|---|---|
| Test | 60 s | Production pages are heavy; a test that needs longer is doing too much. |
| `expect` | 10 s | Web-first assertions retry until then. |
| Action | 15 s | Clicks and fills on a hydrating SPA. |
| Navigation | 30 s | First load of kumparan.com, including slow third parties. |
| Human-in-the-loop | 3–5 min | Only `auth:save` / `@human` tests, while a person solves Turnstile. |

There are **no fixed sleeps** (`waitForTimeout`). Waiting is always on a condition: `expect(...).toBeVisible()`, `expect.poll(...)`, `toHaveURL(...)`.

## 5. Retries

- `retries: 2` in CI, `1` locally. Production occasionally serves its "Aku memperbaiki diri dulu ya" error page or a WAF 403. One retry absorbs that.
  - When a burst trips the WAF on both attempts, the failure is environmental (screenshot shows "403 Forbidden"). Rerun only those tests with `--last-failed`; the report and workbook say so.
- The human-login projects (`auth-*`) never retry and record no trace or video, because a trace would contain the typed credentials.
- A test that passes only on retry is reported as **flaky**, not passed. The HTML/JSON report and the Task A workbook both show it.
- `trace: 'on-first-retry'`, plus screenshot and video on failure: every retry has a full trace to debug.
- Known product defects are marked with `test.fail(true, 'DEF-00x …')`. The suite stays green, the defect stays visible in the report, and when kumparan fixes it the test flips to "unexpectedly passed" so the annotation gets removed.

## 6. Handling flaky tests

1. **Prevent**:
   - Web-first assertions only.
   - Locators from `data-qa-id`, never CSS classes.
   - Ad blocking: ads cause layout shift and click interception (Task A, OBS-01).
   - Live data is chosen at runtime.
   - Assertions on production numbers are relative (count + 1), not absolute.
   - Wait for the **server**, not the optimistic UI. Like/unlike waits for the `CreateLike`/`Unlike` GraphQL response (200, no `errors`). The logged-in state waits for a positive marker (avatar `hd-pic-user`, sidebar "Keluar"), because the desktop header shows the guest "Masuk" first (OBS-09).
2. **Detect**: `npm run test:flaky-check` runs the smoke suite with `--repeat-each=3`. CI keeps the HTML report and traces as artifacts.
3. **Triage** each flaky result as one of:
   - product defect → log it in Task A;
   - test defect → fix the locator or wait;
   - environment → error page or WAF, documented.
4. **Quarantine**: a test that is flaky for an environment reason and can't be fixed quickly gets the `@quarantine` tag, a linked issue, and is excluded from the blocking run (`--grep-invert @quarantine`) until fixed. It is never deleted silently.

## 7. Locator strategy (`data-qa-id` first)

`testIdAttribute: 'data-qa-id'` makes `page.getByTestId()` use kumparan's QA attribute. Where it is missing or not unique:

| Case | Locator used |
|---|---|
| Share modal labels (all items are `data-qa-id="content"`) | the buttons' own ids (`share-fb`, `share-twitter`…), labels scoped to the modal (anchored on `btn-close-modal` + "Bagikan") |
| Same id reused (`btn-report` = footer link, modal link and submit button) | `filter({ hasText, visible: true })` |
| Clickable wrapper without an id (share bar icons) | `[data-clipboard-text]:has([data-qa-id="sosmed-whatsapp-white"])` |
| Story links (cards share generic ids like `title`) | anchors that contain `data-qa-id="title"` plus an article-path pattern |
| Toggle icon changes id (`eye` / `eye-off`) | `getByTestId(/^eye(-off)?$/)` |
| Comment textarea inside `input-comment` | `getByTestId('input-comment').locator('textarea')` |
| Cloudflare Turnstile | iframe or `cf-turnstile-response`. Only its presence is asserted; it is never interacted with. |
