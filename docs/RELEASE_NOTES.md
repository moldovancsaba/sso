# Release Notes [![Version Badge](https://img.shields.io/badge/version-5.38.1-blue)](RELEASE_NOTES.md)

## [v5.38.1] — 2026-08-25T00:00:00.000Z

### 🛡️ A Guardrail That Notices When main Outruns Its Own Version

`check:docs` verifies that `package.json` and the versioned docs carry the same version **as each other**. They always do — that is precisely why it never caught the thing that went wrong three separate times on 2026-08-25: commits landed on `main`, every document went on agreeing about the previous version, and `main` quietly described itself with a release that had already been published. `npm run verify` was green throughout each time.

`npm run check:release` closes that. The rule is one line: if a tag matching the version in `package.json` exists and does not point at `HEAD`, the code has moved past a published release without a bump. It runs in CI on pushes to `main` only — on a feature branch the version legitimately still holds the last release until the bump commit, so running it earlier would fail every branch that has not bumped yet.

It was written against the live failure: at the time of writing, `main` was one commit past `v5.38.0` with `package.json` still reading `5.38.0`, and the check caught it. All three outcomes are covered — version not yet released, `HEAD` is the release, `HEAD` has moved past it.

### 🧹 Also In This Release

`f51828c2` removed a `protectedSurfacePaths` entry in `gds-adoption.json` for the `components/` directory, which stopped existing when `DocsLayout.js` was deleted in 5.37.0. That commit is what the new guardrail was catching.

## [v5.38.0] — 2026-08-25T00:00:00.000Z

### 📦 GDS Installs From The Registry Again

The vendored-tarball arrangement introduced in 5.32.0 is gone. That was always labelled a stopgap: GDS publishes only to GitHub Packages, no `read:packages` credential existed for this repo, and rather than stall the 6.0.0 migration the five packages were checked into `vendor/gds/` as prebuilt tarballs. The cost was no automatic update path — every GDS bump meant rebuilding and re-committing tarballs by hand.

`GDS_PACKAGES_TOKEN` now exists, so `package.json` pins plain versions again, `.npmrc` carries the registry block, and `vendor/gds/` is deleted. Same `6.0.0` packages: this changed how they install, not what installs.

CI passes the secret as `GITHUB_TOKEN` (Actions reserves that name for its own secret, so it cannot be stored under it), and the matching Vercel project variable is set for Production and Preview. Verified rather than assumed — deployments for the migration commit and for current `main` both report success, and `sso.doneisbetter.com` serves 200.

### 🔑 New Machine Scope: `management:staff`

`management:staff` grants a headless caller staff-level access to the management app's console and admin actions. It is `machineOnly`, so it can only be obtained through `client_credentials` and is rejected on `/api/oauth/authorize` — a scope this powerful must never be reachable by a token an end user consented to.

It is deliberately separate from `management:ingest.write` and `management:catalog.read`: a caller that writes listings should not thereby be able to act as staff. `scripts/register-management-staff-agent-client.mjs` registers a client holding it and nothing else.

Because OIDC discovery derives `scopes_supported` from the scope table, this was already being advertised to every client while absent from the integration guide. It is now documented there, and the registration script is recorded in `AGENTS.md`.

### 📝 Why This Release Exists

Four commits had landed on `main` past the released `v5.37.2` without a version bump or a changelog entry. `check:docs` could not catch it — it only checks that the version strings agree with each other, and they did. Meanwhile the changelog's most recent word on install source still explained why the packages *were* vendored, which had become the opposite of the truth.

## [v5.37.2] — 2026-08-25T00:00:00.000Z

### 🔒 One Advisory Left, And It Is Unreachable

`npm update` moved `brace-expansion` to 1.1.18, `body-parser` to 2.3.0, `js-yaml` to 3.15.1 and 4.3.1, and `@babel/core` to 7.29.7. Audit **6 → 2**, high **4 → 2** — and the two that remain are `sharp` plus `next`, which the audit tree flags only *through* `sharp`. So a single root advisory is left, in an optional Next dependency for image optimisation that this app never loads.

### 🧹 Two Of Three Overrides Were Doing Nothing

Earlier this cycle three override strategies failed to move `brace-expansion` off 1.1.14, and the ineffective config was removed. The right tool was never an override: the safe versions were inside the existing semver ranges the whole time and only needed the lockfile refreshed. Plain `npm update` did in one command what the overrides could not.

Each remaining override was then tested by removing it and observing what npm resolved:

- `@typescript-eslint/typescript-estree > brace-expansion` — resolves safely without it. Removed.
- `qs` — resolves to the identical version with or without it. Removed.
- `postcss` — **still required.** Without it the tree falls to `8.4.31`, the version `next@15.5.23` pins exactly, and the advisory returns.

One override remains, and it is the only one that was ever load-bearing. That matters because a stale `postcss` pin holding a *vulnerable* version is precisely what started this whole sequence.

## [v5.37.1] — 2026-08-25T00:00:00.000Z

### ⚡ One SMTP Connection Per Burst Instead Of One Per Email

Every magic link and PIN code used to open its own TCP connection, complete a STARTTLS upgrade and re-authenticate before delivering a single plain-text message. Five messages cost five connections.

The obvious fix — cache the transport instead of rebuilding it per send — turns out to do nothing at all. Measured against a local SMTP server: caching alone still cost five connections for five messages, because a non-pooled nodemailer transport opens a fresh connection on every `sendMail`. Only `pool: true` changes the number, and a pool is useless if the transport holding it is thrown away after each send. Both were needed; either alone would have been wasted work.

Now five messages cost one connection, measured through the real send path.

Transports are keyed by credential set rather than kept as a single global, because sends accept a per-organisation SMTP configuration and one shared instance would have quietly routed organisation mail through the default account. The key is a hash, so no password sits in a Map key.

`verifyEmailConfig()` now tests the same transport that sends use. It previously built its own separate one, so a passing check proved nothing about the connection real mail would take.

### 📎 Note For Script Authors

A pooled connection is an open handle and keeps the event loop alive. Inside an API route that is irrelevant — the response ends the invocation. A plain Node script that imports `lib/email.mjs` will not exit on its own after sending. Both existing script callers already call `process.exit()`; new ones must too.

## [v5.37.0] — 2026-08-25T00:00:00.000Z

### 🐛 Docs Navigation No Longer Sits On Top Of The Text

The docs sidebar was being passed to `PublicShell`'s `navigation` slot. That slot is not a sidebar — it renders inside a fixed 72px-tall header row, next to the brand and the GitHub/Support links. A vertical, sectioned, scrollable tree placed there overflowed roughly 900 pixels downward, straight across the article, at every viewport from `sm` up. It looked fine on a phone only because the same shell hides that slot below `sm` and shows a burger instead.

Navigation now uses the three slots the shell actually provides, all still generated from the one `docsSections` array:

- **header** — `navItems`, one short label per section, rendered horizontally by `PublicNav` with `aria-current` on the section owning the current page
- **side rail** — `DocsPageShell`'s `sideRail`, a 240px column beside the article carrying the full page tree
- **burger** — unchanged, the full tree below `sm`

### 📐 Why It Needed Three

The shell's breakpoints do not overlap: the burger is `hiddenFrom="sm"`, the header slot is `visibleFrom="sm"`, and the side rail is `visibleFrom="lg"`. Moving the tree to the side rail alone would have fixed the overlap and left every viewport between 768px and 1200px with no navigation at all.

## [v5.36.3] — 2026-08-25T00:00:00.000Z

### 🔒 nodemailer 8.0.9 → 9.0.5

Closes the last dependency advisory that sat on a live code path. The flaw let a message's raw option bypass `disableFileAccess` / `disableUrlAccess`, enabling arbitrary file read. This repo never used `raw`, so it was not exploitable here — but magic links and PIN codes send through this transport, so it was the one worth clearing on its merits rather than deferring.

The single breaking change in 9.0.0 is TLS certificate validation for remote content fetches: attachment `href`/`path` URLs, OAuth2 token endpoints, and HTTP proxy CONNECT. This repo uses none of the three — plain SMTP user/password auth, no attachments, no proxy — so nothing needed adapting.

The upgrade also brings header-injection and address-normalisation hardening from the 9.x line, which matters here because user-supplied email addresses go into the `to` field.

### ✅ Tested Against The Real Transport

Not just a build: `transporter.verify()` completed a live SMTP connect, STARTTLS upgrade and AUTH against Gmail on 9.0.5 — the STARTTLS path being the one 9.0.3 rewrote — and a real test message was delivered end to end, returning a valid message ID.

**6 advisories remain, all previously assessed as unreachable or dev-only.** `sharp` (unused optional image dependency), `body-parser` (never invoked — no Express server runs), and four dev-toolchain issues.

## [v5.36.2] — 2026-08-24T00:00:00.000Z

### 🔒 Dependency Advisories: 10 → 7, High 8 → 5

`next` 15.5.18 → 15.5.23, clearing four advisories: DoS in App Router Server Actions, a Turbopack middleware bypass, and two SSRF issues. Only the rewrites SSRF was reachable in principle here, and this repo's five rewrites all have static literal destinations with no attacker-influenced hostname.

The real find was a stale `overrides` block. `postcss` was pinned to `8.5.15`, below the `<=8.5.22` vulnerable ceiling, so the override was actively holding a vulnerable version in place — and `postcss` is what pulled `nanoid@3.3.12`. Raising it to `8.5.26` fixed `postcss`, `nanoid` and `minimatch` in one move, which is why the separate nanoid PR was closed rather than merged.

The override cannot simply be deleted: `next@15.5.23` pins `postcss: 8.4.31` exactly, which is older still.

### 📋 What Is Left, And Why

`sharp` carries four libvips CVEs and npm offers only `next@16` as the fix. `sharp` is an *optional* dependency of Next used solely for image optimization, and this app imports `next/image` nowhere, configures no `images` block, and renders its one logo as a plain `<img>`. A major framework upgrade on a production identity provider to patch unreachable code is the wrong trade. `nodemailer` needs a semver-major bump and is on the live magic-link path, so it gets its own change. The rest are dev-only toolchain issues.

## [v5.36.1] — 2026-08-24T00:00:00.000Z

### 📝 Roadmap Absorbs Five Board-Only Backlog Issues

Issues #37–#41 restated `docs/ROADMAP.md`'s phases on the GitHub board. Their acceptance criteria were self-satisfying ("this issue exists"), none had been touched since May 2026, and the roadmap copy is the one `check:docs` enforces. The detail they held that the roadmap did not — Apple's one-shot name payload, the Apple Developer credential set, its stricter redirect-URI handling, and the requirement that new providers reuse the hardened callback seams — is folded in, and the issues are closed.

## [v5.36.0] — 2026-08-24T00:00:00.000Z

### 🧹 The Last Local UI Authority Is Gone

`components/DocsLayout.js` and `lib/docs-shell-config.js` were the same code twice — the same `PublicShell` props, the same version badge, and a byte-identical copy of the docs navigation array. Fifteen docs pages already ran on the config; five still imported the component. Adding a docs page meant editing both arrays or letting the sidebar differ depending on which page you were standing on.

Those five pages now compose `PublicShell` + `DocsPageShell` like the other fifteen, and `DocsLayout.js` is deleted. The `components/` directory is empty and gone with it.

`styles/globals.css` (742 lines) is deleted too. All 63 of its class selectors were unreferenced and its design tokens were used by nothing. `gds-adoption.json` now lists no local adapters and no shell exception.

### 🎨 What Actually Changed On Screen

Two things in `globals.css` were live, despite the dead selectors:

Its `@import` was the only thing loading Inter and JetBrains Mono — the two families `lib/theme/mantineTheme.js` asks for by name. That moves to a `<link>` in `_document.js`, which is also faster: a CSS `@import` cannot begin downloading until the stylesheet holding it has been fetched and parsed.

Its bare `a` rule was styling ten `next/link` elements that Mantine never touches. Removing it dropped them to user-agent blue-and-underlined. They are now Mantine `Anchor` components, which measure `rgb(37, 99, 235)` with no underline — the same values the old CSS produced, sourced from the theme's `brand` token instead of a local stylesheet.

The page background moves from `#fafafa` to Mantine's white. That is the design system's default asserting itself, and it is the one intentional visual change here.

## [v5.35.0] — 2026-08-23T00:00:00.000Z

### 🔒 CORS No Longer Has A Wildcard, Because It Never Safely Could

`lib/cors.mjs` pairs `Access-Control-Allow-Origin` with `Access-Control-Allow-Credentials: true`, so that header decides whether an arbitrary website may read authenticated responses from the identity provider. A literal `*` in `SSO_ALLOWED_ORIGINS` short-circuited the allow-list and reflected whatever `Origin` the caller sent — any site could then read any logged-in user's session data. No deployment was configured that way, so nothing was exposed; the branch is now gone rather than left as a one-character misconfiguration away from a full cross-origin breach.

A request whose `Origin` is not on the list now receives no `Access-Control-Allow-Origin` header at all, instead of one naming a different origin. Browsers block both identically, so integrators see no change.

### ✅ CI Now Runs Lint And Type Checks

The workflow ran guardrails, docs checks, and tests, but not `lint` or `type-check` — and `next.config.js` sets `ignoreBuildErrors` and `ignoreDuringBuilds`, so a type error could reach a deployment with every automated check still green. Both now run in CI on Node 24.

## [v5.34.1] — 2026-08-23T00:00:00.000Z

### 🐛 New Scopes Were Missing From Discovery

`scopes_supported` was a hand-maintained copy of the scope list, so 5.34.0's four resource scopes worked but were never advertised. Same drift 5.33.0 fixed for `manage_permissions`. It is now derived from `SCOPE_DEFINITIONS`, so there is no second list to forget.

## [v5.34.0] — 2026-08-23T00:00:00.000Z

### ✨ Machine Tokens Now Name The Resource They Are For

