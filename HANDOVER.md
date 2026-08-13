# Handover — GDS Migration Status

Written: 2026-08-13, ahead of a possible session interruption. This document is
self-contained: a fresh session (or a human) should be able to pick up the
GDS-migration work from this file alone, with no prior conversation context.

## TL;DR

- `main` is safe and unchanged. Nothing is broken there.
- The full GDS `6.0.0` migration is done, verified, and already pushed to
  GitHub as its own branch/PR. **Nothing is at risk of being lost** — it does
  not live only in this sandbox session.
- **The only thing blocking it from landing on `main` is one missing GitHub
  Actions secret**, which only a human with repo-admin access can add. No
  further code work is needed first.
- Do **not** merge or force-push the migration branch onto `main` without that
  secret existing — doing so would land known-red CI on `main`, which this
  repo's own `CLAUDE.md` (Section 3) explicitly prohibits.

## Where things stand right now

| Item | State |
|---|---|
| `main` branch | `5.31.1`, still on `@doneisbetter/gds-*@3.0.0` (the old, dead npm mirror). Untouched, builds clean. |
| GDS migration branch | `chore/upgrade-gds-6.0.0`, pushed to `origin`, HEAD commit `79a8b6be0619999ac4513df2d8db4a3608fbf5a8` |
| Pull request | [**#65**](https://github.com/moldovancsaba/sso/pull/65) — open, unmerged, targets `@sovereignsquad/gds-*@6.0.0` |
| Tracking issue | [**#64**](https://github.com/moldovancsaba/sso/issues/64) — open, full migration plan/research; PR #65 closes it on merge |
| Blocker | `GDS_PACKAGES_TOKEN` GitHub Actions secret does not exist yet |
| CI status on #65 | Red — `guardrails` check fails on `npm ci` with `401 Unauthorized` fetching `@sovereignsquad/gds-theme@6.0.0` from `npm.pkg.github.com`, because the workflow's install step has no working credential for that registry |
| Vercel preview on #65 | Also erroring, presumed same cause (not independently confirmed — no access to Vercel's build logs from this session) |

## The one action that unblocks everything

Someone with **repo-admin access on `moldovancsaba/sso`** needs to:

1. Generate a classic GitHub PAT with the `read:packages` scope and read
   access to the `sovereignsquad` org's packages.
2. Add it as a repository secret named exactly `GDS_PACKAGES_TOKEN`, under
   **Settings → Secrets and Variables → Actions**.

Once that secret exists, re-run (or push a trivial commit to re-trigger) the
`guardrails` check on PR #65. It should go green. At that point the PR is
ready to squash-merge into `main` — this repo's established, pre-authorized
convention (see `CLAUDE.md` Section 5) once a PR's own CI is green.

**Nothing else is needed before merging.** The migration itself — code,
tests, docs, version bump — is complete and was verified clean in this
sandbox via a real `npm install` (using a temporary personal token supplied
by the user directly in chat, used only in-memory/via env var, never
committed, and not persisted anywhere durable — a fresh session cannot reuse
it and does not need to; it was only needed to prove the install/build/test
chain works before pushing).

## How we got here (context for "why isn't this just on main already")

1. The original ask was "implement the latest GDS." That turned out to have
   a bigger problem underneath it than a version bump: SSO was pinned to
   `@doneisbetter/gds-*@3.0.0` — a copy of the design system on the public
   npm registry that had been abandoned/frozen, several major versions
   behind the real, actively-maintained package line.
2. The actual current project is `sovereignsquad/general-design-system`,
   which publishes to **GitHub Packages** (`npm.pkg.github.com`), not
   npmjs.com. GitHub Packages requires an authenticated, `read:packages`-
   scoped token for every install, even of a public package — that's the
   root of the recurring credential requirement below.
3. **First attempt — [PR #63](https://github.com/moldovancsaba/sso/pull/63)**
   (branch `chore/upgrade-gds-4.1.3`, tracked by issue #62): migrated to
   `@sovereignsquad/gds-*@4.1.3`, the real current version at the time. It
   sat blocked on the same missing-secret problem long enough that upstream
   shipped two more major versions (`5.0.0`, `6.0.0`) while it waited.
   **Retired, closed without merging** — landing `4.1.3` at that point would
   have meant shipping an already-stale version. Issue #62 was closed
   `not_planned`, superseded.
4. **Second attempt — PR #65** (this one, branch `chore/upgrade-gds-6.0.0`,
   tracked by issue #64): re-planned from scratch against the real current
   version (`6.0.0`), based on a full read of upstream's changelog across
   the entire `4.1.4`–`6.0.0` range (not summarized/assumed), cross-checked
   against every GDS component SSO actually imports.

## What actually changed in this migration (not just a version bump)

Confirmed by reading upstream's actual governance docs and compliance-tool
source code, not just changelog prose:

1. **`lib/theme/mantineTheme.js`**: `extendGdsTheme(...)` is now documented
   upstream as "no longer a canonical adopter path" and prohibited for
   consumer use. Migrated to `createPublicBrandTheme({ overrides:
   mantineThemeOverrides })` — same override object (colors, fonts,
   radius/shadow scale, component defaults), only the composing function
   changed. Low risk, verified against a real build.
2. **`pages/login.js`**: the hand-rolled Facebook/Google buttons were
   replaced with GDS's canonical `ProviderIdentityButtonGroup`, closing
   SSO's oldest tracked design-system exception (`gds-adoption.json`).
   Both providers are natively supported upstream with real brand
   colors/labels. This is a small, real, verified visual change — not
   purely mechanical. (`pages/register.js` was in that exception's scope
   too, but turned out to never have had its own provider buttons.)
3. **Confirmed safe, not assumed**: neither real breaking change shipped
   between `4.1.3` and `6.0.0` upstream (`ReferenceThemeExplorer` moved to
   a dedicated subpath at `5.0.0`; the unrelated `class-usa` brand-lane
   palette re-based at `6.0.0`) affects SSO — verified directly via `grep`
   against SSO's own source; SSO uses neither.
4. Two **known, already-reviewed cosmetic diffs** carry forward unchanged
   from the original `3.0.0→4.1.3` research (nothing new in the
   `4.1.3→6.0.0` range): `DocsPageShell` now renders full-width instead of
   an article-width cap (affects `pages/docs/**`), and `PageHeader`'s
   eyebrow text lost its forced-uppercase styling (affects admin pages).
   Both are deliberate upstream changes, not regressions, already visually
   verified and accepted.

Mechanically: all 43 source files' `@doneisbetter/gds-*` imports rewritten
to `@sovereignsquad/gds-*`, `.npmrc` registry routing added, an
`@mantine/dates@9.2.1` explicit pin added (resolves an `ERESOLVE` peer
conflict the upgrade introduced), `gds-adoption.json` updated (version,
scope, removed the now-closed OAuth exception, added an
`identityProviderBranding` policy block), service version bumped to
`5.32.0`, and `docs/CHANGELOG.md` / `docs/RELEASE_NOTES.md` /
`docs/ROADMAP.md` / `docs/DESIGN_SYSTEM.md` all updated in the same change.

Full detail lives in PR #65's own description and in issue #64 — both are
permanent, already on GitHub, and more complete than this summary.

## Verification already done (in this sandbox, before pushing)

- `npm run verify` (lint, type-check, test — 79 passing, build, guard:repo,
  check:docs) — clean
- `npm run gds:validate-manifest`, `npm run gds:check`, `npm run lint:gds` —
  all clean
- Visually checked a real local build: login page (new provider buttons
  render with correct brand colors), register page, and a docs page (the
  two known cosmetic diffs present and unchanged, nothing new)
- Confirmed zero remaining `@doneisbetter/gds*` references anywhere in
  tracked source, docs, or `package-lock.json`
- Confirmed no literal secret values were ever committed (`.npmrc` and
  `package-lock.json` both explicitly checked)
- Confirmed PR #65's branch is a clean, conflict-free fast-forward off the
  current `main` tip (`d768775301115d057e2fa6f9046599d711d8e2e5`) — `main`
  has not moved since the branch was cut, so there is nothing to rebase

## Explicitly not done / not blocking, for a future pass

- `components/DocsLayout.js` (the docs-editorial local shell) was **not**
  collapsed — no canonical docs-site shell has shipped upstream yet that
  would supersede it. Still a tracked, narrow exception in
  `gds-adoption.json`.
- `gds-compliance` strict mode was **not** enabled — a materially larger,
  separate initiative, out of scope here.
- Issue #60 (a planned onboarding spotlight-tour feature) is unrelated to
  this migration but worth knowing about: upstream GDS ships a native
  `GdsTourProvider`/`useGdsTour()`/`GdsGuidedTour` module that likely
  supersedes #60's original build-it-locally plan. Not started.
- The retired branch `chore/upgrade-gds-4.1.3` (from closed PR #63) still
  exists on GitHub. Harmless clutter — remote branch deletion returns a
  403 from this sandbox's git relay (a known, confirmed, token-scope
  limitation, not a transient failure); delete it via the GitHub web UI
  whenever convenient.
- Pre-existing `npm audit` findings (10 vulnerabilities, 8 high) were
  individually cross-referenced against this migration's diff and
  confirmed unrelated (all pre-existing transitive deps via eslint/
  istanbul tooling, or SSO's own unrelated direct deps). Left untouched,
  out of scope for this change.

## Operating rules this repo enforces (read `CLAUDE.md` in full — this is only a pointer)

- **No AI attribution anywhere** — commits, branches, PR/issue text, code
  comments, docs. This is a standing, dated owner directive
  (`CLAUDE.md` Section 1), not a suggestion. It overrides tool/platform
  defaults; if a tool auto-injects attribution, remove it where editable.
- **Quality gate**: nothing lands on `main` with a lint/type/test/build
  failure — `npm run verify` must be clean first. This is exactly why PR
  #65 is not simply being force-merged right now.
- **This sandbox's ambient git identity is `Claude <noreply@anthropic.com>`**
  — never commit with it directly. Override per-commit with
  `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`/`GIT_COMMITTER_NAME`/
  `GIT_COMMITTER_EMAIL` env vars on the `git commit` invocation itself
  (never touch global git config). The real identity used throughout this
  work: `Moldovan Csaba Zoltan <moldovancsaba@gmail.com>`.
- **Remote branch/tag deletion 403s** from this sandbox — token-scope
  limitation, not a bug. Don't retry it; a human deletes via the GitHub
  web UI.
- **This sandbox cannot reach MongoDB Atlas or complete HTTPS browser
  navigation** through its proxy — documented, confirmed limitations, not
  something to work around with a TLS bypass.

## If you are a fresh session with zero prior context, start here

1. Read this file in full (you just did).
2. Check PR #65's current state:
   `gh pr view 65 --repo moldovancsaba/sso` or the GitHub UI — has the
   `guardrails` check gone green since this was written? Has a human
   merged, closed, or commented?
3. If CI is green and the PR is still open: it's ready to merge (squash),
   per this repo's established convention, once you've confirmed nothing
   else changed. Verify with `npm run verify` on the branch first, as this
   repo's own quality gate requires.
4. If CI is still red for the same `GDS_PACKAGES_TOKEN` reason: there is
   nothing further to build. The only outstanding action is the secret,
   which needs a human with repo-admin access — not something an AI
   session can provision itself.
5. If you need to re-verify anything against the live GDS registry
   yourself, you will need the user to supply a fresh `read:packages`-
   scoped GitHub token in chat (the same way it was supplied for this
   work) — do not assume one is still available in this session's
   environment, and never write a real token value into any file in this
   repository.
