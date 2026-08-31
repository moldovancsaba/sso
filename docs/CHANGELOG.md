# Changelog — SSO Service

All notable changes to the SSO service are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.39.3] - 2026-08-31

### 🧹 Removed — files from other projects, stale one-offs, orphaned SDKs

**A complete foreign project evicted from the repo root.** Eight Moltbot/Clawdbot files plus `kiro-skill/` — a local-AI-assistant toolset (Ollama model registry mutators, WhatsApp/Telegram/iMessage channel setup, a dashboard linking to `file:///Users/…/moltbot`) with zero references from this codebase, copied in incomplete (it referenced companion files that were never here). Four of them contained a plaintext gateway token; **that token remains in git history and still needs rotation** — deletion does not un-leak it. Also removed `agent_working_loop_canonical_operating_document.md`, the MESSMASS operating document CLAUDE.md §9 had been warning about; §9 now documents the class of problem instead of the single instance.

**Stale one-offs**: `check-user.mjs` (hardcoded one person's email and mutated the production database from the repo root), `check-uuid-issue.mjs` (single-incident debug artifact), root `test-magic-link.mjs` (name-collided with the different `scripts/test-magic-link.mjs` and defaulted to probing production), `package.json.backup` / `package-lock.json.backup` (a pre-rename ancestor of this package), and `examples/external-website-integration.html` (referenced by nothing, hardcoded `localhost:3000`, used the legacy password API).

**Both orphaned SDK packages**: `src/` (a TypeScript client library imported by nothing and excluded from the Next build — its only role was being the sole thing `npm run type-check` checked) and `client/` (`@doneisbetter/sso-client` v5.1.0, unpublishable from here — its build tool isn't installed — while npm still serves v1.0.0). Git history preserves both; a future SDK belongs in its own repository. `package.json` no longer claims `main: src/index.ts`, `tsconfig.json` now includes the repo's actual TypeScript surface (`next-env.d.ts` and any future `.ts`/`.tsx`) instead of the deleted orphan, and the eslint ignore for `client/dist` is gone.

### 🛡️ Guardrail hardened

`guard:repo`'s hardcoded-credential scan now covers **every tracked file**. The old prefix list scanned only `.github/`, `lib/`, `pages/`, `scripts/`, plus two directories that no longer exist (`components/`, `src/`) — and skipped the repo root, which is exactly where the foreign files with the committed token sat.

---

## [5.39.2] - 2026-08-31

### 🧹 Configuration and documentation now tell the truth

**`lib/config.js` deleted.** Nothing imported it. It was generic boilerplate from a different project shape (endpoint-path config, `HOST`/`PORT`, its own CORS list), and roughly two-thirds of `.env.example` documented variables that only it read — meaning most of the example file configured nothing. `npm run validate-config` (which only validated that dead module) is gone; `scripts/test-connection.js` now reads `MONGODB_URI`/`MONGODB_DB` directly — the variables `lib/db.mjs` actually uses — and loads `.env.local` like the other scripts.

**`.env.example` rewritten from the code, not the folklore.** Every variable listed is actually read by the service, grouped by subsystem, with real defaults: the entire email transport (`EMAIL_PROVIDER`, `SMTP_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`), the magic-link secrets (`ADMIN_MAGIC_SECRET` — whose absence makes admin magic links silently never send — and `PUBLIC_MAGIC_SECRET` with its `JWT_SECRET` fallback), inline-PEM `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` (the previously-documented `*_PATH` variants were read by nothing), rate-limit and TTL knobs, and the Vercel-preview warning for `SSO_COOKIE_DOMAIN`. `npm run setup` now copies to `.env.local` (which Next.js loads and git ignores) instead of `.env`.

**Duplicated `SSO_ALLOWED_ORIGINS` default unified.** `lib/cors.mjs` and `lib/middleware/csrf.mjs` each hardcoded the same fallback list; CSRF now imports `getAllowedOrigins()` from the CORS module, so the two trust decisions cannot drift apart.

**`HANDOVER.md` deleted.** It described `main` as being at 5.32.1 on a commit that is dozens of releases old, and no maintenance check covered it — a stale snapshot presenting itself as current state.

`docs/README.md` environment section now points at `.env.example` as the authoritative list and calls out the variables whose absence breaks auth flows outright.

---

## [5.39.1] - 2026-08-31

### 🐛 Fixed

**Password-registered users could never receive a magic link.** `pages/api/public/request-magic-link.js` required `user.emailVerified` to be truthy, but nothing in the system could ever make it so for password registrations: `createPublicUser` never sets the field, `setEmailVerified` had zero callers, the email-verification template was dead code, and the confirm endpoints it linked to (`/api/{admin,public}/email-verification/confirm`) were never built. Those users received the anti-enumeration fake-success response and no email — forever. Only Google/Facebook-created accounts (which arrive with `emailVerified: true`) passed the gate.

The gate now blocks only an *explicitly* unverified email (`emailVerified === false`), matching the convention already used by `session.js`, `login.js`, and the admin user listing, all of which treat an absent field as verified. Ownership is still proven — the link is only usable from the recipient's inbox — and successful magic-link login now records it: `magic-login.js` calls `setEmailVerified` (its first-ever caller) after creating the session, so this is also the system's first working verification path. A failure of that bookkeeping update logs a warning rather than failing a login that already succeeded.

### 🧹 Removed

The four email-template builders nothing ever called: `buildPasswordResetEmail`, `buildEmailVerificationEmail`, `buildPasswordResetSuccessEmail`, `buildWelcomeAfterVerificationEmail`, along with their now-unused helpers (`formatDuration`, `PASSWORD_RESET_TOKEN_TTL` / `EMAIL_VERIFICATION_TOKEN_TTL` reads in this module). The verification builder advertised endpoints that do not exist; keeping it around invited someone to trust it. The three live templates (login PIN, magic link, forgot password) are unchanged.

---

## [5.39.0] - 2026-08-31

### 🐛 Fixed

**Production magic-link emails pointed at `http://localhost:3000`.** Both magic-link endpoints and every email template built links from `process.env.SSO_BASE_URL || 'http://localhost:3000'`, and the production environment did not define `SSO_BASE_URL` — so every emailed link (magic login, forgot-password) carried a localhost URL. Meanwhile `lib/securityHeaders.mjs` and `lib/oauth/tokens.mjs` used the *opposite* fallback (`https://sso.doneisbetter.com`), so the codebase disagreed with itself about what "unconfigured" means.

All base-URL derivation now goes through one function, `getBaseUrl()` in `lib/baseUrl.mjs`, with one precedence order: `SSO_BASE_URL` (trimmed, trailing slashes stripped) → the deployment's own host on Vercel previews (`VERCEL_ENV=preview` + `VERCEL_URL`) → `https://sso.doneisbetter.com` when `NODE_ENV=production` → `http://localhost:5500` otherwise. The development fallback finally matches the port `npm run dev` actually listens on (`next dev -p 5500`); the old fallbacks pointed at 3000, where nothing runs.

Call sites converted: both `request-magic-link` endpoints, `lib/emailTemplates.mjs` (which also stops caching the base URL in a module-level constant — it is now read at call time), `lib/securityHeaders.mjs` (CSP `connect-src`), `pages/api/resource-passwords/index.js`, `pages/api/.well-known/openid-configuration.js`, `lib/oauth/tokens.mjs`, and `scripts/generate-magic-link.mjs`.

**OIDC issuer precedence mismatch.** Token signing resolved the issuer as `JWT_ISSUER || SSO_BASE_URL || <prod>`, while the discovery document resolved `SSO_BASE_URL || JWT_ISSUER || <request host>` — opposite orders, so setting both variables to different values made discovery advertise one issuer while tokens carried another, and spec-compliant clients would reject every token. Both now resolve identically: `JWT_ISSUER || getBaseUrl()`.

**Host-header injection in resource-password shareable links.** `pages/api/resource-passwords/index.js` embedded `x-forwarded-host` verbatim into the generated credential link, and its intended `SSO_BASE_URL` fallback was unreachable (a template literal is never falsy). The link is now built from `getBaseUrl()` only.

**Admin OAuth login guessed its own callback URL from `NODE_ENV`.** `pages/api/admin/complete-oauth-login.js` hardcoded the production callback when `NODE_ENV=production` — which is also true on every Vercel preview deployment, where admin login therefore could not complete, and hardcoded port 3000 in development, where the dev server runs on 5500. The callback page (`pages/admin/callback.js`) now sends the `redirect_uri` it actually authorized with, and the server validates it against the value bound to the authorization code — standard token-exchange semantics, no guessing.

### 🧪 Tests

`__tests__/base-url.test.js` covers the precedence order, trailing-slash and whitespace handling, the preview branch, and the production-fallback regression this release fixes.

---

## [5.38.1] - 2026-08-25

### 🛡️ Tooling

**`npm run check:release` — a guardrail for the failure `check:docs` structurally cannot see.**

`check-docs-maintenance.mjs` asserts that `package.json` and the five versioned docs carry the *same* version as each other. They always did. That is exactly why it never caught what went wrong three separate times on 2026-08-25: commits landed on `main`, every document went on agreeing about the previous version, and `main` described itself with a release that had already been published. `npm run verify` reported green through all three.

Agreement between documents says nothing about whether those documents still describe the code. `scripts/check-release-integrity.mjs` checks that instead, with one rule:

> If a tag matching `package.json`'s version exists **and does not point at `HEAD`**, fail — the code has moved past a published release without a bump.

**Scoped to pushes on `main`, deliberately.** It is not part of `npm run verify` and does not run on `pull_request`. On a feature branch `package.json` legitimately still holds the last released version until the bump commit, so running it earlier would fail every branch that had not bumped yet — a check that cries wolf on normal work gets ignored, which is worse than no check. The contract it enforces belongs to `main`: what is on `main` must not claim a version that is already released.

The workflow's checkout now uses `fetch-depth: 0`. The default shallow checkout fetches no tags, so the check would have found nothing to compare and passed silently — worse than not running at all, because it would have looked like it had run.

Written against the live failure rather than a hypothetical: at the time of writing `main` was one commit past `v5.38.0` with `package.json` still reading `5.38.0`, and the check caught it with the commit count and both SHAs. All three outcomes were then verified — version not yet released (pass), `HEAD` is the release (pass, including annotated-tag dereferencing via `rev-list -n 1`), and `HEAD` past the release (fail). Both tag forms are accepted, `v5.38.0` and bare `5.38.0`, since nothing in the repo enforces the prefix.

An expected-miss probe (`git rev-parse --verify` on a tag that does not exist) has its stderr discarded, so a clean run prints no `fatal:` line. A guardrail that prints a fatal error on every success is how real failures stop being read.

### 🧹 Fixed

`gds-adoption.json` no longer lists `components` under `compliance.protectedSurfacePaths`. That directory ceased to exist in [5.37.0] when `components/DocsLayout.js` — its last file — was deleted. Landed as `f51828c2`; it is the commit the new guardrail was catching.

### 📋 Known Limitation

This detects a version that has already been released. It does not detect the window before a release is cut, where `main` carries an unreleased bump — that state is legitimate and indistinguishable from being mid-flight. Nor does it verify that `docs/CHANGELOG.md` gained an entry describing what actually changed; only a human reading the diff can confirm that.

---

## [5.38.0] - 2026-08-25

### 📦 Changed

**GDS packages install from GitHub Packages again; `vendor/gds/` is deleted.** [5.32.0] vendored all five `@sovereignsquad/gds-*` packages as prebuilt tarballs referenced through `file:` dependencies, and said plainly why: GDS publishes only to `npm.pkg.github.com`, that registry requires a `read:packages`-scoped token on every install, and no such credential existed for this repo's CI or Vercel environments. The entry recorded the cost — no automatic update path, since every GDS bump then required manually rebuilding and re-committing tarballs — and named the exit condition: provision `GDS_PACKAGES_TOKEN` and move back.

That condition is met. `package.json` pins plain `6.0.0` versions, `.npmrc` carries the `@sovereignsquad:registry` and `_authToken` block, and `vendor/gds/` is removed. The packages are byte-for-byte the same release line; this is an install-mechanism change, not a dependency upgrade.

`.github/workflows/repo-guardrails.yml` exports the secret as `GITHUB_TOKEN: ${{ secrets.GDS_PACKAGES_TOKEN }}` for the install step — GitHub Actions reserves the name `GITHUB_TOKEN` for its own automatic secret, so the repository secret cannot be stored under it and has to be re-exported. The equivalent Vercel project variable is set for Production and Preview.

Deployment health was verified rather than assumed: the Vercel checks for both the migration commit and current `main` report success, and `https://sso.doneisbetter.com` returns 200.

One observation for whoever owns this next: a `npm ci` run in a clean directory with **no** `GITHUB_TOKEN` present completed successfully and installed all five packages at `6.0.0`. That suggests the packages are publicly readable and the token may not be strictly required for installs, contrary to the assumption behind the original stopgap. Not acted on here — the token is configured and working, and removing a credential on that evidence alone would be premature — but worth confirming before anyone treats it as a hard onboarding prerequisite.

### 🔑 Added

**`management:staff` scope.** Grants a headless caller staff-level access to the management app's console and admin actions, with no human login. Defined `machineOnly: true`, so `validateScopes()` rejects it on the interactive `/api/oauth/authorize` path and it is reachable only through `client_credentials` — the same protection `manage_permissions` carries, and for the same reason: a token an end user consented to must never be able to act as staff across an application.

It is deliberately distinct from `management:ingest.write` and `management:catalog.read` rather than folded into them. A content pipeline that writes listings should not thereby gain the ability to act as staff, and a staff agent has no reason to hold ingest rights.

The existing `every resource scope is machineOnly` guard in `__tests__/oauth-machine-audience.test.js` covers it automatically, because that test iterates `SCOPE_DEFINITIONS` rather than a hand-listed set.

**`scripts/register-management-staff-agent-client.mjs`.** Registers a confidential `client_credentials`-only client holding `management:staff` and nothing else. Refuses if the client already exists, refuses to run on a checkout where `management:staff` is unregistered (`allowed_scopes` is not validated at registration time, so without that guard it would create a client that looks correct but can never obtain a token), and writes the secret to a mode-600 file rather than stdout.

### 📝 Documentation

**`management:staff` was live and advertised but undocumented.** OIDC discovery derives `scopes_supported` from `SCOPE_DEFINITIONS` (see [5.34.1]), so the scope was being published to every client from the moment it was defined, while `docs/THIRD_PARTY_INTEGRATION_GUIDE.md`'s resource-scope table still listed four. It is now in that table, with a note on why it is separated from the ingest and catalog scopes. The registration script is recorded in `AGENTS.md` alongside the other verified operational commands.

### 🧭 Why This Release Exists

Four commits had landed on `main` beyond the released `v5.37.2` with no version bump and no changelog entry, so the version string, the changelog, and the published release all described a state the code had moved past.

`npm run check:docs` cannot detect this. It verifies that `package.json` and the five versioned docs carry the *same* version as each other — and they did, all reading `5.37.2`. Agreement between documents says nothing about whether those documents still describe the code. The changelog's most recent statement about install source was the [5.32.0] explanation of why the packages *were* vendored, which by then was the opposite of the truth.

Worth noting as a limitation of the guardrail rather than a failure of it: closing that gap properly would mean tying a release to a commit range, not just to a string match.

---

## [5.37.2] - 2026-08-25

### 🔒 Security

**Remaining transitive advisories cleared with `npm update`.** `brace-expansion` 1.1.14 → 1.1.18, `body-parser` 2.2.2 → 2.3.0, `js-yaml` 3.14.2 → 3.15.1 and 4.1.1 → 4.3.1, `@babel/core` 7.29.0 → 7.29.7. Lockfile only; no manifest range changed.

Audit **6 vulnerabilities → 2**, high **4 → 2**. The two remaining are `sharp` and `next`, and `next.via` is `["sharp"]` — the framework carries no advisory of its own and is listed purely as the parent of `sharp`. So **one root advisory remains**, in an optional Next dependency for image optimisation that this app never loads (`next/image` imported in zero files, no `images` config). There is no known vulnerability on any code path this service executes.

This supersedes dependabot PRs #79 (`body-parser`) and #80 (`brace-expansion`), which proposed two of these individually.

**The overrides were the wrong tool, and had been all along.** In [5.36.2] three override strategies — nested, deeply nested, and version-selector — all failed to move `brace-expansion` off 1.1.14, and the ineffective config was removed with the residual documented as unfixable-by-override. That diagnosis was wrong. The safe versions sat inside the existing semver ranges the entire time and only needed the lockfile refreshed; a plain `npm update` moved them in one command. Overrides force a resolution npm would not otherwise choose, which is not what this needed.

### 🧹 Removed

**Two of the three `overrides` entries were redundant.** Each was tested by deleting it and observing what npm actually resolved:

| Override | Without it | Verdict |
| --- | --- | --- |
| `@typescript-eslint/typescript-estree > brace-expansion` | resolves to 5.0.9 and 1.1.18, both safe | removed |
| `qs` | resolves to 6.15.2, identical to the pin | removed |
| `postcss` | falls to `8.4.31` — the version `next@15.5.23` pins exactly — and the advisory returns | **kept** |

`overrides` is now a single entry, the only one that was ever load-bearing. This matters beyond tidiness: a stale `postcss` pin silently holding a *vulnerable* version is exactly what started this sequence in [5.36.2]. Every pin that is not doing work is a future instance of that bug, so the ones doing nothing are gone and the one that remains is documented as required.

### ✅ Verification

`npm run verify` exits 0 on Node 24.19.0: lint, type-check, 118 tests, build on Next 15.5.23, `guard:repo`, `check:docs`.

---

## [5.37.1] - 2026-08-25

### ⚡ Changed

**SMTP connections are now pooled and reused instead of opened per message.** `sendViaNodemailer()` called `nodemailer.createTransport()` on every send, so each magic link and PIN code opened its own TCP connection, performed a STARTTLS upgrade and re-authenticated before delivering one plain-text message.

**The fix #83 proposed would not have worked.** That issue asked for a transporter cache and set the acceptance criterion "a run of N sends against one configuration opens one connection, not N". Measured against a local SMTP server built for the purpose, that is false:

| Strategy | TCP connections for 5 messages |
| --- | --- |
| New transport per send (previous behaviour) | 5 |
| Cached transport, no pool (what #83 asked for) | 5 |
| Cached transport with `pool: true` | 1 |

A non-pooled nodemailer transport opens a fresh connection on every `sendMail` regardless of whether the transport object is reused, so caching alone changes nothing. Only `pool: true` reduces the count — and a pool is meaningless if the transport holding it is discarded after each send. Both changes were required; either alone would have been wasted effort. Re-measured through the real `sendEmail()` path after the change: **5 messages, 1 connection.**

**Pooling is safe here despite serverless freezing.** The concern was a pooled socket going stale while an instance is frozen, turning a saved connection into a failed magic link. Tested by forcing a peer to drop an idle pooled socket mid-sequence: the following send transparently opened a replacement rather than failing. Three sends across the forced disconnect all succeeded, on two connections, with no error surfaced.

Transports are keyed by credential set rather than held as one global instance, because `sendViaNodemailer()` accepts a per-organisation `emailConfig` (`lib/orgEmailConfig.mjs`); a single global would have silently routed organisation mail through the default account. The key is a SHA-256 digest of the connection parameters, so identity accounts for the password without the password being retained in a `Map` key that could surface in a heap dump or debug log. `maxConnections` is 2 and `maxMessages` 100 — the goal is collapsing a burst onto one connection, not parallelism, and providers cap concurrent connections per account.

### 🐛 Fixed

**`verifyEmailConfig()` was testing a transport that nothing sent through.** `getNodemailerTransporter()` built its own separate transport for `verify()`, so a passing configuration check proved nothing about the connection real mail would take. Both paths now resolve through the same cache.

### 📎 Known Behaviour

A pooled connection is an open handle and keeps the Node event loop alive. This is irrelevant inside an API route, where the response ends the invocation, and all six API callers are unaffected. A plain Node script that imports `lib/email.mjs` will no longer exit on its own after sending. Both existing script callers — `scripts/test-email-config.mjs` and `scripts/test-magic-link.mjs` — already call `process.exit()` explicitly and are unaffected; the constraint is documented at the cache definition for whoever writes the next one. No teardown helper was added because no caller needs one.

Closes #83.

### ✅ Verification

`npm run verify` exits 0 on Node 24.19.0: lint, type-check, 118 tests, build, `guard:repo`, `check:docs`.

Against live Gmail: `verifyEmailConfig()` reports valid with no errors or warnings through the pooled transport, and a real message was delivered end to end with a valid message ID, exiting cleanly. Connection counts were measured against a purpose-built local SMTP server rather than inferred.

---

## [5.37.0] - 2026-08-25

### 🐛 Fixed

**The docs sidebar was rendering inside the header and overlaying the article.** `getDocsShellProps()` passed the full vertical section tree — a `Stack` of section headings and `NavLink`s wrapped in a `ScrollArea` — to `PublicShell`'s `navigation` prop. That prop is not a sidebar slot. `PublicShell` renders it inside `AppShell.Header`, in a `<Group visibleFrom="sm">` sitting between the brand and the action links, in a header whose height is fixed at 72px. The tree therefore overflowed its container by roughly 900 pixels and painted straight down across the page body.

Measured on the built site before the fix: the `Vanilla JS` nav link resolved to `y = 969` while `header` ended at `y = 72`, `header.contains(navLink)` was `true`, and its rect intersected the `<article>` rect. It was not a breakpoint bug and not an upstream defect — `PublicShell` is a top-navigation shell that never had a sidebar slot, and it was being handed a sidebar.

It looked correct on a phone only by accident: the same shell marks that slot `visibleFrom="sm"` and swaps in a burger below it, so the broken path was hidden exactly where the site was most often eyeballed.

Navigation now uses the three slots the shell actually provides, every one still generated from the single `docsSections` array in `lib/docs-shell-config.js`:

- **Header** — `navItems` + `activeNavId`, one short label per section (`Start`, `Integrate`, `API`, `Examples`, `Security`), rendered horizontally by the package's own `PublicNav` with `aria-current="page"` on the section that owns the current route. Labels are shortened from the column titles because the full ones (`Integration Guide`, `API Reference`) do not fit a header row that also carries the brand and two action links.
- **Side rail** — `DocsPageShell`'s `sideRail`, which the package renders as `<Stack visibleFrom="lg" w={240}>` beside the article. This is the full page tree, and the slot built for it.
- **Burger** — `mobileNavigation` unchanged, the full tree below `sm`.

**All three were required.** The shell's breakpoints partition the range rather than overlapping: the burger is `hiddenFrom="sm"`, the header slot is `visibleFrom="sm"`, the side rail is `visibleFrom="lg"`. Moving the tree to the side rail alone — the obvious one-line fix — would have removed the overlap and left every viewport between 768px and 1200px with no docs navigation whatsoever.

Closes #76.

### ✅ Verification

`npm run verify` exits 0 on Node 24.19.0: lint, type-check, 118 tests, build (all 20 docs routes prerendering), `guard:repo`, `check:docs`.

Checked on a served production build: the header nav renders horizontally with no overflow, the side rail renders as a column beside the article, and `aria-current` lands on the right section from a nested route (`Security` for `/docs/security/cors`). In a zero-width measurement context — which evaluates every media query as below `sm` — the burger computes to `display: block` while the header nav's container computes to `display: none`, confirming the narrow-viewport swap.

The intermediate 768px–1200px band was confirmed from the package's own `visibleFrom`/`hiddenFrom` values rather than measured directly: the preview surface used here could not be resized, and its JavaScript context reports a viewport width of 0 regardless of render size.

---

## [5.36.3] - 2026-08-25

### 🔒 Security

**`nodemailer` 8.0.9 → 9.0.5.** This was the last outstanding advisory sitting on a live code path. The flaw (GHSA, `<=9.0.0`) let a message's `raw` option bypass `disableFileAccess` / `disableUrlAccess`, enabling arbitrary file read and full-path disclosure.

It was **not exploitable in this repo**: `lib/email.mjs` composes messages only as `{ from, to, subject, text }` and never passes `raw`, attachments, `path`, or `href`. But magic links and PIN verification codes are delivered through this transport, so unlike `sharp` — which is installed and never executed — this code genuinely runs on every authentication that uses email. That is why it was worth a dedicated change rather than deferral.

**The one breaking change in 9.0.0 does not apply.** 9.0.0 made HTTPS requests for remote content validate the server's TLS certificate by default, affecting attachment `href`/`path` URLs, OAuth2 token endpoints, and HTTP/HTTPS proxy CONNECT. This repo uses plain SMTP username/password auth, sends no attachments, and configures no proxy, so none of the three paths exist here. No code changes were required — the upgrade is `package.json` and the lockfile only.

The 9.x line also brings hardening this app benefits from directly: control characters kept out of header values and Message-ID headers, DKIM tag and header-key injection closed, and addresses normalised so header and envelope agree. `lib/email.mjs` places user-supplied email addresses into the `to` field, so header-injection correctness is on a path that handles untrusted input.

Audit: **7 vulnerabilities → 6**, high **5 → 4**.

### ✅ Verification

`npm run verify` exits 0 on Node 24.19.0 — lint, type-check, 118 tests, build, `guard:repo`, `check:docs`.

Because a build cannot exercise SMTP, the transport was tested live on 9.0.5:

- `transporter.verify()` completed a real connect, STARTTLS upgrade and AUTH against `smtp.gmail.com:587`. This is the specific path 9.0.3 rewrote ("harden STARTTLS upgrade and secure socket handling"), so it was the most likely thing to break.
- A real message was sent end to end through `scripts/test-email-config.mjs` and accepted by the server, returning a valid `messageId`. That exercises MIME composition and header encoding, which the 9.x fixes above touch.

No credential values were printed at any point; the check reported only host, port, and whether each credential was present.

### 📋 Remaining Advisories Unchanged

Six remain, all previously assessed and recorded in [5.36.2]: `sharp` (optional Next image dependency, `next/image` imported nowhere), `body-parser` (production tree via `express-rate-limit`, but no Express server is ever started), and `js-yaml`, `@babel/core`, `brace-expansion` (dev-only toolchain). None sits on an executed path.

---

## [5.36.2] - 2026-08-24

### 🔒 Security

**`next` 15.5.18 → 15.5.23.** Clears four advisories: DoS in App Router Server Actions (GHSA-m99w-x7hq-7vfj), a middleware/proxy bypass under App Router + Turbopack (GHSA-6gpp-xcg3-4w24), and two SSRF issues (GHSA-p9j2-gv94-2wf4, GHSA-89xv-2m56-2m9x). Three are App-Router- or Server-Actions-specific and cannot apply to this Pages Router app. The fourth, SSRF in `rewrites` via an attacker-controlled destination hostname, is the only one that touches a feature this repo uses — but all five rewrites in `next.config.js` have static literal destinations with no hostname and no parameter interpolation, so it was not exploitable here either. Upgraded regardless: `next.via` in the audit tree is now `["sharp"]` alone, meaning the framework itself carries no outstanding advisory.

**The `overrides` block was pinning vulnerable versions.** `postcss` was fixed at `8.5.15`, below the `<=8.5.22` vulnerable ceiling, so the override — added during the GDS runtime migration in `24203dfe`, presumably to satisfy an audit at the time — had since been overtaken by a new advisory and was actively holding the vulnerable version in place. Raised to `8.5.26`.

That single change also fixed **`nanoid`** and **`minimatch`**. The dependency path was `next → postcss (overridden) → nanoid@3.3.12`, so the pin was the *cause* of the nanoid advisory, not a bystander; `postcss@8.5.26` requires `nanoid: ^3.3.17` and resolves to `3.3.18`. Dependabot PR #71 proposed bumping nanoid directly, which would have treated the symptom and left the pin in place; it was closed in favour of this. PR #72 proposed `next@15.5.21`, which this supersedes.

The override cannot be removed outright: `next@15.5.23` pins `postcss: 8.4.31` exactly, older than what was there. `@typescript-eslint/typescript-estree > brace-expansion` was raised `5.0.6` → `5.0.9` for the same reason.

Result: **10 vulnerabilities → 7, high 8 → 5.**

### 📋 Known Remaining Advisories

Recorded deliberately rather than silently carried:

**`sharp` (high, 4 libvips CVEs) — not fixed, not reachable.** npm's only offered fix is `next@16.3.2`, a major framework upgrade. `sharp` is an `optionalDependencies` entry of Next used exclusively for image optimization. This app imports `next/image` in zero files, sets no `images` config, and renders its single logo through a plain `<Box component="img">`. The vulnerable code is installed but never executed. Taking a major Next upgrade on the identity provider that fronts every dependent app, to patch unreachable code, is the wrong trade. Revisit when Next 16 is adopted for its own reasons, or if `next/image` is ever introduced — the latter is the real exit condition.

**`nodemailer` (high, ≤9.0.0) — needs its own change.** The raw message option bypasses `disableFileAccess`/`disableUrlAccess`, enabling arbitrary file read. This one *is* on a live path: magic links and PIN codes send through it. The fix (`9.0.5`) is semver-major, so it warrants a dedicated PR and a real delivery test via `scripts/test-email-config.mjs` rather than being folded in here.

**`body-parser` (low) — production tree, never invoked.** Arrives via `express-rate-limit → express`. This app calls the rate limiters directly from Next API routes through `applyRateLimiter()`; no Express server is ever started, so no body parsing happens.

**`js-yaml`, `@babel/core`, `brace-expansion` (dev-only).** Lint and build toolchain, absent from the production tree (`npm ls --omit=dev`). `brace-expansion@1.1.14` arrives through `eslint → minimatch@3.1.5` and resisted three override strategies — nested, deeply nested, and version-selector — apparently due to hoisting. The ineffective override config was removed rather than left in place looking like protection it did not provide.

### ✅ Verification

`npm run verify` exits **0 on Node 24.19.0** — the first authoritative run of the gate in this sequence; earlier ones ran under Node 22 and did not satisfy `engines`. Lint, type-check, 118 tests, build (34/34 static pages), `guard:repo`, `check:docs`, all clean with no real warnings. A production build was served and `/`, `/login`, `/register`, `/docs` and three docs subpages plus both `.well-known` endpoints all returned 200; discovery still advertises the correct issuer, three grant types and 17 scopes; `/login` renders unchanged.

---

## [5.36.1] - 2026-08-24

### 📝 Documentation

**`docs/ROADMAP.md` absorbs the content of backlog issues #37–#41.** Those five issues restated the roadmap's phases on the GitHub board. Each one's stated Delivery Artifact was its own existence ("a backlog issue on the SSO project board"), its acceptance criteria were satisfied the moment it was filed, and none had been edited since May 2026 (`createdAt == updatedAt` on all five). Meanwhile `check:docs` enforces the roadmap copy and enforces nothing about the board, so the two could drift with only one of them failing a build.

The detail the issues carried that the roadmap did not is folded into the relevant phases: Apple sends the user's name payload only on first authorization so account linking must not depend on it, Apple Sign In needs a Service ID / team ID / key ID / private key, Apple is stricter than Google and Facebook about exact redirect-URI alignment, and any future provider must reuse the hardened callback-state and public-session seams rather than adding a parallel path. A "Board Note" section records that scheduling a phase means opening a real implementation issue at that time.

Phase 4 was also restored to its correct position between phases 3 and 5.

### 🐛 Also fixed here

**`next build` raced its own workers and failed at random.** This commit carried a `next.config.js` change made alongside it. After `Compiled successfully` the build would die during page-data collection with `Cannot find module '.next/server/pages/<page>.js'` — Next unable to find a file it had just emitted. Measured on an unchanged tree: three consecutive clean builds went fail / pass / fail, naming `docs/api/errors` + `docs/api/responses`, then nothing, then `admin/users` + `docs/admin-approval` + `docs/api`. A per-page defect cannot move between pages on an identical tree; a race can — `next build` forks parallel workers for page-data collection and static generation, and they race the webpack output they read.

Not a local annoyance: the same race runs on Vercel, where a failed production build of the SSO service takes down login for every dependent app, and because a retry usually passes it reads as a transient blip. `experimental.workerThreads: false` and `experimental.cpus: 1` run those phases in-process on one worker. Four consecutive clean builds green afterwards.

---

## [5.36.0] - 2026-08-24

### 🧹 Removed

**`components/DocsLayout.js` is deleted, closing the last local UI adapter.** It and `lib/docs-shell-config.js` were duplicates of each other: `getDocsShellProps()` reproduced DocsLayout's `PublicShell` props verbatim, `createDocsVersionMeta()` its `buildVersionMeta()`, and the two docs-navigation arrays were byte-identical (diffed, not assumed). Fifteen docs pages already consumed the config module while five still imported the component, so the docs sidebar had two definitions and adding a route meant remembering both. The five stragglers — `session-management`, `error-handling`, `admin-approval`, `return-url-handling`, `app-permissions` — now compose `PublicShell` + `DocsPageShell` directly. `components/` was left empty and is gone.

`session-management` and `error-handling` passed `versionLabel="SSO Version"` rather than the default; that label is carried onto `createDocsVersionMeta('SSO Version')` rather than silently reset to `API Version`.

**`styles/globals.css` (742 lines) is deleted.** Every one of its 63 class selectors was unreferenced across `pages/` and `components/`, and nothing consumed its `--color-*` / `--space-*` token layer. `styles/docs.module.css.bak` went with it. `gds-adoption.json` now records no local adapters, no shell exception, and `migrationStatus: "direct"`.

This closes the epic's remaining consumer-side work: the repo has one UI authority.

### 🎨 Changed

**Webfonts now load from `_document.js` instead of a CSS `@import`.** The `@import url(fonts.googleapis.com/...)` at the top of `globals.css` was the only thing fetching Inter and JetBrains Mono, the two families `lib/theme/mantineTheme.js` names as `fontFamily` and `fontFamilyMonospace`. Deleting the file without moving it would have dropped the whole product to system fonts with nothing failing. It is now a `<link>` pair (`preconnect` + stylesheet), which is also strictly faster — an `@import` cannot start downloading until the stylesheet containing it has itself been fetched and parsed, so the fonts were serialized behind it. Both hosts were already allowed by the CSP in `lib/securityHeaders.mjs`; no header change was needed.

**Ten bare `next/link` elements became Mantine `Anchor`s.** `globals.css` carried a bare `a { color: var(--text-link); text-decoration: none }` rule, and unlike its class selectors that rule *was* live: Mantine styles its own components but never touches a raw `<a>`, and `next/link` renders one. Measured against `main` before the change, those links computed to `rgb(37, 99, 235)` with no underline; with the stylesheet gone they fell back to user-agent `rgb(0, 0, 238)`, underlined. Wrapping them in `<Anchor component={Link}>` restores `rgb(37, 99, 235)` / no underline from the theme's `brand` token — same rendering, no local stylesheet. The one remaining raw `<Link>` wraps a logo image and needs no text styling.

**The page background changes from `#fafafa` to `#ffffff`**, Mantine's default, now that `body { background: var(--bg-page) }` is gone. This is the one deliberate visual change in this release: restoring the old value would mean re-asserting local authority over a token the design system owns.

### ✅ Verification

`lint`, `type-check`, 118 tests, `build`, `guard:repo`, `check:docs` all clean. All 20 docs routes plus `/`, `/login`, `/register`, `/privacy`, `/terms` return 200 from a production build and were checked in a browser; computed styles were diffed against a `main` build rather than eyeballed. A pre-existing sidebar/content overlap at narrow viewports reproduces identically on `main` and is untouched here.

---

## [5.35.0] - 2026-08-23

### 🔒 Security

**`SSO_ALLOWED_ORIGINS` no longer honours a `*` wildcard.** `runCors()` computed `allowed.includes('*') || allowed.includes(origin) ? origin : allowed[0] || '*'` and set `Access-Control-Allow-Credentials: true` unconditionally. A single `*` entry therefore reflected any caller's `Origin` back alongside credentials, which on an identity provider means any website could read any logged-in user's authenticated responses. No environment was configured with `*` — checked across `.env.example` and all three local Vercel env pulls — so nothing was exposed, but a wildcard is meaningless next to credentialed CORS (browsers reject the pair) and its only reachable effect was the unsafe one. The branch is deleted rather than documented as dangerous.

The fallback is gone too. An `Origin` that is not on the allow-list, or a request carrying no `Origin` at all, now receives **no** `Access-Control-Allow-Origin` header, where it previously received one naming `allowed[0]` — some other origin the caller never asked for — or a bare `*`. Browsers block all three identically, so this is not a behaviour change for any integrator; it just states the denial instead of implying a grant that does not apply. `Access-Control-Allow-Credentials` is now sent only alongside a real grant.

### ✅ Tests

`__tests__/cors-origin-allowlist.test.js` (8 tests) covers the allow-listed echo, the silent denial, the preflight contract, `Vary: Origin` on denials, and — the case the suite exists for — that a `*` entry never reflects an arbitrary origin back with credentials. Full suite: 118 passing.

### 🔧 Tooling

**CI now runs `lint` and `type-check`.** `.github/workflows/repo-guardrails.yml` ran guardrails, the docs check, and the contract tests, but neither static-analysis step, while `next.config.js` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`. A lint or type error could therefore reach a Vercel deployment with every automated check reporting green — the `npm run verify` gate in `CLAUDE.md` §3 depended entirely on a human running it locally. Both steps now run on Node 24 in CI. `build` is deliberately not added: Vercel already builds every push, so a second build in CI buys nothing.

### 📝 Documentation

`pages/docs/security/cors.js` claimed wildcard support "exists in the underlying config but is not enabled by default", and described a rejected origin as receiving a non-matching `Access-Control-Allow-Origin`. Both now describe the shipped behaviour.

---

## [5.34.1] - 2026-08-23

### 🐛 Fixed

**The four resource scopes added in 5.34.0 were missing from OIDC discovery.** `scopes_supported` in `pages/api/.well-known/openid-configuration.js` was a hand-maintained array — a second copy of the scope list — and 5.34.0 added the scopes to `SCOPE_DEFINITIONS` without touching it. The scopes were fully functional (the token endpoint validates against the client's `allowed_scopes`, not against discovery), but a client library that reads the discovery document had no way to learn they exist.

This is the second time the same array drifted the same way: 5.33.0 had to fix `manage_permissions` being a real, issuable scope that discovery never advertised. It will drift every time, because whoever adds a scope edits the table and does not think to edit this file. `scopes_supported` is now `Object.keys(SCOPE_DEFINITIONS)`, which removes the second place to forget, and a test asserts the derivation rather than the resulting list.

---

## [5.34.0] - 2026-08-23

### ✨ Added

**Per-resource machine scopes.** `manage_permissions` was the only `machineOnly` scope, and it means *rewrite any user's app-permission records at SSO*. Every machine caller therefore had to hold it regardless of what it actually did — a content pipeline that writes provider records to ClassScout was obliged to carry SSO's most dangerous machine capability to obtain any token at all. Four least-privilege scopes now exist: `classscout:ingest.write`, `classscout:catalog.read`, `management:ingest.write`, `management:catalog.read`, named `<resource>:<capability>` so a scope in an audit log identifies the system it acts on without a lookup.

**`aud` now names the resource the token is for, not the caller that asked for it.** `generateAccessToken` hard-wired `aud` to the requesting `client_id`, so every token a machine client obtained read `aud: <its own id>` whether it was destined for ClassScout or for another service. A resource server had no standards-conformant way to reject a token minted for somebody else (RFC 9068 §4) and would have had to allow-list caller ids instead. The audience is derived from the resource prefix of the already-validated requested scopes, so there is no second list to keep in sync — a client can only reach a resource it already holds a scope for. Tokens whose scopes name no resource (`manage_permissions`, `read:cards`) are byte-identical to before.

**One token per resource.** A `client_credentials` request whose scopes span two resources is refused with `invalid_scope`. A single bearer string valid at both ClassScout and management would mean leaking one leaks both; per-resource tokens keep the blast radius to one system.

**RFC 8707 `resource` parameter**, accepted as an assertion only: it must match the resource the requested scopes already name, or the request is refused with `invalid_target`. Honouring a `resource` the scopes do not support would let a caller aim a token at a service it holds no scope for.

### 🔒 Security

**The `client_credentials` grant no longer defaults to `manage_permissions` when `scope` is omitted.** `handleClientCredentialsGrant` read `requestedScope || 'manage_permissions'`, so a caller that simply forgot the parameter was silently handed the strongest machine scope it was allowed to hold. `scope` is now mandatory on this grant and its absence is an `invalid_scope` 400. This is a **breaking change** for any caller relying on the default; no registered client does.

**`scripts/enable-m2m-clients.mjs` can no longer grant machine access to an unnamed client.** An empty `M2M_CLIENTS` meant "every eligible confidential client", so a bare `DRY_RUN=false` run handed `client_credentials` + `manage_permissions` to every confidential client on record. That is how `SSO Admin Dashboard` — a browser admin UI with no machine workflow — acquired a standing credential able to rewrite any user's permissions, which 5.33.2 then had to add tooling to revoke. Granting is now always a named, deliberate act. A bare run still surveys and still strips dead scopes; it cannot hand anything out. The granted scope is also overridable per run via `M2M_SCOPE`, so a client can be given `classscout:ingest.write` alone.

### 🔧 Tooling

**`scripts/register-openclaw-worker-client.mjs`.** Registers the OpenClaw content pipeline as a confidential `client_credentials`-only client holding `classscout:ingest.write` and `classscout:catalog.read` — and explicitly not `manage_permissions`. It refuses to run on a checkout where those scopes are unregistered, because `allowed_scopes` is not validated at registration time and would otherwise produce a client that looks correct but cannot obtain a token. The secret is written to a mode-600 file already in OpenClaw's `.env.sso` format rather than printed to stdout.

### ✅ Tests

`__tests__/oauth-machine-audience.test.js` (13 tests) covers audience derivation, the multi-resource refusal, the no-resource fallback, and that `RESOURCE_SCOPE_PREFIXES` is derived from the scope table rather than hand-listed — including a guard that every resource scope is `machineOnly`, since a user-consentable resource scope would let one end user mint a token aimed at a whole backend service. Full suite: 108 passing.

---

## [5.33.3] - 2026-08-21

### 🐛 Fixed

**Revoking machine access was not durable, and the next ordinary run silently undid it.** `scripts/enable-m2m-clients.mjs` applied `REVOKE_M2M` as a one-shot edit and recorded nothing. Because `classify()` had no notion of a deliberate exclusion, the very next `DRY_RUN=false` run — the routine enablement pass — saw a healthy confidential client and re-granted the `client_credentials` grant and `manage_permissions` scope that an operator had just removed. Confirmed against production: after `SSO Admin Dashboard` was revoked, a plain dry run queued it for `+client_credentials +manage_permissions`.

Revocation now writes `m2m_excluded: true` on the client record, and `classify()` treats that flag as outranking every other eligibility rule. A revoked client stays revoked across later runs.

Lifting an exclusion requires naming the client explicitly in `M2M_CLIENTS`. A bare run across every client never lifts one, so restoring a withdrawn credential is always a deliberate act rather than a side effect.

`classify()` is now exported and covered by `__tests__/m2m-client-eligibility.test.js` (6 tests): public clients are never eligible, secretless and suspended clients are rejected, and exclusion outranks an otherwise perfectly eligible record. The script's `main()` is guarded so importing the module for tests cannot connect to the database or mutate client records as a side effect.

### 📝 Documentation

`README.md` version corrected from `5.33.1` to match `package.json`; it drifted because it is not in the list `npm run check:docs` enforces.

---

## [5.33.2] - 2026-08-21

### 🐛 Fixed

**`registerClient()` no longer demands a redirect URI from machine-only clients.** The check now applies only to grants that actually redirect a browser (`authorization_code`, `implicit`). A `client_credentials`-only client has no user agent and no redirect leg (RFC 6749 §4.4), so it has nowhere to redirect to; requiring a URI anyway made such a client impossible to register, and the only workaround would have been storing a fabricated URI that would then be a live redirect target on a client that must never take part in a browser flow. Redirect-based clients are still rejected without one.

**`scripts/register-try-on-client.mjs` now resolves an owning admin user.** It called `registerClient()` without `owner_user_id`, which that function rejects, so the script failed before writing anything. It now looks up an admin user the same way the other registration scripts in that directory do.

Together these two defects meant the script shipped in 5.33.1 could not complete a registration.

### ✅ Verified Against Production

A `client_credentials` token was issued by `https://sso.doneisbetter.com/api/oauth/token` for the newly registered `try-on` client — the first live token issued on this grant. HTTP 200 with `token_type: Bearer`, `expires_in: 3600`, `scope: manage_permissions`. The decoded JWT carries no `sub` claim, and `client_id` and `aud` both equal the try-on client_id, confirming the 5.33.0 machine-token fix behaves in production as the unit tests describe.

---

## [5.33.1] - 2026-08-21

### 🔧 Changed

**`scripts/enable-m2m-clients.mjs` can now revoke machine access, not only grant it.** `REVOKE_M2M="name-a,name-b"` removes the `client_credentials` grant and the `manage_permissions` scope from the named clients. Revocation takes precedence over the eligibility pass, so a client named for revocation is never re-granted by the same run.

Needed because granting machine access is only half an operational tool: a credential that can be handed out must be withdrawable with the same tooling and the same dry-run safety, rather than by hand-written database edits.

Intended use is withdrawing the grant from **`SSO Admin Dashboard`** — an internal browser admin UI authenticating through `authorization_code`. A standing machine credential there can rewrite any user's app-permission records, which is meaningful attack surface for a capability it does not use.

### 📝 Registration

**Added `scripts/register-try-on-client.mjs`.** `try-on` needs to call other SSO-protected services but had no OAuth client registered at all. Registers it as a confidential machine client: `client_credentials` only, no redirect URIs, `manage_permissions` scope.

### Note on `fanmass`

`fanmass` **keeps** its `client_credentials` grant. Its own users do not authenticate through SSO — it needs machine access to call other services that are SSO-protected, which is exactly what this grant is for. Its registration script still declares it a public client while its live record is confidential; the live record is the correct one and the script is stale.

## [5.33.0] - 2026-08-21

### 🐛 Fixed

**`client_credentials` grant was completely non-functional.** `pages/api/oauth/token.js` calls `generateAccessToken({ userId: null, ... })` for machine-to-machine tokens, but `lib/oauth/tokens.mjs` guarded on `if (!userId || !clientId || !scope)`. Since `null` is falsy, every `client_credentials` request threw and the token endpoint's catch returned HTTP 500 `server_error`. The guard now requires only `clientId` and `scope`.

Machine tokens deliberately carry **no `sub` claim**, which is what `validateAccessToken()` already expected (`userId: decoded.sub || null, // null for client_credentials tokens`). Setting `sub` to the client id instead would have let a machine token satisfy the `canReadOwnPermission` user-identity comparison in the permission routes.

**`manage_permissions` was never a registered scope.** It is the scope the permission-write APIs gate on and the default scope the `client_credentials` grant issues, yet it was absent from `SCOPE_DEFINITIONS`. Consequences: `validateScopes()` rejected it as unknown, and it was missing from OIDC discovery. It is now registered and marked `machineOnly`, so `validateScopes()` — which gates only the interactive `/authorize` flow — still refuses to issue it on a user-bound token. That preserves the previous security property: a single end user of an app must never be able to consent to a scope that would let them rewrite every other user's permission records.

**OIDC discovery advertised an unimplemented auth method.** `token_endpoint_auth_methods_supported` listed `client_secret_basic`, but `pages/api/oauth/token.js` only ever reads credentials from the request body. Conformant client libraries commonly prefer Basic when it is offered, and would fail with a confusing `client_id is required` 400. Only `client_secret_post` is advertised now. Discovery also now lists `client_credentials` under `grant_types_supported` and `manage_permissions` under `scopes_supported`.

New contract tests in `__tests__/oauth-client-credentials.test.js` cover machine-token issuance, the absent `sub` claim, the unchanged user-bound path, and the machine-only scope guard.

**Undefined scopes removed from client registration scripts.** `scripts/bootstrap-admin-client.mjs` registered `admin:users`, `admin:clients`, `admin:settings` and `admin:activity`, and `scripts/register-amanoba-client.mjs` registered `admin`. None of these are defined in `lib/oauth/scopes.mjs` and no authorization decision anywhere reads them, so `validateScopes()` would reject any request for one. The admin UI requests exactly `openid profile email` (`pages/admin/index.js`) and its real authorization comes from an approved `sso-admin-dashboard` record in `appPermissions`, not from a scope. Existing client records in the database still carry these dead scopes; clearing them is a separate data change.

### 🔧 Changed

**`@types/node` 20.19.40 → 24.13.3**, matching the runtime. Pinned exact per `.npmrc`'s `save-exact=true`.

**Node.js 20.x → 24.x.** Node 20 reached upstream end-of-life on 2026-04-30, and Vercel disables Node 20 in Project Settings on 2026-10-01, after which new deployments pinned to 20 fail to build. `engines.node` is now `24.x`, `.github/workflows/repo-guardrails.yml` runs `node-version: 24`, and a new `.nvmrc` pins `24` for local work. Note that `engines.node` overrides the Vercel dashboard's Node.js Version setting — the dashboard already read 24.x for this project while `package.json` was still pinning deployments to 20.

The full `npm run verify` chain (lint, type-check, 87 tests across 15 suites, build, guardrails, docs) passes on Node 24.16.0.

**`CLAUDE.md` Section 7 restructured.** It recorded limitations observed in a hosted cloud sandbox as unqualified facts about "this environment," and later sessions skipped genuinely possible work as a result. The section now separates constraints that apply everywhere from sandbox-only observations, and each sandbox-only bullet carries the one-line command to re-check it. The MongoDB Atlas bullet is corrected: raw TCP to the cluster is reachable from a local macOS workstation, so the DB-dependent tooling under `scripts/` does work there.

---

## [5.32.1] - 2026-08-16

### 🐛 Fixed

**`docs/ARCHITECTURE.md` accuracy pass**: a documentation-vs-code audit found several places where the architecture doc no longer matched runtime behavior.

- **Node.js version**: doc said "18+"; `package.json` actually requires `20.x` with `engine-strict=true` — 18 would fail to install.
- **Wrong collection name**: doc said legacy admin sessions are stored in a collection called `sessions`. The real collection, per `lib/sessions.mjs`, is `adminSessions`. The name `sessions` only ever existed as an unused config default (`lib/config.js`) that nothing reads — almost certainly the source of the wrong doc value.
- **12 undocumented collections added** to "Important Collections": `accessTokens`, `refreshTokens`, `authorizationCodes`, `userConsents`, `adminSessions`, `publicMagicTokens`, `adminMagicTokens`, `loginPins`, `systemSettings`, `resourcePasswords`, `passwordResetTokens`, `orgEmailConfigs`. Most notably, the core OAuth token/code storage (`refreshTokens`, `authorizationCodes`) and the storage backing two auth methods `docs/README.md` already documents as supported (PIN verification, magic links) were entirely absent from the collection catalog.
- **Second CSRF mechanism documented**: `lib/middleware/csrf.mjs` implements two independent CSRF mechanisms — the Origin/Referer allowlist (`validateRequestOrigin`, already documented) and a separate callback-state cookie (`validateStateCsrfToken` + helpers) that protects the Google/Facebook OAuth callback `state` parameter. The second mechanism is real, actively wired up, and covered by tests, but the doc's dedicated CSRF section previously made no mention of it. Also noted: pre-session endpoints (e.g. admin login) don't run the Origin check, since there's no session cookie yet to protect — a reasonable gap that just wasn't documented as intentional.
- Removed a stale, unused `validateCsrf` import from `pages/api/admin/login.js` — the function it named was already dead code (never called anywhere; the file's own comment confirms it "was never wired up"), and the import was misleading about what CSRF protection that route actually runs.

No runtime behavior changed except the one dead import removal, which has no functional effect.

---

## [5.32.0] - 2026-08-12

### 🔧 Changed

**GDS dependency migration to the current release line**: `@doneisbetter/gds-*@3.0.0` (an abandoned npm-registry mirror, three major versions behind) replaced directly with `@sovereignsquad/gds-*@6.0.0`, the actual current release from the upstream `sovereignsquad/general-design-system` repo, published on GitHub Packages. A full read of upstream's changelog across the entire `4.1.4`–`6.0.0` range confirmed neither breaking change in that span (a component relocated to a dedicated subpath, a brand-palette re-base) affects any component SSO uses.

- `package.json`: `@sovereignsquad/gds-admin`, `-core`, `-theme`, `gds-compliance`, and `gds-eslint-config` all moved to the new scope at `6.0.0`; the umbrella `@sovereignsquad/gds` package was dropped entirely — confirmed unused (no bare import anywhere in source), it was dead weight carried over unchanged from the original `3.0.0` pin
- Rewrote the import specifier in all 43 source files that consumed a `@doneisbetter/gds-*` package
- Added `@mantine/dates@9.2.1` as an explicit direct dependency to resolve an `ERESOLVE` peer conflict (GDS peer-requires `@mantine/dates`, which npm was otherwise resolving to a newer Mantine line than the rest of the app pins)

**Install source — vendored tarballs, not a live registry install (stopgap)**: GDS publishes exclusively to GitHub Packages (`npm.pkg.github.com`), which requires an authenticated `read:packages`-scoped token for every install, and no such credential is configured for this repo's CI/Vercel environments. Rather than leave the migration blocked indefinitely on that credential, all five consumed `@sovereignsquad/gds-*` packages are vendored as prebuilt tarballs in `vendor/gds/` and referenced via `file:` dependencies — the exact pattern already used successfully in production by sibling apps `camera`, `messmass`, and `launchmass`. Each tarball was built from the upstream `gds-v6.0.0` tag using GDS's own official `npm run pack:release` tooling and verified byte-identical (SHA-256) to what those apps already ship. `.npmrc`'s GitHub Packages registry block was removed — nothing needs it anymore. See `docs/DESIGN_SYSTEM.md`'s "Install Source (Stopgap)" section for the full tradeoff and the plan to move back to a registry install once `GDS_PACKAGES_TOKEN` exists.

### 🔒 Governance

Two patterns moved from optional cleanup to governance-required as of this release line, confirmed against upstream's actual compliance tooling source, not just its docs prose:

- **`lib/theme/mantineTheme.js`** migrated from `extendGdsTheme(...)` to `createPublicBrandTheme({ overrides: mantineThemeOverrides })` — `extendGdsTheme` is now documented as "no longer a canonical adopter path" and prohibited in consumer-owned theme files. The override object itself is unchanged; only the composing function changed.
- **OAuth provider buttons** (`pages/login.js`): replaced the hand-rolled Facebook/Google `Button` markup with the canonical `ProviderIdentityButtonGroup`, closing SSO's oldest tracked `gds-adoption.json` exception. Both providers are natively supported by the shipped registry. `pages/register.js` was listed in the old exception's scope but never actually implemented provider buttons of its own — confirmed by reading the file, not assumed. `gds-adoption.json` gained a `compliance.identityProviderBranding` policy block (`approvedProviders: ["google", "facebook"]`) governing this usage going forward.
- Removed the now-orphaned `public/google-mark.svg` asset (no longer referenced anywhere).

**Testing**: `npm run verify` clean, including a real `npm ci`/build against the vendored tarballs (not mocked). `npm run gds:validate-manifest`, `npm run gds:check`, and `npm run lint:gds` all clean. Visually verified login, register, and a docs page against a real local build (screenshots), not just a clean compile.

- Bumped service version to `5.32.0` (minor: real, if small, visible UI change to the login page's provider buttons — not just a dependency bump)

---

## [5.31.1] - 2026-08-01

### 🐛 Fixed

**OAuth `prompt=login` infinite redirect loop**: `authorize.js` checks `prompt === 'login'` (force re-authentication) before it checks whether the user is now authenticated. The four places that reconstruct the authorize retry URL after a client completes re-authentication — the password-login and PIN-completion branches in `pages/login.js`, and the Facebook/Google OAuth callbacks — were forwarding `prompt` from the decoded `oauth_request` unconditionally, including `login`. A consuming app sending `prompt=login` (e.g. to force fresh credentials right after a user logs out) meant every successful login attempt looped straight back to the login form instead of ever completing authorization: the user's credentials were valid and their session really was being established each time, they just never saw it, because the retry immediately bounced them back to the login form again.

Fixed by dropping `prompt=login` specifically when rebuilding the retry URL at all four call sites, once re-authentication has just happened — that's the one job that value has, and it's done. Other `prompt` values (`consent`, `select_account`) still have meaning post-login and are preserved. Reported against a real consuming app (messmass): login → logout → immediate re-login failed silently every time; a full page reload before retrying "fixed" it only because it reset the client app's own in-memory "just logged out" flag that was the trigger for sending `prompt=login` in the first place.

### 🔧 Changed
- Bumped service version to `5.31.1` (patch: bug fix only, no new features or breaking changes)

---

## [5.31.0] - 2026-07-31

### 🔒 Security

Comprehensive security remediation covering authentication, authorization, CSRF, rate limiting, and error handling. All items below were found and fixed in the same pass; none were previously tracked as known issues.

**Critical fixes:**
- **Admin session identity resolution**: `getAdminUser()` (`lib/auth.mjs`) now resolves the acting admin's identity from the database-verified session record instead of the unsigned `userId` field carried in the session cookie payload, closing a path where a modified cookie field could impersonate a different admin
- **OAuth consent approval validation**: `/api/oauth/authorize/approve` previously performed no server-side validation of the authorization request it was approving; it now shares the same `validateAuthorizationRequest()` / `checkInternalClientAccess()` logic (`lib/oauth/authorizationValidation.mjs`) as `/api/oauth/authorize`, closing an account-authorization gap
- **CSRF enforcement**: added `validateRequestOrigin()` (`lib/middleware/csrf.mjs`), an Origin/Referer allowlist check, and wired it into all state-changing admin and public-session endpoints (previously unenforced anywhere in the codebase)
- **Admin password storage**: admin passwords are now stored as bcrypt hashes (`lib/users.mjs`); legacy stored values are compared in constant time (`lib/timingSafeCompare.mjs`) and transparently rehashed to bcrypt on next successful login
- **Open redirect**: `lib/redirects.mjs` `isSafeRedirectTarget()` no longer treats protocol-relative targets (`//evil.example`) as safe relative paths

**High-severity fixes:**
- Rate limiters (`lib/middleware/rateLimit.mjs`) are now actually applied across public login/register/forgot-password, magic-link and PIN endpoints (admin and public), and OAuth token/authorize endpoints — most were previously defined but never wired into a route; also fixed a hang bug where a limiter's own `429` response was never observed by the promisified wrapper (`applyRateLimiter()` in `lib/apiHelpers.mjs`), which affected the one limiter that was already live
- Fixed three admin login flows (`magic-login`, `verify-pin`, `magic-link`) that issued a session cookie the session reader could not parse, silently breaking those sign-in paths
- Constant-time comparison applied to magic-link tokens, password-reset tokens, login PINs, resource passwords, and PKCE code-verifier checks (`lib/timingSafeCompare.mjs`)

**Error handling:**
- Fixed the admin dashboard's error parser (`lib/adminAuthFlow.js`) to surface the server's actual error detail instead of always falling back to a generic message; this was the direct cause of a live "Internal server error" report when creating an OAuth client with `require_pkce` set (root cause: `require_pkce` was silently dropped by `registerClient()`, and the resulting validation error was discarded behind a generic string before reaching the UI)
- Extended real error detail to authenticated admin/API routes (audit logs, user management, app-permission management); left pre-auth and public-facing routes on generic messages intentionally, to avoid account/email enumeration

**Other:**
- Removed unauthenticated debug endpoints (`/api/debug/*`, `/api/admin/check-google-admin`) and other dead code
- Restored the `repo-guardrails` CI workflow, which had been dropped from `.github/workflows/`

### 🔧 Changed
- Bumped service version to `5.31.0` to reflect the current runtime state, including role-system simplification, OIDC scope/nonce work, and this security pass, none of which had been reflected past `docs/CHANGELOG.md` until now

---

## [5.30.0] - 2026-01-20

### 🎯 Major Changes

#### Role System Simplification
- **BREAKING**: Consolidated all admin roles into single `admin` role
- **Removed**: `super-admin`, `owner`, `superadmin` roles
- **New Structure**: `none`, `user`, `admin` (3 roles only)
- **Migration**: All existing admin-type roles automatically migrated to `admin`
- **Benefit**: Simplified permission management across all integrated applications

#### OAuth2/OIDC Scope Clarification
- **IMPORTANT**: Deprecated `roles` scope (not a standard OIDC scope)
- **Changed**: Role information now included in `profile` scope
- **Standard Scopes**: `openid`, `profile`, `email`, `offline_access`
- **ID Token**: `role` claim included when `profile` scope is requested
- **Compatibility**: Prevents `invalid_scope` errors in client applications

#### Enhanced Nonce Support
- **Added**: Full OIDC nonce parameter support throughout authorization flow
- **Flow**: Capture nonce in `/authorize` → Store with code → Return in ID token
- **Security**: Prevents replay attacks in OIDC flows
- **Compatibility**: Lenient validation (allows providers that don't return nonce)

### ✨ Added

**OAuth2/OIDC Improvements:**
- Nonce parameter support in `/api/oauth/authorize`
- Nonce storage in authorization code
- Nonce claim in ID token generation (`lib/oauth/tokens.mjs`)
- Nonce validation in token exchange
- Next.js rewrites for standard OAuth2 endpoints (`/authorize`, `/token`, `/userinfo`)

**Documentation:**
- Comprehensive integration troubleshooting guide in `THIRD_PARTY_INTEGRATION_GUIDE.md`
- Common integration issues and solutions section
- Production-tested integration requirements document
- Detailed scope and claim documentation
- Role system migration guide (`ROLE_SYSTEM_MIGRATION.md`)

**Admin Features:**
- "+ New OAuth Client" button on admin dashboard
- Improved OAuth client creation workflow
- Better permission validation throughout admin APIs

### 🔧 Changed

**Role System:**
- `admin` role now has all permissions previously held by `super-admin`
- Admin UI simplified (removed superadmin option from dropdowns)
- OAuth client management now requires `admin` role (not `super-admin`)
- User management requires `admin` role
- App permission management requires `admin` role

**OAuth2 Server:**
- Updated scope whitelist to use standard OIDC scopes
- Role information moved from `roles` scope to `profile` scope
- Improved error messages for scope validation
- Better handling of redirect URI validation

**API Endpoints:**
- `/api/admin/oauth-clients` - Create/update requires `admin` (was `super-admin`)
- `/api/admin/oauth-clients/[id]` - Update/delete requires `admin`
- `/api/admin/oauth-clients/[id]/regenerate-secret` - Requires `admin`
- `/api/admin/users` - Create/update requires `admin`
- `/api/admin/users/[id]/apps/[clientId]/permissions` - Requires `admin`
- `/api/admin/settings/pin-verification` - Requires `admin`

**Session Management:**
- Simplified role checks in `lib/auth.mjs`
- Updated `decodeSessionToken`, `getAdminUser`, `hasPermission` functions
- Removed complex role hierarchy logic

### 🐛 Fixed

**OAuth2 Flow:**
- Fixed missing nonce in ID token causing `invalid_nonce` errors
- Fixed `invalid_scope` errors when requesting non-standard scopes
- Fixed blank authorization page when using `prompt=login`
- Fixed redirect URI exact matching (case-sensitive, no trailing slash)

**Admin Access:**
- Fixed admin button visibility in OAuth clients page
- Fixed session validation in frontend components
- Fixed role propagation in admin APIs

**Permission System:**
- Fixed role validation across all admin endpoints
- Fixed permission checks for multi-app authorization

### 📚 Documentation

**Updated:**
- `README.md` - Clarified scopes, roles, and OAuth2 flow
- `THIRD_PARTY_INTEGRATION_GUIDE.md` - Added troubleshooting, updated examples
- `ARCHITECTURE.md` - Updated role system, OAuth2 endpoints
- `docs/MULTI_APP_PERMISSIONS.md` - Simplified for 3-role system

**Added:**
- `ROLE_SYSTEM_MIGRATION.md` - Technical migration details
- `MIGRATION_SUMMARY.md` - Executive summary of changes
- `CHANGELOG.md` - This file

**Client-Side Documentation:**
- Created integration guides for client applications
- Added Vercel environment variable setup guides
- Documented common integration issues and solutions

### 🔒 Security

**Enhanced:**
- Nonce validation prevents replay attacks in OIDC flows
- State parameter validation (unchanged, maintained)
- Token signature verification using JWKS (unchanged, maintained)
- HttpOnly cookie security (unchanged, maintained)

**Simplified:**
- Clearer role-based access control
- Reduced attack surface through role consolidation
- Better audit trail with unified admin role

### ⚠️ Breaking Changes

1. **Role Migration Required:**
   - All `super-admin`, `owner`, `superadmin` roles → `admin`
   - Database migration needed (automatic via scripts)
   - Session tokens regenerated on next login

2. **Scope Changes:**
   - `roles` scope deprecated (use `profile` instead)
   - Client applications requesting `roles` scope will get `invalid_scope` error
   - Update client configurations to use `openid profile email offline_access`

3. **API Permission Changes:**
   - Endpoints requiring `super-admin` now require `admin`
   - Role hierarchy removed (flat structure)

### 📋 Migration Guide

**For SSO Admins:**
1. Run migration script: `node scripts/migrate-roles.mjs`
2. Verify all users have correct roles in database
3. Test admin access in dashboard
4. Update any hardcoded role checks in custom scripts

**For Client Applications:**
1. Update `SSO_SCOPES` environment variable
   - ❌ Old: `openid profile email roles`
   - ✅ New: `openid profile email offline_access`
2. Update OAuth client configuration in SSO admin UI
   - Remove `roles` from allowed scopes
3. Update role extraction code:
   - Extract `role` claim from ID token (included in `profile` scope)
4. Test SSO login flow
5. Verify role information in session

**For Integrated Apps (e.g., Amanoba):**
1. Update environment variables in Vercel/production
2. Redeploy application
3. Clear browser cache
4. Test login and admin access
5. Monitor logs for role tracking

### 🧪 Testing

**Verified:**
- ✅ OAuth2 authorization code flow with nonce
- ✅ ID token includes role claim when profile scope requested
- ✅ Admin role has all necessary permissions
- ✅ Client applications can extract role from ID token
- ✅ Nonce validation works correctly
- ✅ State validation unchanged and working
- ✅ Token refresh flow unchanged and working

**Integration Testing:**
- ✅ Amanoba.com production integration successful
- ✅ Role preservation on login
- ✅ Admin access working correctly
- ✅ Error handling with locale detection

---

## [5.29.0] - 2026-01-18

### Added
- Security hardening with 5-layer approach
- Rate limiting for all endpoints
- Security headers (HSTS, CSP, etc.)
- Input validation with Zod schemas
- Session security improvements
- Audit logging for SOC 2/GDPR compliance

### Changed
- Enhanced session management with device fingerprinting
- Improved password security (bcrypt 12 rounds)
- Better error handling and logging

---

## [5.28.0] - 2026-01-15

### Added
- Multi-app permission management system
- Per-app authorization workflow
- Admin approval for new users
- Real-time permission sync

### Changed
- Updated appPermissions schema
- Improved OAuth2 client management UI
- Better permission audit trail

---

## [5.27.0] - 2026-01-10

### Added
- Google Sign-In integration
- PIN verification (6-digit code on 5th-10th login)
- Account linking across login methods

### Changed
- Improved social login workflow
- Better email verification flow

---

## [5.26.0] - 2026-01-05

### Added
- Facebook OAuth integration
- Magic link authentication
- Forgot password flow

### Changed
- Enhanced public user authentication
- Improved session management

---

## Earlier Versions

See Git history for changes before v5.26.0.

---

## Version Numbering

- **Major** (X.0.0): Breaking changes, major rewrites
- **Minor** (5.X.0): New features, non-breaking changes
- **Patch** (5.30.X): Bug fixes, documentation updates

---

**Maintained By:** SSO Development Team  
**Last Updated:** 2026-08-01  
**Current Version:** 5.31.1