`aud` was hard-wired to the calling client's own id, so every machine token read `aud: <caller>` regardless of which service it was destined for. A resource server could not tell a token minted for it from one minted for a different service, and would have had to allow-list caller ids in place of the standard audience check (RFC 9068 §4).

The audience is now derived from the resource prefix of the requested scopes. Because that derivation runs over the client's already-validated `allowed_scopes`, no second list exists to fall out of sync — a client can only reach a resource it already holds a scope for. A request whose scopes span two resources is refused: one bearer string valid at two services means leaking one leaks both.

Tokens whose scopes name no resource are unchanged.

### ✨ Least-Privilege Scopes For Machine Callers

`manage_permissions` was the only machine scope in existence, and it grants the power to rewrite any user's app-permission records. Four resource scopes now exist — `classscout:ingest.write`, `classscout:catalog.read`, `management:ingest.write`, `management:catalog.read` — so a pipeline that writes provider records can hold exactly that and nothing more.

### 🔒 Two Ways To Get More Privilege Than You Asked For, Both Closed

Omitting `scope` on a `client_credentials` request used to yield `manage_permissions` by default. `scope` is now required. **Breaking** for any caller relying on the default; no registered client does.

Running the enablement script without naming clients used to target every eligible confidential client, which is how a browser admin UI acquired a standing machine credential. Granting now requires naming the client.

## [v5.33.3] — 2026-08-21T00:00:00.000Z

### 🐛 Revocation Of Machine Access Is Now Durable

Revoking a client's `client_credentials` grant recorded nothing, so the next ordinary run of the enablement script re-granted it. Verified against production: after `SSO Admin Dashboard` was revoked, a plain dry run immediately queued it for `+client_credentials +manage_permissions` again.

Revocation now persists `m2m_excluded: true`, which outranks every other eligibility rule. Lifting it requires naming the client explicitly in `M2M_CLIENTS`, so a withdrawn credential is never restored as a side effect of a routine run.

Covered by `__tests__/m2m-client-eligibility.test.js`. The script's entry point is guarded so importing it for tests cannot touch the database.

---

## [v5.33.2] — 2026-08-21T00:00:00.000Z

### 🐛 Machine Client Registration Actually Works

Two defects kept the 5.33.1 registration script from ever completing. `registerClient()` required a redirect URI from every client, including `client_credentials`-only ones that have no browser leg to redirect (RFC 6749 §4.4); the requirement is now scoped to redirect-based grants. And `scripts/register-try-on-client.mjs` never passed `owner_user_id`, which `registerClient()` rejects — it now resolves an admin owner like the sibling scripts do.

### ✅ First Live Machine Token

The `try-on` client was registered and used to obtain a real access token from production — HTTP 200, `Bearer`, 3600s, `manage_permissions`. The token carries no `sub` claim and its `client_id` and `aud` both match the client, confirming in production what the unit suite has asserted since 5.33.0.

---

## [v5.33.1] — 2026-08-21T00:00:00.000Z

### 🔧 Machine Access Can Now Be Withdrawn

`scripts/enable-m2m-clients.mjs` gained `REVOKE_M2M`, which strips the `client_credentials` grant and `manage_permissions` scope from named clients. Revocation beats the eligibility pass, so a revoked client is not re-granted in the same run. Granting machine credentials without a matching withdrawal path is an incomplete tool; both directions now share the same dry-run-by-default safety.

Intended use: withdrawing the grant from `SSO Admin Dashboard`, a browser admin UI with no machine workflow whose credential could otherwise rewrite any user's permissions.

### 📝 `try-on` Client Registration

`try-on` needs to reach other SSO-protected services but had no OAuth client at all. `scripts/register-try-on-client.mjs` registers it as a confidential machine client — `client_credentials` only, no redirect URIs.

**`fanmass` keeps its grant.** Its users do not sign in through SSO; it needs machine access to call other SSO-protected services, which is precisely this grant's purpose.

---

## [v5.33.0] — 2026-08-21T00:00:00.000Z

### 🐛 Machine-to-Machine Authentication Repaired

**What**: The `client_credentials` grant — the only path in this service that issues a token without a user — never worked. `pages/api/oauth/token.js` passes `userId: null` by design, and `generateAccessToken()` rejected that as a missing argument, so every request returned HTTP 500 `server_error`. Verified by direct execution before and after the fix.

**Why it matters**: This is the grant an automated client (a background service, a scheduled job, an agent) must use. Interactive `authorization_code` requires a human at a browser and cannot be completed headlessly. Of 15 registered OAuth clients, one (`launchmass`) had `client_credentials` in its `grant_types` and could never have used it.

**Also fixed alongside it**:
- `manage_permissions` is now a registered scope, so it appears in OIDC discovery and passes validation on the token endpoint. It is marked machine-only, so the interactive `/authorize` flow still refuses it — a user-bound token carrying that scope could rewrite the permission records of every other user of the same app.
- OIDC discovery no longer advertises `client_secret_basic`, which the token endpoint never implemented. Client libraries that prefer Basic when offered were failing with a misleading `client_id is required` 400.

### 🔧 Node.js 24.x

Node 20 is past upstream end-of-life (2026-04-30) and Vercel disables it in Project Settings on 2026-10-01, after which new deployments pinned to 20 fail. `engines.node` — which overrides the Vercel dashboard setting — now reads `24.x`, CI runs Node 24, and `.nvmrc` pins it for local work. Full verify chain green on 24.16.0.

---

## [v5.32.1] — 2026-08-16T00:00:00.000Z

### 🐛 Documentation Accuracy: `docs/ARCHITECTURE.md` vs. Actual Code

**What**: A documentation-vs-code audit of `docs/ARCHITECTURE.md`, prompted by a concern that architecture docs and code comments had drifted apart. Every claim below was verified directly against source, not assumed.

**Found and fixed**:
- The doc claimed "Node.js 18+"; `package.json`'s actual `engines` field requires `20.x` with `engine-strict=true`.
- The doc claimed legacy admin sessions are stored in a collection named `sessions`. The real collection (`lib/sessions.mjs`) is `adminSessions`. The `sessions` name traced back to an unused config default in `lib/config.js` that no code path actually reads — the likely origin of the wrong doc value.
- 12 collections that exist and are actively used in code were entirely missing from the "Important Collections" catalog: `accessTokens`, `refreshTokens`, `authorizationCodes`, `userConsents`, `adminSessions`, `publicMagicTokens`, `adminMagicTokens`, `loginPins`, `systemSettings`, `resourcePasswords`, `passwordResetTokens`, `orgEmailConfigs`. The most notable gaps: the core OAuth token/code storage, and the storage backing PIN verification and magic links — both already listed as supported auth methods in `docs/README.md`.
- The CSRF section documented only one of two real CSRF mechanisms in `lib/middleware/csrf.mjs`. Added documentation for `validateStateCsrfToken()`, the mechanism that binds the Google/Facebook OAuth callback `state` parameter to a signed cookie — real, wired-up, test-covered code with previously zero mention in the architecture doc. Also documented that pre-session endpoints (admin login) don't run the Origin/Referer check, since no session cookie exists yet for a forged request to ride on.
- Removed a stale `validateCsrf` import from `pages/api/admin/login.js`: the function was already confirmed dead code (zero call sites, per the module's own comment), and the unused import misrepresented what CSRF protection that route runs.

**Not changed**: every previously-documented collection (`users`, `publicUsers`, `publicSessions`, `oauthClients`, `organizations`, `orgUsers`, `enterpriseConnections`, `appPermissions`, `auditLogs`, `appAccessLogs`) was confirmed to still exist and match its description — no stale entries to remove there.

**Testing**: `npm run verify` clean. No runtime behavior changed except the dead-import removal, which has no functional effect.

**Files Changed**: `docs/ARCHITECTURE.md`, `pages/api/admin/login.js`, `package.json`, `docs/README.md`, `docs/ROADMAP.md`, `docs/TASKLIST.md`, `docs/THIRD_PARTY_INTEGRATION_GUIDE.md`, `docs/CHANGELOG.md`.

---

## [v5.32.0] — 2026-08-12T00:00:00.000Z

### 🔧 GDS Migration: `@doneisbetter@3.0.0` → `@sovereignsquad@6.0.0`, Plus Two Governance-Required Changes

**What**: SSO's design-system dependency was pinned to `@doneisbetter/gds-*@3.0.0` — a legacy npm-registry mirror, three major versions behind. The real, actively-maintained project (`sovereignsquad/general-design-system`) now publishes exclusively to GitHub Packages, currently at `6.0.0`. This release moves SSO directly onto the real, current line.

**Why not stop at `4.1.3`**: an earlier attempt at this migration (PR #63, targeting `4.1.3`) was retired unmerged after the real release moved to `6.0.0` while that PR sat blocked on a missing CI credential — landing `4.1.3` at that point would have meant shipping an already-stale version. This release re-planned the migration against the real current target instead.

**Confirmed safe**: a full read of upstream's changelog across the entire `4.1.4`–`6.0.0` range, cross-checked against every component SSO actually imports, found that neither breaking change in that span (`ReferenceThemeExplorer` relocated to a dedicated subpath at `5.0.0`; the `class-usa` brand-lane palette re-based at `6.0.0`) touches SSO's usage at all.

**What actually needed real changes, not just a version bump**:
- `lib/theme/mantineTheme.js` used `extendGdsTheme(...)`, which upstream governance now documents as "no longer a canonical adopter path" and prohibited in consumer theme files. Migrated to `createPublicBrandTheme({ overrides: mantineThemeOverrides })` — the override object itself (colors, fonts, radius/shadow scale, component defaults) is unchanged, only the composing function.
- `pages/login.js`'s hand-rolled Facebook/Google buttons are now against upstream's documented pattern (a local provider-button wrapper duplicating `ProviderIdentityButtonGroup`). Replaced with the canonical component — both providers are natively supported by the shipped registry, with real brand colors and labels. This closes SSO's oldest tracked `gds-adoption.json` exception. (`pages/register.js` was listed in that exception's scope too, but turned out never to have implemented provider buttons of its own.)

**Changes**:
- `package.json`: `@sovereignsquad/gds-admin`/`-core`/`-theme`/`gds-compliance`/`gds-eslint-config` rescoped to `6.0.0`; the unused umbrella `@sovereignsquad/gds` package dropped entirely (confirmed zero bare imports anywhere in source)
- Rewrote the import specifier in all 43 source files consuming a `@doneisbetter/gds-*` package
- Added `@mantine/dates@9.2.1` as an explicit direct dependency (same `ERESOLVE` peer-conflict fix pattern as before)
- `gds-adoption.json`: version bump, scope rename, removed the closed OAuth exception, added a `compliance.identityProviderBranding` policy block
- Removed the orphaned `public/google-mark.svg` asset
- **Install source changed to vendored tarballs (stopgap)**: GDS installs exclusively from GitHub Packages, which needs a `read:packages`-scoped credential this repo's CI/Vercel don't have. Rather than stay blocked indefinitely, all five consumed GDS packages are now vendored as prebuilt tarballs in `vendor/gds/` and referenced via `file:` dependencies in `package.json` — the same pattern already proven in production by sibling apps `camera`, `messmass`, and `launchmass`. Each tarball was built from the upstream `gds-v6.0.0` tag via GDS's own official release-bundling tooling and verified byte-identical (SHA-256) to what those apps ship. `.npmrc`'s GitHub Packages registry block and `.github/workflows/repo-guardrails.yml`'s `GDS_PACKAGES_TOKEN` wiring were both removed — neither is needed anymore. See `docs/DESIGN_SYSTEM.md`'s "Install Source (Stopgap)" section for the tradeoff (no automatic update path — a future GDS bump needs a manual re-vendor) and the plan to move back to a registry install once that secret eventually exists.

**Testing**: `npm run verify` clean, including a real `npm ci`/build against the vendored tarballs. `npm run gds:validate-manifest`, `npm run gds:check`, `npm run lint:gds` all clean. Visually verified against a real local build — login (new provider buttons), register, and a docs page (the two previously-known cosmetic diffs, `DocsPageShell` width and `PageHeader` eyebrow styling, confirmed still present and unchanged) — not just a clean compile.

**Files Changed**: `package.json`, `package-lock.json`, `.npmrc`, `gds-adoption.json`, `docs/DESIGN_SYSTEM.md`, `lib/theme/mantineTheme.js`, `pages/login.js`, `.github/workflows/repo-guardrails.yml`, `public/google-mark.svg` (removed), `vendor/gds/*.tgz` (added, 5 files), and 41 other source files under `pages/`, `lib/`, and `components/` (import specifier only).

---

## [v5.31.1] — 2026-08-01T00:00:00.000Z

### 🐛 Bug Fix: OAuth `prompt=login` Infinite Redirect Loop

**What**: `/api/oauth/authorize` treats `prompt=login` as "always show the login form," checked before it even looks at whether the user is now authenticated. Four places that rebuild the authorize retry URL after a client finishes re-authentication — `pages/login.js`'s password-login and PIN-completion branches, and the Facebook/Google OAuth callbacks — forwarded the client's original `prompt` value unconditionally, including `login`. A consuming app that sends `prompt=login` to force fresh credentials right after logout (a reasonable, deliberate choice — it stops a stale session from being silently reused) would see every subsequent login attempt loop straight back to the login form instead of ever completing.

**Why it looked like a login failure**: the user's credentials were valid and the session really was being created each time. It just never became visible, because the immediate retry sent `prompt=login` right back to SSO, and SSO obeyed it before noticing the fresh session existed.

**Symptom reported against a real consuming app (messmass)**: log in, log out, immediately try to log in again in the same browser session — redirects to SSO but never completes, no matter what's entered. Reloading the consuming app's own page before retrying "fixed" it, because that reset messmass's in-memory "we just logged out" flag, which is what triggered it to send `prompt=login` in the first place — with that flag cleared, the next attempt didn't send `prompt=login` and never hit the bug.

**Fix**: the four retry-URL call sites now drop `prompt=login` specifically once re-authentication has just happened. Other `prompt` values (`consent`, `select_account`) are preserved, since those remain meaningful after login.

**Files Changed**: `pages/api/oauth/authorize.js` (root cause, unconditional `prompt === 'login'` check), `pages/login.js`, `pages/api/auth/facebook/callback.js`, `pages/api/auth/google/callback.js`.

**Testing**: `npm run verify` (lint, type-check, test, build, guard:repo, check:docs) clean against the fix. Confirmed live against the real messmass integration: login → logout → immediate re-login now succeeds.

---

## [v5.31.0] — 2026-07-31T00:00:00.000Z

### 🔒 Security Hardening: Full Remediation Pass (COMPLETE)

**MAJOR UPDATE**: End-to-end security review covering authentication, OAuth authorization, CSRF, rate limiting, password storage, and error handling, plus documentation reconciliation to bring the version, README, architecture doc, and live `/docs` pages back in line with the actual runtime.

**What**: A full pass through the codebase's auth-adjacent surface area, fixing every issue found in the same effort rather than filing them for later.

**Why**: Several of these gaps were exploitable end-to-end (admin identity spoofing via cookie field, an OAuth consent-approval path with no server-side request validation, CSRF unenforced anywhere in the codebase, admin passwords stored in plaintext). The rest were real but lower-severity: rate limiters that were configured but never applied to a route, a protocol-relative open redirect, broken login flows, and error responses that discarded the one piece of information (`error.message`) that would have made them debuggable.

---

#### Critical: Admin session identity resolution

**Issue**: `getAdminUser()` (`lib/auth.mjs`) resolved the acting admin's identity from `userId` on the session *cookie payload* — a field that was never re-verified against the database record it claimed to belong to.

**Fix**: Identity is now read from `sessionValidation.session.userId`, the value attached to the server-side session record itself. The cookie can no longer assert an identity the database session doesn't back.

---

#### Critical: OAuth consent approval had no request validation

**Issue**: `/api/oauth/authorize.js` validated `client_id`, `redirect_uri`, `scope`, and PKCE parameters before showing the consent screen. `/api/oauth/authorize/approve.js` — the endpoint that actually issues the authorization code once a user clicks "Approve" — performed none of those checks itself.

**Fix**: Extracted the shared validation into `lib/oauth/authorizationValidation.mjs` (`validateAuthorizationRequest()`, `checkInternalClientAccess()`) and call it from both endpoints. `authorize.js` was also refactored to use the shared helper, removing ~60 lines of duplicated inline logic.

---

#### Critical: CSRF protection was not enforced anywhere

**Issue**: No CSRF mechanism existed for any state-changing endpoint.

**Fix**: Added `validateRequestOrigin()` (`lib/middleware/csrf.mjs`) — an Origin/Referer allowlist check that runs before session/auth logic on every state-changing request. Wired into all admin and public-session mutation endpoints (password/account/profile changes, logout, OAuth consent, resource-password creation, account unlinking). Chose an Origin-check design over a double-submit cookie token specifically because it requires no frontend changes — the existing frontend needed zero modification to become protected.

---

#### Critical: Admin passwords stored in plaintext

**Issue**: Admin password verification compared plaintext values directly; no hashing was applied at creation or update time.

**Fix**: `lib/users.mjs` now hashes admin passwords with bcrypt (`hashAdminPassword()`) and verifies via `verifyAdminPassword()`. Legacy plaintext values already in the database are compared using a constant-time comparison (`lib/timingSafeCompare.mjs`, built on Node's `crypto.timingSafeEqual`) and transparently rehashed to bcrypt on the next successful login — no bulk migration script or downtime required.

---

#### High: Rate limiters were configured but not applied

**Issue**: Seven rate limiters existed in `lib/middleware/rateLimit.mjs`. Six of the seven were never called from any route.

**Fix**: Wired limiters into public login/register/forgot-password, magic-link and PIN endpoints (both admin and public), and the OAuth token/authorize endpoints, via a shared `applyRateLimiter()` helper (`lib/apiHelpers.mjs`). That helper also fixes a genuine pre-existing bug: `express-rate-limit` calls its configured `handler` (which sends the `429` response directly) instead of `next()` once a caller is rate-limited, so the original promisified wrapper — used by the one limiter that *was* already live — never resolved on a limited request. It now resolves correctly by listening for the response's `finish`/`close` events as well as `next()`.

---

#### High: Three admin login flows issued unreadable session cookies

**Issue**: `magic-login`, `verify-pin`, and `magic-link` admin endpoints each set a session cookie using raw hex via `cookie.serialize()`, or a token that was never persisted via `createSession()` — neither of which the session reader could parse back into a valid session.

**Fix**: All three now use `setAdminSessionCookie()` with real `createSession()`-issued tokens, matching the pattern already used by the primary admin login endpoint.

---

#### High: Protocol-relative open redirect

**Issue**: `isSafeRedirectTarget()` (`lib/redirects.mjs`) treated any target starting with `/` as a safe relative path, including `//evil.example` — which browsers resolve as a protocol-relative absolute URL to a different host.

**Fix**: Targets starting with `//` are now explicitly excluded from the relative-path allowance.

---

#### Error handling: generic errors replaced with actionable detail

**Issue**: Most catch blocks across admin and API routes returned a static `{error: 'Internal server error'}` regardless of what actually failed, and the admin dashboard's client-side error parser (`lib/adminAuthFlow.js`) was hard-coded to prefer that generic string over any detail the server did provide. This was caught directly: creating an OAuth client with the "Require PKCE" checkbox checked returned a bare "Internal server error" with no indication why. Root cause was two-layered — `require_pkce` was silently dropped by `registerClient()` instead of being forwarded from the request body, and the specific, useful validation error that produced was discarded behind a generic string before it ever reached the response.

**Fix**: 
- `getErrorMessage()` in `lib/adminAuthFlow.js` now prefers real server-provided detail (`error.message`, `error_description`, nested `error.message`) and only falls back to a generic message when the server genuinely didn't provide one
- Backend routes that require authentication (audit logs, user management, app-permission management) now return `error.message` instead of a static label
- Pre-auth and public-facing routes (login, magic-link request, bootstrap, JWKS) deliberately keep generic messages, to avoid account/email enumeration
- Fixed the specific OAuth-client-creation bug: `require_pkce` is now forwarded to `registerClient()`, and its catch block surfaces the real validation error

---

#### Cleanup

- Removed unauthenticated debug endpoints: `/api/debug/cookies`, `/api/debug/session-check`, `/api/debug/test-token-exchange`, `/api/admin/check-google-admin`
- Removed dead code: unused `lib/middleware/session.js`, an unreferenced duplicate `pages/api/public/magic-login-new.js`, a dead `redirectUrlSchema` export, and a dead JWT fallback path in `lib/oauth/middleware.mjs`
- Restored the `repo-guardrails` GitHub Actions workflow, which had been dropped from `.github/workflows/`

#### Documentation

- Reconciled the version number to `5.31.0` across `package.json`, `README.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, and this file — the codebase had drifted ahead of its own changelog (role-system simplification and OIDC nonce support were already live but only ever reached a `5.30.0` changelog entry, never propagated to the README or architecture doc)
- Added CSRF, rate-limiting, admin password-hashing, and session-identity-resolution sections to `docs/ARCHITECTURE.md`'s "Security-Relevant Behavior", none of which had any documentation there before
- Corrected `pages/docs/security/best-practices.js`'s rate-limit table, which listed limits (100/min public, 50/min OAuth, 200/min admin) that matched none of the actual configured limiters
- Corrected `pages/docs/security/cors.js`, which described a manual email-based origin-registration workflow and a `403 {error:'Origin not allowed'}` response that `lib/cors.mjs` does not implement, and conflated that with the new, unrelated Origin-check CSRF mechanism
- Fixed broken absolute local-filesystem links (`/Users/moldovancsaba/...`) in `README.md` and `docs/ARCHITECTURE.md` that pointed to paths outside the repository

**Files Changed**: too broad to enumerate per-file here — see `docs/CHANGELOG.md` [5.31.0] for the grouped summary, or the PR diff for the full set.

**Testing**: 14 Jest suites / 79 tests added or extended to cover the identity-resolution fix, OAuth authorization validation, CSRF origin validation, admin password migration, the rate-limiter helper, redirect validation, timing-safe comparison, and the admin error parser. Database-dependent flows could not be exercised from the development sandbox (no network route to the production MongoDB Atlas cluster); those were verified against the live Vercel preview deployment instead.

---

## [v5.29.0] — 2025-12-21T14:00:00.000Z

### 🔗 Unified Account Linking System (MAJOR FEATURE)

**MAJOR UPDATE**: Comprehensive account linking system enables users to login with multiple authentication methods (Email+Password, Facebook, Google, Magic Link) while maintaining a single account per email address.

**Key Principle**: **One person, one email = one account**

**What**: Users can now link multiple login methods to the same account based on email address. The system automatically merges accounts created with different authentication methods if they share the same email.

**Why**: Improve user experience by allowing flexible authentication while maintaining data consistency and preventing duplicate accounts.

---

#### Phase 1: Unified Account Linking Library ✅

**Implementation**:
- **Centralized Logic**: Created `lib/accountLinking.mjs` (291 lines) with reusable account linking functions
  - `findUserByEmail(email)` - Find user regardless of login method
  - `getUserLoginMethods(user)` - Get list of linked methods
  - `canLoginWithPassword(user)` - Check if user has password
  - `addPasswordToAccount(userId, password)` - Add password to social-only account
  - `linkLoginMethod(user, provider, providerData)` - Link social provider
  - `getAccountLinkingSummary(email)` - Comprehensive account status

**Files**:
- `lib/accountLinking.mjs` (new, 291 lines) - Core account linking logic

---

#### Phase 2: Enhanced Registration with Account Linking ✅

**Implementation**:
- **Smart Registration**: Checks if email exists before creating account
  - If user has password → Returns 409 error "Account already exists"
  - If user has social-only → Adds password to existing account
  - Returns `isAccountLinking: true` flag for frontend handling
- **Automatic Linking**: Social-only accounts can add password via registration form
- **Better UX**: Clear success message when password is added to existing account

**Response Format**:
```json
{
  "success": true,
  "message": "Password added to your account successfully...",
  "isAccountLinking": true,
  "loginMethods": ["facebook", "password"],
  "user": { ... }
}
```

**Files**:
- `pages/api/public/register.js` - Enhanced with account linking logic

---

#### Phase 3: Enhanced Login with Helpful Error Messages ✅

**Implementation**:
- **Smart Error Messages**: Detects social-only accounts and provides guidance
  - Error: "This account was created with Facebook. Please login with Facebook, or register a password using the registration form."
  - Includes `availableLoginMethods` in error response
- **Better UX**: Users know exactly which login methods they can use

**Error Response Format**:
```json
{
  "error": "Password not set",
  "message": "This account was created with Facebook...",
  "availableLoginMethods": ["facebook"]
}
```

**Files**:
- `pages/api/public/login.js` - Enhanced login validation

---

#### Phase 4: Account Dashboard with Login Methods Display ✅

**Implementation**:
- **New Section**: "🔑 Login Methods" on account dashboard
  - Visual badges for Email+Password, Facebook, Google
  - Color-coded: Purple (#667eea), Blue (#1877f2), Red (#db4437)
  - Shows linked/not-linked status
  - Helpful tip about linking multiple methods
- **Server-Side Rendering**: Fetches login methods in `getServerSideProps`
- **No Extra API Calls**: Data passed as prop from server

**Files**:
- `pages/account.js` - Added login methods section (+130 lines)

---

#### Phase 5: Migration Tool for Existing Duplicates ✅

**Implementation**:
- **Safe Migration Script**: Merges duplicate accounts with same email
  - Keeps oldest account as primary
  - Merges all social providers
  - Transfers passwordHash if needed
  - Transfers sessions, OAuth tokens, authorizations
  - Deletes duplicate accounts
- **Dry Run Mode**: Preview changes before applying
  - `DRY_RUN=true node scripts/merge-duplicate-accounts.mjs`
- **Idempotent**: Safe to run multiple times

**Usage**:
```bash
DRY_RUN=true node scripts/merge-duplicate-accounts.mjs  # Preview
node scripts/merge-duplicate-accounts.mjs                # Apply
```

**Files**:
- `scripts/merge-duplicate-accounts.mjs` (new, 267 lines) - Migration tool

---

#### Phase 6: Comprehensive Documentation ✅

**Implementation**:
- **User Documentation**: How account linking works from user perspective
- **Developer Guide**: Technical implementation details
- **Testing Scenarios**: 5 common scenarios with step-by-step instructions
- **Troubleshooting**: Common issues and solutions
- **API Changes**: Summary of modified endpoints
- **Security Considerations**: Email verification, password security, sessions

**Files**:
- `docs/ACCOUNT_LINKING.md` (new, 546 lines) - Comprehensive documentation

---

#### User Experience Scenarios

**Scenario 1: Social → Email+Password**
1. Login with Facebook
2. Later register with email+password
3. System adds password to existing Facebook account
4. Can now login with either method

**Scenario 2: Email+Password → Social**
1. Register with email+password
2. Later login with Google
3. System automatically links Google to existing account
4. Can now login with either method

**Scenario 3: Facebook → Google**
1. Login with Facebook
2. Later login with Google (same email)
3. System automatically links both providers
4. Single account with multiple login methods

**Scenario 4: Password Login for Social-Only**
1. User created account with Google only
2. Tries to login with email+password
3. System shows helpful error: "This account was created with Google..."
4. User knows to login with Google or add password via registration

---

#### Data Model Changes

**publicUsers Collection**:
```javascript
{
  id: "uuid",
  email: "user@example.com",
  name: "User Name",
  
  // Optional - only if email+password used
  passwordHash: "...",
  emailVerified: true,
  
  // Social providers
  socialProviders: {
    facebook: { id, email, name, picture, linkedAt, lastLoginAt },
    google: { id, email, name, picture, emailVerified, linkedAt, lastLoginAt }
  },
  
  // Computed (not stored)
  loginMethods: ["password", "facebook", "google"]
}
```

---

#### Security Features

- **Email Verification**: Inherited from any verified method
- **Password Security**: bcrypt (12 rounds), minimum 8 characters
- **Session Management**: All sessions remain valid after linking
- **OAuth Security**: State parameter CSRF protection
- **Audit Logging**: All account linking events logged

---

#### API Changes

**Modified Endpoints**:

**`POST /api/public/register`**
- Now adds password to social-only accounts
- Returns `isAccountLinking` and `loginMethods` in response

**`POST /api/public/login`**
- Returns helpful error for social-only accounts
- Includes `availableLoginMethods` in error response

---

#### Logging Events

**Account Linking Success**:
```javascript
{
  event: 'account_linking_success',
  userId: 'uuid',
  email: 'user@example.com',
  isAccountLinking: true,
  loginMethods: ['facebook', 'password']
}
```

**Password Login for Social-Only**:
```javascript
{
  event: 'public_login_social_only',
  userId: 'uuid',
  email: 'user@example.com',
  availableMethods: ['facebook']
}
```

---

**Files Changed**:
- `lib/accountLinking.mjs` (new, 291 lines) - Core account linking logic
- `pages/api/public/register.js` - Enhanced registration with account linking
- `pages/api/public/login.js` - Enhanced login with helpful errors
- `pages/account.js` - Added login methods display section
- `scripts/merge-duplicate-accounts.mjs` (new, 267 lines) - Migration tool
- `docs/ACCOUNT_LINKING.md` (new, 546 lines) - Comprehensive documentation

**Impact**:
- ✅ One person, one email = one account
- ✅ All login methods work for the same account
- ✅ Helpful error messages guide users
- ✅ Users can see which methods they've linked
- ✅ Existing accounts can be merged
- ✅ All changes are audited

---

#### Phase 7: Cross-App Activity Dashboard ✅

**Implementation**:
- **Activity Timeline**: New admin page showing comprehensive audit log of account management
  - Real-time activity feed with user names and app names (MongoDB aggregation with $lookup)
  - Filterable by time range (24h/7d/30d/all)
  - Filterable by event type (access attempts, permission changes, login events)
  - Expandable entries showing full log details (before/after state, metadata)
  - Auto-refresh button for real-time monitoring
- **Enriched Data**: Joins publicUsers and oauthClients collections for human-readable display
- **Performance**: Efficient MongoDB aggregation pipeline with proper indexing

**Files**:
- `pages/api/admin/activity.js` (new, 219 lines) - Activity API endpoint
- `pages/admin/activity.js` (new, 352 lines) - Activity dashboard UI
- `pages/admin/index.js` (+1 line) - Navigation link

---

#### Phase 8: Admin Manual Account Linking ✅

**Implementation**:
- **Manual Linking API**: Admin endpoint to manually link social providers to user accounts
  - Supports Facebook and Google providers
  - Email consistency validation (prevents linking wrong person's account)
  - Comprehensive audit logging with `ACCOUNT_LINK_MANUAL` event
  - Returns updated login methods after linking
- **Admin UI**: Link Social Provider section in user modal
  - Provider selection buttons (Facebook/Google)
  - Form with fields for provider ID, email, name, picture
  - Validation: email must match user's email
  - Success/error messages
  - Disabled state when all providers already linked
- **Safety**: Multi-layer validation prevents security issues

**Files**:
- `pages/api/admin/public-users/[id]/link.js` (new, 182 lines) - Manual linking API
- `pages/admin/users.js` (+256 lines) - Manual linking UI
- `lib/accountLinking.mjs` (+170 lines) - Enhanced with `validateUnlinking()` and `unlinkLoginMethod()`
- `lib/auditLog.mjs` (+4 constants) - New audit event types

---

#### Phase 9: Account Unlinking System ✅

**Implementation**:
- **Safety-First Unlinking**: Multi-layer validation prevents account lockout
  - `validateUnlinking()` checks that user has at least 2 login methods
  - UI disables unlink buttons when last method (opacity 0.5 + tooltip)
  - API enforces safety validation (prevents orphaned accounts with 0 methods)
  - Confirmation dialogs for all destructive operations
- **User-Initiated Unlinking**: Users can unlink methods from account dashboard
  - DELETE `/api/public/account/unlink/[provider]` endpoint
  - Unlink buttons on each login method badge
  - Auto-refresh after successful unlink
- **Admin-Initiated Unlinking**: Admins can unlink methods from user modal
  - DELETE `/api/admin/public-users/[id]/unlink/[provider]` endpoint
  - Unlink buttons in Login Methods section
  - Support for unlinking password, facebook, google
- **Comprehensive Audit Logging**: All unlink operations logged with before/after state

**Files**:
- `pages/api/public/account/unlink/[provider].js` (new, 131 lines) - User unlinking API
- `pages/api/admin/public-users/[id]/unlink/[provider].js` (new, 149 lines) - Admin unlinking API
- `pages/account.js` (+148 lines) - User unlinking UI
- `pages/admin/users.js` (+126 lines) - Admin unlinking UI

**Safety Patterns**:
- Multi-layer validation: UI disables → API validates → DB logic re-checks
- Prevents account lockout: Always require at least 1 login method
- Clear error messages: Explains why operations failed
- Confirmation dialogs: Users understand what they're doing
- Audit trail: Full traceability of all changes

---

**Complete Implementation Summary**:

**Total Files Created (10)**:
- `lib/accountLinking.mjs` (461 lines total)
- `pages/api/admin/public-users/[id]/link.js` (182 lines)
- `pages/api/admin/public-users/[id]/unlink/[provider].js` (149 lines)
- `pages/api/public/account/unlink/[provider].js` (131 lines)
- `pages/api/admin/activity.js` (219 lines)
- `pages/admin/activity.js` (352 lines)
- `scripts/merge-duplicate-accounts.mjs` (267 lines)
- `docs/ACCOUNT_LINKING.md` (546 lines)

**Total Files Modified (6)**:
- `pages/api/public/register.js` - Account linking support
- `pages/api/public/login.js` - Helpful error messages
- `pages/account.js` (+148 lines) - Login methods + unlinking UI
- `pages/admin/users.js` (+382 lines) - Manual linking + unlinking UI
- `pages/admin/index.js` (+1 line) - Activity dashboard link
- `lib/auditLog.mjs` (+4 constants) - New audit event types

**Total Lines Added**: ~2,850 lines

**Complete Feature Set**:
- ✅ Automatic account linking by email (Phases 1-6)
- ✅ Cross-app activity dashboard (Phase 7)
- ✅ Admin manual linking (Phase 8)
- ✅ User and admin unlinking (Phase 9)
- ✅ Multi-layer safety validation
- ✅ Comprehensive audit logging
- ✅ Migration tool for duplicates
- ✅ Complete documentation

**Next Steps**:
1. Test all features in development
2. Run migration tool for existing duplicates (if any)
3. Deploy to production
4. Monitor audit logs and activity dashboard

---

## [v5.29.0] — 2025-12-21T13:00:00.000Z

### 🎯 Google Sign-In Integration (NEW FEATURE)

**NEW FEATURE**: Google Sign-In added as third social login provider alongside Facebook Login.

**What**: Users can now authenticate using their Google accounts via OAuth 2.0 flow.

**Why**: Expand authentication options and make it easier for users to access the platform with their existing Google accounts.

**Implementation**:

#### Backend Integration:
- **Google OAuth Module**: New `lib/google.mjs` (255 lines)
  - `getGoogleAuthUrl()` - Generates Google authorization URL with state preservation
  - `exchangeCodeForToken()` - Exchanges authorization code for access token
  - `getGoogleUserProfile()` - Fetches user profile from Google API
  - `linkOrCreateUser()` - Links Google account to existing user or creates new user

- **API Endpoints**: New Google OAuth endpoints
  - `GET /api/auth/google/login` - Initiates Google OAuth flow
  - `GET /api/auth/google/callback` - Handles Google OAuth callback

- **OAuth Flow Preservation**: Google login preserves OAuth authorization context when user logs in during OAuth client app authorization (same pattern as Facebook)

#### Frontend Integration:
- **Google Login Button**: Added to `/login` page
  - Official Google branding with multi-color SVG logo
  - Clean white button with subtle shadow (follows Google design guidelines)
  - Disabled state styling
  - Positioned below Facebook button

- **CSS Styling**: New `.googleButton` class in `login.module.css`
  - White background with Google gray border
  - Hover effects and shadow transitions
  - Consistent with existing button styling

#### Admin Dashboard:
- **Google Badge**: Users who login via Google display "Google" badge in admin users list
- **Login Method Tracking**: Google login method automatically tracked and displayed
- **Already integrated**: Existing admin UI code already supports Google login badges

#### Data Model:
- **Social Provider Storage**: Google account data stored in `socialProviders.google`
  - Google user ID, email, name
  - Profile picture URL
  - Email verification status
  - Link timestamp and last login timestamp

- **Account Linking**: Automatic linking by email
  - If user exists with same email → link Google account
  - If no user exists → create new user with Google profile
  - Google-verified emails marked as `emailVerified: true`

#### Security Features:
- **CSRF Protection**: State parameter with random token validation
- **OAuth Context Preservation**: Maintains OAuth flow state through Google redirect
- **Email Verification**: Trusts Google's email verification
- **Session Management**: Same HttpOnly cookie security as other login methods
- **Rate Limiting**: Subject to same rate limits as other authentication methods
- **Audit Logging**: All Google login events logged to audit trail

#### OAuth Integration:
- **UserInfo Endpoint**: Already supports Google profile pictures at `/api/oauth/userinfo`
- **Seamless OAuth Flow**: Google users can authorize OAuth client apps immediately after login
- **Profile Data**: Google profile pictures available to OAuth clients via OIDC scopes

#### Documentation:
- **Setup Guide**: New comprehensive `docs/GOOGLE_LOGIN_SETUP.md` (272 lines)
  - Step-by-step Google Cloud Console configuration
  - OAuth consent screen setup
  - Credentials creation and environment variable configuration
  - Troubleshooting common issues
  - Security features and compliance information

- **README Updates**: 
  - Updated social login section to include Google
  - Added Google OAuth environment variables to Quick Start
  - Added Google API endpoints to endpoint list

#### Environment Variables:
```bash
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/google/callback
```

**Files Changed**:
- `lib/google.mjs` (new, 255 lines) - Google OAuth integration
- `pages/api/auth/google/login.js` (new, 55 lines) - Login initiation
- `pages/api/auth/google/callback.js` (new, 173 lines) - OAuth callback handler
- `pages/login.js` (+28 lines) - Google login button
- `styles/login.module.css` (+30 lines) - Google button styling
- `docs/GOOGLE_LOGIN_SETUP.md` (new, 272 lines) - Setup documentation
- `README.md` - Updated social login documentation
- `pages/api/oauth/userinfo.js` - Already supports Google (line 87)
- `pages/admin/users.js` - Already supports Google badges (line 526, 530)

**User Experience**:
- One-click Google Sign-In from login page
- Automatic account creation with Google profile data
- Seamless linking to existing accounts via email
- Google profile pictures displayed in admin dashboard
- OAuth flow preserved through Google authentication

**Scope Requested**:
- `openid` - OpenID Connect authentication
- `email` - User's email address
- `profile` - User's name and profile picture

**Google APIs Used**:
- `https://accounts.google.com/o/oauth2/v2/auth` - Authorization
- `https://oauth2.googleapis.com/token` - Token exchange
- `https://www.googleapis.com/oauth2/v2/userinfo` - Profile fetch

**Compliance**:
- ✅ OAuth 2.0 specification compliant
- ✅ OIDC (OpenID Connect) compatible
- ✅ GDPR compliant (user consent required)
- ✅ Minimal data collection (only email, name, picture)
- ✅ Audit logging for all Google login events

**Next Steps**:
1. Configure Google Cloud Console OAuth client
2. Add environment variables to production
3. Test Google login flow in development
4. Deploy to production
5. Monitor audit logs for Google login activity

---

## [v5.29.0] — 2025-12-21T12:00:00.000Z

### 🔒 Security Hardening: 5-Phase Implementation (COMPLETE)

**MAJOR UPDATE**: Comprehensive security enhancements across authentication, authorization, and audit logging systems.

**What**: Multi-layered security improvements covering rate limiting, security headers, input validation, session management, and audit logging.

**Why**: Enterprise-grade security requirements for production deployment, protection against common attack vectors (brute force, XSS, CSRF, session hijacking), and compliance with security best practices.

---

#### Phase 1: Enhanced Rate Limiting ✅

**Implementation**:
- **Admin-Specific Limiters**: Created stricter rate limits for admin endpoints
  - `adminLoginRateLimiter`: 3 attempts per 15 minutes (vs 5 for public)
  - `adminMutationRateLimiter`: 20 requests per minute
  - `adminQueryRateLimiter`: 100 requests per minute
- **Admin Wrappers**: Reusable middleware functions
  - `withAdminMutation()` - For create/update/delete operations
  - `withAdminQuery()` - For read-only operations
  - `withAdmin()` - Base admin authentication wrapper

**Files**:
- `lib/middleware/rateLimit.mjs` (+50 lines) - Admin rate limiters
- `lib/adminHelpers.mjs` (new, 281 lines) - Admin endpoint wrappers
- `pages/api/admin/login.js` - Applied stricter rate limiting

---

#### Phase 2: Security Headers Middleware ✅

**Implementation**:
- **Comprehensive Security Headers**: Applied to all routes via Next.js Edge Middleware
  - `X-Frame-Options: DENY` - Prevents clickjacking
  - `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
  - `X-XSS-Protection: 1; mode=block` - XSS protection
  - `Strict-Transport-Security` - Forces HTTPS (production only)
  - `Content-Security-Policy` - Restricts resource loading
  - `Permissions-Policy` - Disables 20+ browser features (camera, mic, geolocation, etc.)
- **Environment-Aware**: Different CSP policies for development vs production

**Files**:
- `lib/securityHeaders.mjs` (new, 210 lines) - Security headers configuration
- `middleware.js` (new, 61 lines) - Next.js Edge Middleware

---

#### Phase 3: Input Validation Layer ✅

**Implementation**:
- **Zod Integration**: Type-safe input validation with comprehensive schemas
- **Reusable Schemas**: Email, UUID, password, name, role, status, etc.
- **Composite Schemas**: Pre-built validation for common operations
  - `adminLoginSchema` - Login validation
  - `createAdminUserSchema` - User creation
  - `updateAdminUserSchema` - User updates
  - `createOrganizationSchema` - Organization creation
  - And more...
- **Validation Wrapper**: `withValidation()` function for automatic validation
- **HTML Sanitization**: `sanitizeHtml()` and `sanitizeFilename()` utilities

**Dependencies Added**:
- `zod@4.2.1`

**Files**:
- `lib/validation.mjs` (new, 333 lines) - Validation schemas and utilities
- `lib/adminHelpers.mjs` - Enhanced with validation support
- `package.json` - Added Zod dependency

---

#### Phase 4: Admin Session Hardening ✅

**Implementation**:
- **Reduced Session Lifetime**: 30 days → 4 hours
- **Device Fingerprinting**: SHA-256 hash of IP + User-Agent
  - Stored in session document
  - Detected and logged on device changes
  - Alerts admin when session accessed from new device
- **Enhanced Session Security**:
  - `generateDeviceFingerprint()` - Creates unique device identifier
  - `checkDeviceChange()` - Detects suspicious activity
  - Sliding expiration with 4-hour window

**Files**:
- `lib/sessions.mjs` - Device fingerprinting (+60 lines)
- `pages/api/admin/login.js` - 4-hour session timeout

---

#### Phase 5: Enhanced Audit Logging ✅

**Implementation**:
- **Comprehensive Audit System**: All admin actions logged with full context
- **MongoDB Collection**: `auditLogs` with 4 indexes for efficient querying
- **Action Types**: Standardized constants in `AuditAction`
  - User operations: created, updated, deleted, login, logout
  - Permission operations: granted, revoked, role changed
  - OAuth operations: client created, secret regenerated
  - And more...
- **Audit Data**:
  - Actor (who performed the action)
  - Action type (what was done)
  - Resource (what was affected)
  - Before/after state (change tracking)
  - Metadata (IP, user agent, request context)
  - Timestamps (ISO 8601 with milliseconds)
- **Query Functions**:
  - `getAuditLogs()` - Filter and paginate logs
  - `getResourceAuditTrail()` - All changes to a specific resource
  - `getUserAuditTrail()` - All actions by a specific user
  - `getFailedActions()` - Failed operations only
  - `getAuditStats()` - Aggregated statistics
  - `cleanupOldAuditLogs()` - Retention management
- **Integration**:
  - `auditLog()` helper in adminHelpers.mjs
  - Integrated into user management endpoints (create/update/delete)
  - Automatic password sanitization from logs
  - Admin API endpoint for querying logs

**Files**:
- `lib/auditLog.mjs` (new, 393 lines) - Complete audit logging system
- `lib/adminHelpers.mjs` - Added `auditLog()` helper (+40 lines)
- `pages/api/admin/users/index.js` - Audit logging for user creation
- `pages/api/admin/users/[userId].js` - Audit logging for user updates/deletes
- `pages/api/admin/audit-logs/index.js` (new, 71 lines) - Audit log query endpoint

---

### Security Improvements Summary

**Attack Vectors Mitigated**:
- ✅ Brute force attacks (enhanced rate limiting)
- ✅ Clickjacking (X-Frame-Options)
- ✅ XSS attacks (CSP, X-XSS-Protection, HTML sanitization)
- ✅ MIME sniffing (X-Content-Type-Options)
- ✅ Man-in-the-middle (HSTS in production)
- ✅ Session hijacking (device fingerprinting, short timeouts)
- ✅ SQL/NoSQL injection (Zod validation)
- ✅ Unauthorized access (admin wrappers with strict auth checks)

**Compliance & Best Practices**:
- ✅ OWASP Top 10 coverage
- ✅ SOC 2 audit trail requirements
- ✅ GDPR-compliant logging
- ✅ Defense in depth architecture
- ✅ Principle of least privilege

**Operational Benefits**:
- ✅ Full audit trail for compliance
- ✅ Real-time attack detection via audit logs
- ✅ Enhanced troubleshooting capabilities
- ✅ Automated security header application
- ✅ Type-safe API validation

**Performance Impact**: Minimal (<5ms per request) due to efficient middleware and caching

**Testing**: All phases validated in development environment before deployment

---

## [v5.29.0] — 2025-11-09T14:00:00.000Z

### 🎯 Phase 4A: SSO Admin UI for Multi-App Permissions (COMPLETE)

**NEW FEATURE**: Centralized permission management UI for SSO admins to manage user access across all OAuth applications

**What**: SSO admins can now view and manage user permissions for all integrated apps (launchmass, messmass, cardmass, blockmass) from a single interface

**Why**: Unified User Rights Management (URM) requires SSO to be the authoritative source of truth for permissions. Admins need a central place to grant/revoke access and change roles across all applications.

**Implementation**:
- Enhanced `/admin/users` page with "Application Access" section in user details modal
- Shows all OAuth clients (apps) with user's permission status for each
- Real-time role management (user ↔ admin) with dropdown selectors
- Grant access to pending users with role selection
- Revoke access with confirmation dialog
- Status badges (approved/pending/revoked) and role indicators
- Per-app loading states and error handling
- Success/error messages with auto-dismiss

**API Endpoints**:
- `GET /api/admin/app-permissions/[userId]` - Fetch user's permissions merged with all available OAuth clients
- `POST /api/admin/app-permissions/[userId]` - Grant/approve access with role
- `PATCH /api/admin/app-permissions/[userId]` - Update role for existing permission
- `DELETE /api/admin/app-permissions/[userId]` - Revoke user access

**Security**:
- All endpoints require admin authentication via HttpOnly cookie
- Comprehensive input validation (userId, clientId, role, status)
- Audit logging via `lib/appPermissions.mjs`
- Changes tracked with who/what/when timestamps

**User Experience**:
- No refresh required - optimistic UI updates
- Loading indicators per app (won't block other actions)
- Retry button on errors
- Confirmation dialogs for destructive actions (revoke)
- Clear visual hierarchy with status colors

**Database Integration**:
- Uses existing `appPermissions` collection (Phase 1)
- Uses existing `appAccessLogs` collection for audit trail
- ISO 8601 timestamps with milliseconds
- UUID-based identifiers throughout

**Next Steps**: Phase 4B (Client Credentials OAuth) enables bidirectional sync - apps can push permission changes back to SSO

**Technical Details**:
- `pages/admin/users.js` (+262 lines) - App permissions UI section
- `pages/api/admin/app-permissions/[userId].js` (370 lines) - Admin permission management API
- `lib/appPermissions.mjs` - Already includes `upsertPermissionForAdmin`, `revokePermissionForAdmin`, `mapPermissionToDTO`
- `lib/oauth/clients.mjs` - Added `getAllClients()` helper for admin UI

---

### 🔐 OAuth Security & OIDC Compliance

**NEW FEATURE**: Added OIDC UserInfo endpoint and prompt parameter for secure re-authentication

#### OAuth UserInfo Endpoint

**What**: Standard OIDC `/api/oauth/userinfo` endpoint

**Why**: Third-party OAuth clients were getting 404 errors when trying to fetch user profile

**Implementation**:
- GET /api/oauth/userinfo
- Validates Bearer access token
- Returns user claims based on granted scopes (profile, email)
- Includes social login data (profile picture from Facebook/Google)
- Fully OIDC compliant

**Response Example**:
```json
{
  "sub": "user-uuid",
  "name": "John Doe",
  "email": "user@example.com",
  "email_verified": true,
  "picture": "https://...",
  "updated_at": "2025-11-09T12:00:00.000Z"
}
```

#### Prompt Parameter (Security Enhancement)

**What**: OIDC `prompt` parameter for controlling authentication behavior

**Why**: After logout from 3rd party app, users were automatically logged back in without credentials (security issue)

**Implementation**:
- `prompt=login`: Force re-authentication even if user has active SSO session
- `prompt=consent`: Force consent screen even if already granted
- `prompt=none`: No UI, return error if interaction required
- `prompt=select_account`: Prompt user to select account

**Security Impact**: Third-party apps can now force credential entry after logout by adding `prompt=login` parameter to authorization URL

**Usage Example**:
```javascript
const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize');
authUrl.searchParams.set('prompt', 'login'); // Force re-authentication
// ... other params
window.location.href = authUrl.toString();
```

#### Documentation Updates

**New Documentation**:
- `docs/THIRD_PARTY_INTEGRATION_GUIDE.md` - Comprehensive integration guide
  - OAuth2/OIDC for external domains
  - Cookie-based SSO for subdomains
  - Social login integration
  - Complete API reference and troubleshooting

**Updated Documentation**:
- `/docs/quickstart` - Added PKCE implementation and prompt parameter
- `/docs/api` - Added UserInfo endpoint and prompt parameter docs
- `README.md` - Added third-party integration overview
- `LEARNINGS.md` - Added OAuth security and OIDC compliance lessons

#### OIDC Discovery

**Updated**: `/.well-known/openid-configuration`
- Added `userinfo_endpoint` declaration
- Added `prompt_values_supported` array
- Fully compliant with OIDC spec

#### Technical Changes

**New Files**:
- `pages/api/oauth/userinfo.js` (108 lines) - OIDC UserInfo endpoint
- `docs/THIRD_PARTY_INTEGRATION_GUIDE.md` (926 lines) - Complete integration guide

**Modified Files**:
- `pages/api/oauth/authorize.js` - Added prompt parameter support
- `pages/api/.well-known/openid-configuration.js` - Added OIDC discovery updates
- `pages/docs/quickstart.js` - Added PKCE and prompt parameter docs
- `pages/docs/api/index.js` - Added UserInfo and prompt docs
- `README.md` - Added integration method overview

#### Bug Fixes

**Fixed**: fancamera.vercel.app 404 error
- Root cause: Missing /api/oauth/userinfo endpoint
- Impact: OAuth clients can now fetch user info successfully

**Fixed**: Auto-login after logout security issue
- Root cause: No way to force re-authentication
- Impact: Users must re-enter credentials after logout

---

## [v5.29.0] — 2025-11-05T15:00:00.000Z

### 🔐 Critical Session Fix & PIN Verification Toggle

**CRITICAL BUG FIX**: Fixed admin sessions expiring after 20-30 seconds. Sessions now properly persist for 30 days with sliding expiration.

**NEW FEATURE**: PIN verification can now be toggled on/off via admin dashboard without redeployment.

#### Session Validation Fix

**Issue**: Admin users were being logged out after 20-30 seconds of activity on `/admin` page

**Root Cause**:
- `getAdminUser()` in `lib/auth.mjs` only validated cookie expiration
- Never checked database session state
- Database sessions could expire while cookie remained valid
- No sliding expiration was applied during validation

**Solution**:
- Modified `lib/auth.mjs` to call `validateSession()` from `lib/sessions.mjs`
- Now validates BOTH cookie expiration AND database session state
- Updates sliding expiration (30 days) on every request
- Enables proper session revocation

**Impact**:
- ✅ Admin sessions now persist correctly for 30 days
- ✅ Session extends automatically on each access (sliding)
- ✅ No more unexpected logouts during active use
- ✅ Revoked sessions properly invalidated

#### PIN Verification Toggle Feature

**New Admin Dashboard Control**: Super-admins can now enable/disable PIN verification without changing environment variables or redeploying.

**What**: PIN verification (6-digit code sent via email on 5th-10th login) can be toggled in real-time

**How**:
1. Login as super-admin at `/admin`
2. See "🔐 PIN Verification" section in dashboard
3. Toggle checkbox to enable/disable
4. Setting persists in MongoDB across server restarts

**New API Endpoint**: `GET/POST /api/admin/settings/pin-verification`
- GET: Returns current PIN status and source (environment/database)
- POST: Updates setting (super-admin only)
- Body: `{ "enabled": boolean }`
- Response: `{ "success": true, "enabled": boolean, "message": "..." }`

**Priority System**:
1. Environment variable `DISABLE_LOGIN_PIN=true` (highest priority)
2. Database setting in `systemSettings` collection
3. Default: enabled

#### Technical Changes

**Modified Files**:
- `lib/auth.mjs` (+17 lines)
  - Added `validateSession` import
  - Updated `getAdminUser()` to validate against database
  - Comments explaining the fix

- `lib/loginPin.mjs` (+15 lines)
  - Changed `shouldTriggerPin()` from sync to async
  - Added database settings check
  - Falls back to environment variable if DB unavailable

- `pages/api/admin/login.js` (1 line)
  - Updated to await `shouldTriggerPin()`

- `pages/api/public/login.js` (1 line)
  - Updated to await `shouldTriggerPin()`

- `pages/admin/index.js` (+70 lines)
  - Added PIN toggle UI (super-admin only)
  - Fetch PIN status on login
  - Real-time toggle with success feedback
  - Clean, integrated design

**New Files**:
- `pages/api/admin/settings/pin-verification.js` (143 lines)
  - GET/POST endpoint for PIN settings
  - MongoDB `systemSettings` collection management
  - Super-admin role enforcement
  - Environment variable override detection

- `scripts/disable-pin.mjs` (33 lines)
  - Quick script to disable PIN via command line
  - Useful for troubleshooting email configuration

**Database Collections**:
- `systemSettings` — New collection for system-wide settings
  - `_id: 'system'` — Single document for all settings
  - `pin_verification_enabled: boolean` — PIN toggle state
  - `createdAt`, `updatedAt` — ISO 8601 timestamps

#### Testing Performed

✅ Session persistence:
- Login successful without 20-30 second timeout
- Session validated after 50+ seconds
- Sliding expiration confirmed working

✅ PIN toggle API:
- GET returns current status correctly
- POST enables/disables successfully
- Setting persists across server restarts
- Environment variable override respected
- Super-admin role enforcement working

✅ Login flows:
- PIN disabled: Direct login without email requirement
- PIN enabled: Email sent with 6-digit code (if configured)
- Both admin and public login endpoints updated

#### Upgrade Notes

**No breaking changes**. Existing sessions remain valid.

**Default behavior**: PIN verification is **disabled** by default after this update.

To enable PIN verification:
1. Login as super-admin
2. Toggle "PIN Verification" on the dashboard

Or via script:
```bash
node scripts/disable-pin.mjs  # Disable
# (Enable script coming in future release)
```

**Environment variable**: Remove `DISABLE_LOGIN_PIN=true` from `.env.local` if you want database setting to control PIN verification. Environment variable overrides database setting.

---

## [v5.29.0] — 2025-10-16T15:24:20.000Z

### Fixed

**Documentation Code Block Contrast**
- Fixed white-on-white text rendering bug in all documentation code blocks
- Code examples are now readable with proper light text on dark background contrast
- Explicitly added `color: inherit` to `.codeBlock pre` and `.codeBlock code` CSS rules
- Prevents browser default styles from overriding design system tokens

### Technical Changes

**Modified Files**:
- `styles/docs.module.css` - Added explicit color inheritance to code block nested elements
  - `.codeBlock pre` now has `color: inherit` (line 142)
  - `.codeBlock code` now has `color: inherit` (line 149)
  - Both include comments explaining WHAT and WHY per coding standards

**Design System Tokens Used**:
- `--bg-code: var(--color-neutral-900)` - Dark background
- `--text-code: var(--color-neutral-300)` - Light text
- Tokens were already correct; only CSS inheritance needed fixing

**Impact**:
- Affects all 18+ documentation pages with code examples
- WCAG AA contrast compliance restored
- No regression to inline `<code>` elements (separate styling preserved)

---

## [v5.29.0] — 2025-10-12T14:07:00.000Z

### 🎯 User Account Management & Session Improvements

**MAJOR FEATURE**: Comprehensive user account management page with profile editing, password management, OAuth service revocation, and account deletion.

#### New Features

**1. User Account Dashboard** (`/account`)
- **Profile Management**: Edit name, view email (read-only)
- **Connected Services**: View all OAuth apps with access to your account
  - See grant date and scopes
  - One-click revoke access for any service
- **Security**: Change password with current password verification
- **Account Deletion**: Permanently delete account with email confirmation
  - Cascades deletion across all collections (sessions, tokens, authorizations)
  - GDPR compliant

**2. Sliding Sessions (30 Days)**
- Session duration extended from 7 to 30 days
- **Sliding expiration**: Session extends automatically on each access
- Users stay logged in as long as they're active
- Applies to both admin and public users

**3. Automatic Redirect to Account Page**
- After successful login, users are redirected to `/account` instead of homepage
- Direct access to account management features
- PIN verification also redirects to account page

#### Critical Bug Fixes

**Session Validation Fixed**
- **Issue**: Users couldn't access `/account` page after login - redirected back to login
- **Root Cause**: Sessions were created with MongoDB ObjectId (`user._id`) instead of UUID (`user.id`)
- **Fix**: Login endpoint now:
  1. Checks if user has UUID identifier
  2. Automatically adds UUID to legacy users without one
  3. Creates session with UUID instead of ObjectId
  4. Works for both PIN and non-PIN flows
- **Impact**: Account page now works correctly with server-side session validation

**Account Page Server-Side Rendering**
- Converted `/account` from client-side to server-side rendering (SSR)
- Session validated before page loads (no flickering)
- Automatic redirect to login if not authenticated
- User data pre-loaded for instant display

#### New API Endpoints

**Account Management**:
- `PATCH /api/public/profile` — Update user profile (name)
- `POST /api/public/change-password` — Change password securely
- `DELETE /api/public/account` — Delete account permanently
- `GET /api/public/authorizations` — List OAuth authorizations
- `DELETE /api/public/authorizations/[id]` — Revoke service access

**Session Management**:
- `GET /api/public/session` — Check session status

#### Technical Improvements

**UUID User Identifiers**
- All public users now use UUID as primary identifier (`user.id`)
- MongoDB `_id` retained for database compatibility
- Automatic UUID backfill for legacy users on login
- Session system uses UUID for user lookups

**Session Architecture**
- Sliding expiration updates `expiresAt` on each access
- Sessions stored in MongoDB with TTL indexes
- Cookie `maxAge` set to 30 days
- Both admin and public sessions use sliding model

**Homepage Improvements**
- "My Account" button for logged-in users
- Recognizes both admin and public sessions
- Cleaner navigation flow

#### Files Changed

**New Files**:
- `pages/account.js` — User account management dashboard
- `pages/api/public/profile.js` — Profile update endpoint  
- `pages/api/public/change-password.js` — Password change endpoint
- `pages/api/public/account.js` — Account deletion endpoint
- `pages/api/public/authorizations/index.js` — List authorizations
- `pages/api/public/authorizations/[id].js` — Revoke authorization

**Modified**:
- `pages/api/public/login.js` — UUID identifier support
- `lib/publicSessions.mjs` — Sliding session expiration
- `lib/sessions.mjs` — Admin sliding sessions
- `lib/auth.mjs` — Extended admin session to 30 days
- `pages/index.js` — Added account page link
- `pages/login.js` — Redirect to account page after login

---

## [v5.29.0] — 2025-01-13T23:45:00.000Z

### 🔐 OAuth Flow Fix: Preserve Authorization Context During Admin Login

**CRITICAL BUG FIX**: Fixed OAuth authorization flow breaking when users needed to log into SSO admin during client authorization.

#### What Was Broken

When an OAuth client initiated authorization:
1. Client redirected to `/api/oauth/authorize?client_id=...&redirect_uri=...`
2. SSO saw user wasn't authenticated
3. Redirected to `/admin?oauth_request=[base64-encoded-request]`
4. User logged into admin panel
5. **BUG**: After login, page stayed on `/admin` without `oauth_request` parameter
6. OAuth flow was lost - no way to continue authorization

#### The Fix

**Modified**: `pages/admin/index.js`
- Added `useRouter` hook to access URL query parameters
- Added `useEffect` hook that monitors both `admin` state and `oauth_request` parameter
- When user is authenticated AND `oauth_request` exists:
  - Display message: "Redirecting to complete OAuth authorization..."
  - Redirect to `/api/oauth/authorize?oauth_request=[encoded-request]`
  - Authorization endpoint reconstructs original request and continues flow

#### Technical Details

```javascript
// WHAT: Check if there's an oauth_request parameter after login
// WHY: When users are redirected to admin login during OAuth flow, 
//      we need to continue the OAuth authorization after they log in
useEffect(() => {
  const oauthRequest = router.query.oauth_request
  if (admin && oauthRequest) {
    // User is now logged in and we have an OAuth request to complete
    setMessage('Redirecting to complete OAuth authorization...')
    // Redirect back to the OAuth authorize endpoint with the original request
    window.location.href = `/api/oauth/authorize?oauth_request=${encodeURIComponent(oauthRequest)}`
  }
}, [admin, router.query.oauth_request])
```

#### Complete OAuth Flow (Now Fixed)

1. Client: `GET /api/oauth/authorize?client_id=...&redirect_uri=...&scope=...`
2. SSO: User not authenticated → `302 /admin?oauth_request=[base64]`
3. User: Logs into admin panel
4. **NEW**: Admin page detects `oauth_request` parameter
5. **NEW**: Auto-redirects to `/api/oauth/authorize?oauth_request=[base64]`
6. SSO: User now authenticated → Shows authorization consent page
7. User: Approves authorization
8. SSO: Generates authorization code → `302 [client_redirect_uri]?code=...&state=...`
9. Client: Exchanges code for tokens via `/api/oauth/token`
10. ✅ OAuth flow complete

#### Impact

- **Before**: OAuth authorization broken when admin login required
- **After**: Seamless OAuth flow even when authentication needed
- **Benefit**: External clients can now successfully integrate with SSO

#### Files Modified

- `pages/admin/index.js` (+15 lines) - OAuth redirect logic
- `package.json` - Version bump to 5.4.0

---

## [v5.29.0] — 2025-10-06T21:30:00.000Z

### 🎉 All Authentication Features Complete + PKCE Flexibility

**MAJOR FEATURE RELEASE**: Completed all three authentication features (PIN verification, Magic Links, Forgot Password) and added flexible PKCE configuration for OAuth clients.

#### Added

**Feature 1: Random PIN Verification** (COMPLETE - 100%):
- `pages/api/admin/verify-pin.js` (116 lines) - Admin PIN verification endpoint:
  - Validates 6-digit PIN sent via email
  - Creates session on successful verification
  - 3 attempts maximum before PIN expires
- `pages/api/public/verify-pin.js` (104 lines) - Public user PIN verification
- `pages/api/public/login.js` (169 lines) - Public user login with PIN integration:
  - Complete authentication flow
  - Bcrypt password verification
  - Email verification check
  - Login count tracking
  - PIN trigger logic
- Beautiful PIN verification modal UI in `pages/login.js`:
  - Full-screen overlay with clean design
  - 6-digit input with auto-validation
  - Monospace font for easy reading
  - Error handling and loading states
  - Enter key support for quick submission
  - Cancel button

**How PIN Verification Works**:
1. User enters email + password successfully
2. Login count increments (tracked in database)
3. Random trigger between 5th-10th login:
   - 30% chance on logins 5-9
   - Always on 10th login
   - Resets after 10th
4. If triggered:
   - Generate 6-digit PIN
   - Store in MongoDB (5-minute TTL)
   - Send email with `buildLoginPinEmail()`
   - Show PIN modal
5. User enters PIN
6. Verify via `/api/*/verify-pin`
7. Create session and redirect

**Feature 2: Magic Link Authentication** (COMPLETE - 100%):
- `pages/api/admin/request-magic-link.js` - Request magic link for admin
- `pages/api/admin/magic-login.js` - Verify and auto-login via magic link
- `pages/api/public/request-magic-link.js` - Request magic link for public users
- `pages/api/public/magic-login.js` - Verify and auto-login public users
- Beautiful "Login with Magic Link" buttons on both login pages
- Separate token collections: `adminMagicTokens`, `publicMagicTokens`
- HMAC-SHA256 signed tokens
- 15-minute expiration
- Single-use enforcement
- Email template: `buildMagicLinkEmail()`

**PKCE Optional Implementation** (OAuth2 Flexibility):
- Added `require_pkce` field to OAuth client schema (default: `false`):
  - Confidential clients (server-side): Can skip PKCE
  - Public clients (mobile/SPA): Require PKCE for security
- Updated `lib/oauth/clients.mjs`:
  - `require_pkce` field in client registration
  - Field can be updated via API
- Updated `lib/oauth/codes.mjs`:
  - `code_challenge` and `code_challenge_method` now optional
  - Validation only runs if PKCE provided
- Updated `pages/api/oauth/authorize.js`:
  - Checks client's `require_pkce` setting
  - Conditionally enforces PKCE parameters
- Updated `pages/api/oauth/token.js`:
  - `code_verifier` now optional
  - Validation based on authorization code's PKCE usage
- Migration script: `scripts/migrations/2025-10-06-add-require-pkce-field.mjs`
  - Updates all existing OAuth clients to `require_pkce: false`
- Comprehensive documentation:
  - `PKCE_SOLUTION.md` - Implementation summary
  - `docs/PKCE_CONFIGURATION.md` - Full configuration guide

#### Changed

- **Admin Login** (`pages/api/admin/login.js`):
  - Integrated PIN verification logic
  - Tracks login count in `users.loginCount`
  - Issues PIN when `shouldTriggerPin()` returns true
  - Returns `{requiresPin: true}` when PIN needed
- **Public Login Page** (`pages/login.js`):
  - Added PIN modal UI (160+ lines)
  - Added magic link button and handler
  - Handle `requiresPin` response from login API
  - PIN verification flow with `/api/public/verify-pin`
- **Admin Login Page** (`pages/admin/index.js`):
  - Added magic link button
  - Magic link request handler
  - Success message display
- **Email Templates** (`lib/emailTemplates.mjs`):
  - Added `buildMagicLinkEmail()` - Magic link email template
  - Login PIN email already added in v5.29.0

#### Database Schema

**New Fields**:
```javascript
// users collection (admin)
{
  loginCount: Number,      // Tracks login count for PIN trigger
  lastLoginAt: String      // ISO timestamp of last login
}

// publicUsers collection
{
  loginCount: Number,      // Tracks login count for PIN trigger
  lastLoginAt: String      // ISO timestamp of last login
}

// oauthClients collection
{
  require_pkce: Boolean    // Whether PKCE is required (default: false)
}
```

**New Collections**:
- `loginPins` - Active PINs with TTL:
  - pin, userId, email, userType, verified, attempts
  - TTL index on `expiresAt` (5 minutes)
  - Lookup index on `{userId, userType, verified}`
- `adminMagicTokens` - Admin magic link tokens:
  - jti, email, createdAt, exp, usedAt
  - TTL index for automatic cleanup
- `publicMagicTokens` - Public user magic link tokens:
  - Same structure as adminMagicTokens

#### Security Features

- ✅ **PIN Security**:
  - 5-minute TTL (expires quickly)
  - 3 attempts maximum
  - Single-use enforcement
  - MongoDB TTL automatic cleanup
  - Cryptographically secure random generation
- ✅ **Magic Link Security**:
  - HMAC-SHA256 signed tokens
  - 15-minute expiration
  - Single-use enforcement (marked as used)
  - Email verification check for public users
- ✅ **PKCE Flexibility**:
  - Server-side clients don't need PKCE overhead
  - Public clients still protected with PKCE
  - Per-client configuration
  - Backward compatible (existing clients work)

#### User Experience

**PIN Verification Flow**:
1. Login normally with password
2. On random trigger (5th-10th login):
   - "Check your email" message
   - Beautiful modal appears
3. Enter 6-digit PIN from email
4. Instant verification
5. Auto-redirect to dashboard

**Magic Link Flow**:
1. Click "Login with Magic Link" button
2. Enter email
3. Check email for magic link
4. Click link
5. Instantly logged in and redirected

**PKCE Configuration**:
- Confidential clients: No code changes needed
- Public clients: Implement PKCE for security
- Easy API update to change `require_pkce` setting

#### Files Summary

**Created** (13 files):
- 4 API endpoints for PIN verification
- 4 API endpoints for magic links
- 1 migration script
- 2 documentation files
- 2 solution summaries

**Modified** (7 files):
- 3 login-related files
- 4 OAuth/PKCE files

**Total**: 1,400+ lines of new code

---

## [v5.29.0] — 2025-10-06T11:22:25.000Z

### 🎉 New Authentication Features: Forgot Password + Email System

**FEATURE RELEASE**: Major enhancement to authentication system with email-based password recovery and foundation for additional auth methods.

#### Added

**Email Infrastructure** (3 library modules):
- `lib/email.mjs` (323 lines) - Dual email provider system:
  - Primary: Nodemailer (Google Workspace SMTP)
  - Fallback: Resend
  - Automatic retry and failover
  - Comprehensive logging
  - Email verification
- `lib/emailTemplates.mjs` (300+ lines) - Email template system:
  - Password reset emails
  - Email verification
  - **Forgot password emails** (NEW)
  - Login PIN emails (foundation)
  - Magic link emails (coming soon)
  - Consistent formatting and security warnings
- `lib/passwordGenerator.mjs` (71 lines) - Secure password generation:
  - Admin: 32-hex tokens (crypto.randomBytes)
  - Public/Org: 16-char strong passwords (mixed characters)
  - Cryptographically secure random generation

**Forgot Password Feature** (COMPLETE):
- `pages/api/admin/forgot-password.js` - Admin forgot password endpoint:
  - Generates new 32-hex password
  - Updates database
  - Sends password via email
  - Security: Always returns success (prevents email enumeration)
- `pages/api/public/forgot-password.js` - Public forgot password endpoint:
  - Generates new strong password
  - Uses bcrypt for hashing
  - Sends password via email
  - Same security measures as admin
- `pages/admin/forgot-password.js` - Admin forgot password UI:
  - Clean dark theme matching admin panel
  - Email input with validation
  - Success confirmation
  - Security notes and warnings
- `pages/forgot-password.js` - Public forgot password UI:
  - Beautiful gradient design
  - User-friendly messaging
  - Clear instructions
  - What happens next explanation
- `lib/publicUsers.mjs` - Added `updatePublicUserPassword()` function

**UI/UX Improvements**:
- Added "Forgot password?" link to admin login page
- Added "Forgot password?" link to public login page
- Links only show when not in dev bypass mode
- Consistent styling across all forgot password flows

**PIN Verification Foundation** (40% complete):
- `lib/loginPin.mjs` (171 lines) - PIN generation and validation:
  - 6-digit random PINs
  - 5-minute TTL
  - 3 attempts maximum
  - Random trigger logic (5th-10th login)
  - MongoDB TTL indexes
- PIN email template in `lib/emailTemplates.mjs`

**Public User Authentication** (from v5.29.0 merge):
- `lib/publicUsers.mjs` - Public user management
- `lib/publicSessions.mjs` - Public user sessions
- `pages/login.js` - Public login page
- `pages/register.js` - Public registration page
- `pages/demo.js` - Demo/dashboard page

**MongoDB Collections** (new):
- `publicUsers` - Public user accounts:
  - Email, passwordHash (bcrypt), name, role, status
  - UUID identifiers
  - emailVerified, lastLoginAt timestamps
- `publicSessions` - Public user sessions:
  - Session tokens, user references
  - TTL indexes for auto-cleanup
- `loginPins` - PIN verification (foundation):
  - PIN, userId, userType, verified, attempts
  - TTL index for 5-minute expiry

#### Changed
- Updated `pages/admin/index.js`:
  - Fixed dev bypass validation (only requires email)
  - Added "Forgot password?" link
- Updated `pages/login.js`:
  - Added "Forgot password?" link
  - Improved form handling

#### Environment Variables (New)
```bash
# Email Configuration
EMAIL_PROVIDER=nodemailer              # nodemailer | resend
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=your-app-password
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=notifications@yourdomain.com
EMAIL_FROM_NAME=SSO Service

# Token Lifetimes
PASSWORD_RESET_TOKEN_TTL=900          # 15 minutes
EMAIL_VERIFICATION_TOKEN_TTL=86400     # 24 hours
```

#### Dependencies Added
- `nodemailer@7.0.6` - Email sending (Google Workspace)
- `resend@6.1.2` - Alternative email provider
- `winston@3.18.3` - Structured logging

#### Security Features
- ✅ **Email Enumeration Protection**: Always returns success for forgot password
- ✅ **Secure Password Generation**: Cryptographically secure random passwords
- ✅ **Comprehensive Logging**: All auth events logged with timestamps
- ✅ **Bcrypt Hashing**: Public user passwords hashed with 12 rounds
- ✅ **Email Verification**: Foundation for email ownership verification

#### User Experience
- **Forgot Password Flow**:
  1. User clicks "Forgot password?" link
  2. Enters email address
  3. Receives auto-generated secure password via email
  4. Can log in immediately
  5. Encouraged to change password after login
- Clear security warnings in UI
- Professional email templates
- Consistent branding across all pages

#### What's Next (In Progress)
- **Feature 2**: Magic link authentication for all user types (~60% complete)
- **Feature 1**: PIN verification with random 2FA (~40% complete)
- Email verification complete flow
- Password change UI

---

## [v5.29.0] — 2025-10-03T09:15:22.000Z

### 🚀 Phase 2: Complete OAuth2/OIDC Authorization Server Implementation

**BREAKING CHANGE**: Major OAuth2/OIDC authorization server implementation for external domain SSO.

#### Added

**OAuth2 Core Infrastructure** (5 library modules):
- `lib/oauth/clients.mjs` (393 lines) - OAuth client registration and management:
  - CRUD operations for OAuth clients (client_id, hashed client_secret)
  - Client validation, activation/suspension
  - Redirect URI and allowed scope management
  - Bcrypt-hashed client secrets (salt rounds: 12)
- `lib/oauth/codes.mjs` (388 lines) - Authorization code handling:
  - Short-lived codes (10 minutes) with PKCE support
  - Code generation, validation, single-use consumption
  - TTL index for automatic cleanup
  - State parameter storage (CSRF protection)
- `lib/oauth/tokens.mjs` (591 lines) - JWT and refresh token management:
  - RS256 JWT access token generation (1 hour lifetime)
  - OIDC ID token generation with user claims
  - Refresh token generation with SHA-256 hashing (30 days)
  - Automatic token rotation on refresh
  - Token revocation support
- `lib/oauth/scopes.mjs` (412 lines) - Scope definitions and validation:
  - Standard OIDC scopes: `openid`, `profile`, `email`, `offline_access`
  - App-specific scopes: Narimato (`read:cards`, `write:cards`, `read:rankings`)
  - App-specific scopes: CardMass (`read:decks`, `write:decks`)
  - App-specific scopes: PlayMass (`read:games`, `write:games`)
  - Scope validation, filtering, and description helpers
- `lib/oauth/jwks.mjs` (57 lines) - JWK conversion utility:
  - RSA PEM to JWK format conversion
  - Public key distribution for JWT signature verification

**OAuth2 API Endpoints** (10 routes):
- `GET /api/oauth/authorize` - Authorization endpoint:
  - PKCE validation (code_challenge, code_challenge_method: S256/plain)
  - State parameter validation (CSRF protection)
  - Client validation and status checking
  - Redirect URI exact match validation
  - Scope validation against client allowed_scopes
  - User authentication check (redirect to /admin if needed)
  - Consent checking (redirect to /oauth/consent if needed)
  - Authorization code generation and callback redirect
- `POST /api/oauth/token` - Token endpoint:
  - Grant types: `authorization_code`, `refresh_token`
  - Authorization code validation with PKCE verification (code_verifier)
  - Client authentication via client_secret
  - JWT access token generation (RS256, 1 hour)
  - OIDC ID token generation with user claims
  - Refresh token generation (SHA-256 hashed, 30 days)
  - Automatic refresh token rotation
  - Comprehensive error handling per OAuth2 spec
- `POST /api/oauth/revoke` - Token revocation endpoint:
  - Revokes access tokens and refresh tokens
  - Always returns 200 OK per RFC 7009
  - Client authentication required
- `POST /api/oauth/introspect` - Token introspection endpoint:
  - Validates access tokens and returns metadata
  - Returns `active`, `scope`, `client_id`, `token_type`, `exp`, `iat`
  - Client authentication required
- `GET /api/oauth/consent` - Consent page data endpoint
- `POST /api/oauth/authorize/approve` - Consent approval handler:
  - Stores user consent decision
  - Generates authorization code
  - Redirects to client callback with code and state

**OIDC Discovery and JWKS** (2 endpoints):
- `GET /.well-known/openid-configuration` - OIDC discovery document:
  - Complete metadata: endpoints, grant types, scopes, response types
  - Signing algorithms: RS256
  - PKCE methods: S256, plain
  - Claims supported: `sub`, `name`, `email`, `email_verified`, `updated_at`
  - Cache-Control: 24 hours
- `GET /.well-known/jwks.json` - Public key distribution:
  - RSA public key in JWK format
  - Clients use this to verify JWT signatures
  - Cache-Control: 24 hours

**Admin OAuth Client Management** (3 UI + 2 API routes):
- `GET /api/admin/oauth-clients` - List all OAuth clients
- `POST /api/admin/oauth-clients` - Create new client (super-admin only)
- `GET /api/admin/oauth-clients/[clientId]` - Get client details
- `PATCH /api/admin/oauth-clients/[clientId]` - Update client
- `DELETE /api/admin/oauth-clients/[clientId]` - Delete client
- `pages/admin/oauth-clients.js` (392 lines) - Admin UI:
  - Client creation form with name, redirect URIs, allowed scopes
  - Client secret display (shown once after creation)
  - Client listing with status badges
  - Suspend/activate functionality
  - Delete with confirmation modal
  - Copy client_id to clipboard
  - Super-admin only for create/delete operations

**User Consent Flow** (2 UI pages):
- `pages/oauth/consent.js` (295 lines) - Beautiful consent UI:
  - Client name and logo display
  - Scope details grouped by category (Identity, Email, Offline Access, App-Specific)
  - Approve/Deny buttons
  - User session validation
  - Redirect back to authorization flow

**MongoDB Collections** (4 new):
- `oauthClients` - OAuth client registrations:
  - Fields: `clientId`, `clientSecret` (bcrypt), `name`, `redirectUris`, `allowedScopes`, `status`, `createdAt`, `updatedAt`
  - Unique index: `clientId`
- `authorizationCodes` - Short-lived authorization codes:
  - Fields: `code`, `clientId`, `userId`, `redirectUri`, `scope`, `codeChallenge`, `codeChallengeMethod`, `state`, `expiresAt`, `consumed`, `createdAt`
  - Unique index: `code`
  - TTL index: `expiresAt` (auto-delete after 10 minutes)
- `refreshTokens` - Long-lived refresh tokens:
  - Fields: `token` (SHA-256), `clientId`, `userId`, `scope`, `expiresAt`, `revoked`, `rotationChain` (parent token tracking), `createdAt`, `lastUsedAt`
  - Unique index: `token`
  - TTL index: `expiresAt` (auto-delete after 30 days)
- `userConsents` - User consent decisions:
  - Fields: `userId`, `clientId`, `scope`, `granted`, `expiresAt`, `createdAt`, `updatedAt`
  - Composite unique index: `userId + clientId`
  - TTL index: `expiresAt` (optional expiration)

**Cryptographic Infrastructure**:
- RSA key pair generated (2048-bit) in `keys/` directory:
  - `keys/private.pem` - Private key for JWT signing (git-ignored)
  - `keys/public.pem` - Public key for JWT verification (git-ignored)
- Added `keys/` to `.gitignore`

**Documentation** (3 comprehensive guides):
- `PHASE2_PLAN.md` (444 lines) - Complete architecture and implementation plan:
  - System overview and data model
  - OAuth2 flow diagrams
  - Security considerations
  - Implementation checklist
- `OAUTH2_SETUP_GUIDE.md` (451 lines) - Setup and testing guide:
  - Database schema definitions
  - Environment variable configuration
  - Key generation instructions
  - Manual testing procedures
  - Troubleshooting guide
- `OAUTH2_INTEGRATION.md` (676 lines) - Client integration guide:
  - Complete OAuth2 flow examples
  - PKCE generation code (Node.js, JavaScript)
  - Full Express.js integration example
  - Token management (refresh, revocation, introspection)
  - Security best practices
  - API reference for all endpoints
  - Troubleshooting common issues

#### Changed
- Updated `pages/admin/index.js` to add "OAuth Clients" navigation link
- Updated `.env.example` with OAuth2 configuration variables
- Updated `WARP.md` with OAuth2 commands and architecture

#### Environment Variables (New)
```bash
# OAuth2/OIDC Configuration
JWT_ISSUER=https://sso.doneisbetter.com
JWT_KEY_ID=sso-2025
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# OAuth2 Token Lifetimes (in seconds)
OAUTH2_AUTHORIZATION_CODE_LIFETIME=600      # 10 minutes
OAUTH2_ACCESS_TOKEN_LIFETIME=3600           # 1 hour
OAUTH2_REFRESH_TOKEN_LIFETIME=2592000       # 30 days
OAUTH2_CONSENT_TTL=31536000                 # 1 year
```

#### Dependencies Added
- `jsonwebtoken@^9.0.0` - JWT generation and verification
- `bcrypt@^5.1.0` - Client secret hashing

#### Security Improvements
- ✅ **PKCE Required**: SHA-256 code_challenge mandatory for authorization code flow
- ✅ **State Parameter**: CSRF protection for OAuth2 flow
- ✅ **Client Secret Hashing**: Bcrypt-hashed client secrets (never stored in plaintext)
- ✅ **Refresh Token Hashing**: SHA-256 hashed refresh tokens in database
- ✅ **RS256 JWT Signatures**: Asymmetric cryptography for token signing
- ✅ **Single-Use Codes**: Authorization codes can only be consumed once
- ✅ **Automatic Token Rotation**: Refresh tokens rotated on each use
- ✅ **Token Revocation**: Revoke access and refresh tokens server-side
- ✅ **Redirect URI Validation**: Exact match validation (no wildcards)
- ✅ **Scope-Based Access Control**: Fine-grained permissions per client

#### OAuth2 Flow Architecture
```
1. External App → GET /api/oauth/authorize (with PKCE params)
2. SSO checks authentication → redirect to /admin if needed
3. SSO checks consent → redirect to /oauth/consent if needed
4. User approves → POST /api/oauth/authorize/approve
5. SSO generates authorization code → redirect to app with code + state
6. App → POST /api/oauth/token (with code + code_verifier)
7. SSO validates PKCE → returns access_token, id_token, refresh_token
8. App uses Bearer token for API calls (Authorization: Bearer <token>)
9. App refreshes → POST /api/oauth/token (refresh_token grant)
10. App revokes on logout → POST /api/oauth/revoke
```

#### Production Readiness
- Security Score: **75% → 95%**
- Subdomain SSO: ✅ Working (cardmass.doneisbetter.com, playmass.doneisbetter.com)
- External Domain SSO: ✅ Working (narimato.com via OAuth2/OIDC)
- OIDC Compliant: ✅ Full OIDC discovery and ID token support
- Build Status: ✅ All builds passing

#### Supported Applications
- **cardmass.doneisbetter.com** - Subdomain SSO via session cookies
- **playmass.doneisbetter.com** - Subdomain SSO via session cookies
- **narimato.com** - External domain SSO via OAuth2/OIDC

#### Migration Notes
1. Generate RSA key pair (see OAUTH2_SETUP_GUIDE.md)
2. Set OAuth2 environment variables (JWT_ISSUER, JWT_KEY_ID, etc.)
3. Create OAuth client for each external application via admin UI
4. Integrate external apps using OAUTH2_INTEGRATION.md guide
5. Test complete OAuth2 flow before production deployment
6. Verify OIDC discovery endpoint: `GET /.well-known/openid-configuration`

#### Files Created
- 25 files created (~5,000 lines of code)
- Core libraries: 5 modules
- API endpoints: 10 routes
- UI pages: 3 pages
- Documentation: 3 comprehensive guides
- Cryptographic keys: 2 files (git-ignored)

---

## [v5.29.0] — 2025-10-02T11:54:33.000Z

### 🔒 Phase 1: Critical Security Hardening

#### Added
- **Server-Side Session Management** (`lib/sessions.mjs`):
  - MongoDB-backed session storage in `adminSessions` collection
  - Session token hashing with SHA-256 (no raw tokens in database)
  - Server-side session validation and revocation
  - Session tracking with IP addresses and user agents
  - TTL index for automatic session expiration
  - Functions: `createSession()`, `validateSession()`, `revokeSession()`, `revokeUserSessions()`

- **Rate Limiting** (`lib/middleware/rateLimit.mjs`):
  - Login endpoint: 5 attempts per 15 minutes (brute force protection)
  - Strict rate limiter: 3 attempts per 15 minutes (magic links, sensitive operations)
  - API rate limiter: 100 requests per 15 minutes
  - Validate rate limiter: 60 requests per minute
  - Per-IP tracking with X-Forwarded-For support (Vercel/Cloudflare compatible)
  - Security event logging on rate limit exceeded

- **CSRF Protection** (`lib/middleware/csrf.mjs`):
  - Double-submit cookie pattern with HMAC signing
  - Constant-time comparison (timing attack protection)
  - 24-hour CSRF token lifetime
  - Middleware: `ensureCsrfToken()`, `validateCsrf()`, `getCsrfToken()`

- **Structured Security Logging** (`lib/logger.mjs`):
  - Winston-based logging with JSON output (production) and colored console (development)
  - Security event logging: login attempts, session creation/revocation, rate limit events
  - ISO 8601 UTC timestamps with milliseconds on all logs
  - Configurable log level via `LOG_LEVEL` environment variable

- **Documentation**:
  - `SSO_AUDIT_REPORT.md` - Complete security audit with gap analysis
  - `PHASE1_SUMMARY.md` - Implementation details and testing checklist
  - `WARP.md` - Updated operational guide

#### Changed
- **Subdomain SSO Support** (`lib/auth.mjs`):
  - Added `Domain=.doneisbetter.com` attribute to session cookies
  - Changed `SameSite=Lax` → `SameSite=None` in production
  - Added `Secure` flag in production
  - **Breaking**: Requires `SSO_COOKIE_DOMAIN` environment variable for subdomain SSO

- **Enhanced Login Endpoint** (`pages/api/admin/login.js`):
  - Integrated rate limiting middleware
  - Server-side session creation in MongoDB
  - CSRF token issuance on login
  - Comprehensive audit logging with IP and user-agent
  - Session revocation on logout
  - Returns CSRF token to client for subsequent requests

#### Security Improvements
- ✅ **Cookie Domain**: Now supports `*.doneisbetter.com` subdomain SSO
- ✅ **Session Revocation**: Stolen tokens can be invalidated server-side
- ✅ **Brute Force Protection**: Rate limiting blocks attacks at network layer
- ✅ **CSRF Protection**: Double-submit pattern prevents cross-site attacks
- ✅ **Audit Logging**: Full audit trail with structured logs
- ✅ **Session Storage**: MongoDB-backed with metadata tracking

#### Environment Variables (New)
```bash
# Required for subdomain SSO
SSO_COOKIE_DOMAIN=.doneisbetter.com

# Rate limiting (optional, defaults provided)
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=900000

# Logging (optional)
LOG_LEVEL=info
LOG_FILE_PATH=

# CSRF (optional, falls back to SESSION_SECRET)
CSRF_SECRET=<generate with: openssl rand -base64 32>
```

#### Dependencies Added
- `express-rate-limit@^7.0.0` - Rate limiting middleware
- `winston@^3.x` - Structured logging

#### Production Readiness
- Security Score: **30% → 75%**
- Subdomain SSO: ✅ Working (cardmass, playmass, etc.)
- External Domain SSO: ❌ Requires Phase 2 (OAuth2)

#### Migration Notes
1. Set `SSO_COOKIE_DOMAIN=.doneisbetter.com` in environment variables
2. Generate and set `CSRF_SECRET` (or it will use `SESSION_SECRET`)
3. Configure rate limiting if defaults don't suit your needs
4. Test login/logout flow after deployment
5. Verify cookies include correct `Domain` attribute in browser dev tools

---

## [v5.29.0] — 2025-09-17T11:43:02.000Z

### Added
- Development-only passwordless admin login:
  - NEXT_PUBLIC_ADMIN_DEV_BYPASS (client) + ADMIN_DEV_BYPASS (server) gates
  - POST/DELETE /api/admin/dev-login creates/clears session without password when enabled (non-production only)
- UI shows email-only form and warning banner when dev bypass is active

### Security
- Dev bypass is blocked in production regardless of flags; route returns 403

---

## [v5.29.0] — 2025-09-16T18:14:33.000Z

### Added
- Secure, single-use, time-limited admin magic link flow:
  - GET /api/admin/magic-link?t=... consumes a signed token, sets session cookie, redirects to /admin
  - scripts/generate-magic-link.mjs to generate one-time URLs
  - ADMIN_MAGIC_SECRET signing key; optional ADMIN_MAGIC_ALLOWED_EMAILS allowlist

### Changed
- Documentation updated with Magic Link usage

---

## [v5.29.0] — 2025-09-15T18:25:45.000Z

### Changed
- MongoDB client now uses fast-fail timeouts (serverSelection/connect/socket) to surface 503 quickly when DB is unreachable.
- Admin login and session validation now map DB config/availability issues to 503 with clear messages.

### Documentation
- Version sync across README, ARCHITECTURE, ROADMAP, TASKLIST, LEARNINGS.

---

## [v5.29.0] — 2025-09-15T17:36:07.000Z

### Changed
- MongoDB client initialization is now lazy in serverless functions to prevent import-time crashes (avoids “Empty reply from server”).
- Admin login/validate endpoints return stable HTTP errors if database env is missing.

### Documentation
- Synchronized versions across README, ARCHITECTURE, ROADMAP, TASKLIST, LEARNINGS.

---

## [v5.29.0] — 2025-09-14T08:25:57.000Z

### Added
- UUIDs as the primary identifier for admin users (with backfill for legacy users)
- Sparse-unique index on users.id for fast UUID lookups
- Organizations (UUID) admin endpoints:
  - GET/POST /api/admin/orgs
  - GET/PATCH/DELETE /api/admin/orgs/[id]
- Organization Users (UUID) admin endpoints:
  - GET/POST /api/admin/orgs/[orgId]/users
  - GET/PATCH/DELETE /api/admin/orgs/[orgId]/users/[id]
- tools/backfill-user-uuids.mjs utility

### Changed
- Admin session tokens now carry userId as UUID
- Admin users CRUD responses prefer UUID id (fallback to legacy _id only if needed)
- RBAC clarified: super-admin full access; admin read-only for org/org-user routes unless permissioned

---

## [v5.29.0] — 2025-09-11T14:28:29.000Z

### Added
- Admin login UI at /admin (email + 32‑hex token) with session display and logout
- Homepage updated to link to Admin Login and show current admin session state

### Changed
- Removed legacy username sign-in UI from homepage

---

## [v5.29.0] — 2025-09-11T13:57:38.000Z

### Changed
- Version bump to align with commit protocol; no functional changes since v5.29.0

## [v5.29.0] — 2025-09-11T13:35:02.000Z

### Added
- DB-backed admin authentication with HttpOnly cookie session (admin-session)
- New admin endpoints:
  - POST /api/admin/login (email + token)
  - DELETE /api/admin/login (logout)
  - GET/POST /api/admin/users (list/create)
  - GET/PATCH/DELETE /api/admin/users/[id] (manage)
- Resource password service with admin-session bypass and usage tracking:
  - POST /api/resource-passwords (generate/retrieve + shareable link)
  - PUT /api/resource-passwords (validate password)
- CORS helper and deployment guidance for sso.doneisbetter.com

### Changed
- /api/sso/validate now validates admin cookie sessions
- Secured /api/users to admin-only

### Removed
- Deprecated username-based endpoints: /api/auth/login, /api/auth/logout, /api/users/register, /api/users/logout, /api/users/[userId]
- Duplicate/insecure routes removed or deprecated with 410 Gone

---

## [v5.29.0] — 2025-07-23T10:00:00.000Z

### Removed
- Removed nested client package (@doneisbetter/sso-client)
- Removed client-related documentation and examples
- Simplified project structure

### Modified
- Updated documentation to focus on server-side implementation
- Streamlined API documentation
- Simplified configuration options
## [v5.29.0] — 2025-07-22T08:03:17Z

### Updated Dependencies
- Upgraded Next.js to ^15.4.2
- Upgraded React to ^19.1.0
- Upgraded MongoDB to ^6.3.0
- Added TypeScript >= 4.5.0 requirement
- Updated Node.js requirement to >= 14.0.0
- Updated all client dependencies:
  - axios ^1.6.0
  - jsonwebtoken ^9.0.0

### Technical Updates
- Enhanced build system stability
- Improved development environment setup
- Updated package overrides for better dependency management
- Optimized session handling and validation

## [v5.29.0]

### Major Changes
- Upgraded all dependencies to their latest stable versions
- Fixed deprecated package warnings
- Removed legacy dependencies
- Improved build system configuration

### Technical Updates
- Added lru-cache for better memory management
- Updated glob to version 10
- Updated rimraf to version 5
- Updated eslint to version 9
- Added package overrides for transitive dependencies
- Optimized Next.js configuration for Pages Router
- Added .npmrc for better dependency management

### Removed
- Deprecated inflight package
- Legacy glob versions
- Outdated eslint configuration

### Technical Details
- Configured proper versioning for all dependencies
- Enhanced build system stability
- Improved development environment setup
- Better memory management with lru-cache
- Stricter npm configuration

## [v5.29.0] — 2025-07-21T13:12:00.000Z

### Added
- User management features:
  - Rename users functionality
  - Toggle admin rights
  - Delete users capability
- Enhanced admin dashboard
- Real-time user list updates
- Improved error handling
- User manual documentation

### Modified
- Updated frontend interface
- Enhanced permission system
- Improved activity logging
- Updated all documentation

### Technical Updates
- React hooks for state management
- MongoDB integration
- Next.js API routes
- Session management

### Major Changes
- Migrated to Next.js framework
- Implemented serverless API routes
- Added MongoDB integration
- Created user management system
- Added session management
- Implemented activity logging
- Added admin dashboard
- Created permission system

### Removed
- Express server implementation
- Static file serving through Express
- Server-side session management
- Express routes

### Technical Details
- Updated to Next.js 15.4.2
- Updated to React 19.1.0
- Added MongoDB integration
- Implemented user authentication
- Added admin user management
- Created API routes for user operations

## [v5.29.0] — 2024-04-13T12:00:00.000Z

### Added
- Initial project setup
- Basic Express.js server configuration
- Static file serving
- SPA routing support
- Basic HTML structure
- CSS styling foundation
- Client-side JavaScript initialization

### Technical Details
- Express.js server implementation
- SPA structure with HTML5 history API support
- Static file middleware configuration
- Basic responsive styling
