# Design System Adapter

Status: Direct package adoption — no local UI authority remains  
Last updated: 2026-08-24

Design / UI / UX SSOT (authoritative):
- [GDS README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)
- [Compatibility & Releases](https://github.com/sovereignsquad/general-design-system/blob/main/COMPATIBILITY_AND_RELEASES.md)
- [Components & Patterns](https://github.com/sovereignsquad/general-design-system/blob/main/COMPONENTS_AND_PATTERNS.md)
- [Governance & Adoption](https://github.com/sovereignsquad/general-design-system/blob/main/GOVERNANCE_AND_ADOPTION.md)
- [Adoption & Migration Playbook](https://github.com/sovereignsquad/general-design-system/blob/main/ADOPTION_AND_MIGRATION_PLAYBOOK.md)
- [Compliance Toolkit](https://github.com/sovereignsquad/general-design-system/blob/main/COMPLIANCE_TOOLKIT.md)

Aligned SSOT version/date: `6.0.0 / 2026-08-12`

This file records only local adapter state, migration blockers, validation commands, and approved exceptions. The shared GDS repo is authoritative for design rules, runtime contracts, and package usage.

## Current Truth

- Canonical package names are now:
  - `@sovereignsquad/gds-theme`
  - `@sovereignsquad/gds-core`
  - `@sovereignsquad/gds-admin`
  - `@sovereignsquad/gds-eslint-config`
  - `@sovereignsquad/gds-compliance`
- Canonical import split is now:
  - `@sovereignsquad/gds-theme/client`
  - `@sovereignsquad/gds-theme/server`
  - `@sovereignsquad/gds-core/client`
  - `@sovereignsquad/gds-core/server`
  - `@sovereignsquad/gds-admin/client`
  - `@sovereignsquad/gds-admin/server`

## Current Repo State

- Current UI foundation: direct GDS runtime packages only. No local UI adapter, no local stylesheet, no local token authority.
- Current root provider wiring: [pages/_app.js](../pages/_app.js) via direct `@sovereignsquad/gds-theme/client`
- Current token/theme authority: [lib/theme/mantineTheme.js](../lib/theme/mantineTheme.js) via `createPublicBrandTheme` from `@sovereignsquad/gds-theme/server` (migrated off the now consumer-prohibited `extendGdsTheme` as part of the 6.0.0 upgrade)
- Current app root wiring: [pages/_app.js](../pages/_app.js)
- Current manifest: [gds-adoption.json](../gds-adoption.json)
- Installed runtime packages:
  - `@sovereignsquad/gds-theme@6.0.0`
  - `@sovereignsquad/gds-core@6.0.0`
  - `@sovereignsquad/gds-admin@6.0.0`

## Install Source

GDS publishes exclusively to GitHub Packages (`npm.pkg.github.com`), which requires an
authenticated, `read:packages`-scoped token for every install — including of public
packages. This repo's CI/Vercel environments previously had no such token configured, so
all five consumed `@sovereignsquad/gds-*` packages were vendored as prebuilt tarballs in
`vendor/gds/` and referenced via `file:` dependencies — see git history on this file for
that stopgap's full rationale.

A `GDS_PACKAGES_TOKEN` repository secret is now provisioned (2026-08-25), so the
dependencies resolve from the registry again: `.npmrc` carries the
`@sovereignsquad:registry=...`/`_authToken` block, `package.json` pins exact versions
(`6.0.0`, matching what was vendored — a pure install-mechanism change, not a version
bump), and `vendor/gds/` is deleted. CI (`repo-guardrails.yml`) exports
`GITHUB_TOKEN: ${{ secrets.GDS_PACKAGES_TOKEN }}` for the install step (the secret can't be
named `GITHUB_TOKEN` directly — that name is reserved by GitHub Actions). **Vercel still
needs the same value added as a `GITHUB_TOKEN` project environment variable** (Production
and Preview) before the next deploy — see GDS's `INSTALLATION_GUIDE.md` "Getting
GITHUB_TOKEN into a deployment host's build" for the exact steps; this was not done as
part of this change since it requires Vercel dashboard/CLI access this session didn't
have.

## Current Direct Consumption

- `@sovereignsquad/gds-theme/client`
  - [pages/_app.js](../pages/_app.js)
- `@sovereignsquad/gds-theme/server`
  - [lib/theme/mantineTheme.js](../lib/theme/mantineTheme.js)
- `@sovereignsquad/gds-core/server`
  - [pages/login.js](../pages/login.js), [pages/register.js](../pages/register.js), [pages/forgot-password.js](../pages/forgot-password.js), [pages/logout.js](../pages/logout.js), [pages/admin/index.js](../pages/admin/index.js), [pages/admin/callback.js](../pages/admin/callback.js), and [pages/admin/forgot-password.js](../pages/admin/forgot-password.js) via direct `AuthShell`
  - [pages/login.js](../pages/login.js) via `ProviderIdentityButtonGroup` (Google + Facebook; replaced the hand-rolled provider buttons as of the 6.0.0 upgrade — `pages/register.js` never actually implemented its own provider buttons, despite previously being listed in the OAuth exception's scope)
  - [pages/admin/users.js](../pages/admin/users.js) and [pages/admin/activity.js](../pages/admin/activity.js) via direct `DataToolbar`
  - every page under [pages/docs](../pages/docs) via direct `PublicShell` + `DocsPageShell`, composed from [lib/docs-shell-config.js](../lib/docs-shell-config.js)
  - [pages/index.js](../pages/index.js) via `PublicShell`, `EditorialHero`, `FeatureBand`, `ConsumerSection`, `ConsumerDashboardGrid`, `EditorialCard`, `AccentPanel`, and `CtaButtonGroup`
  - [pages/privacy.js](../pages/privacy.js), [pages/terms.js](../pages/terms.js), [pages/data-deletion.js](../pages/data-deletion.js), and [pages/test-fetch.js](../pages/test-fetch.js) via direct `PublicShell`, `PublicBrandFooter`, and `ArticleShell`
  - editorial callouts on core docs pages via `AccentPanel`
- `@sovereignsquad/gds-admin/client`
  - [pages/admin/users.js](../pages/admin/users.js)
  - [pages/admin/oauth-clients.js](../pages/admin/oauth-clients.js)
- `@sovereignsquad/gds-admin/server`
  - [pages/admin/dashboard.js](../pages/admin/dashboard.js), [pages/admin/users.js](../pages/admin/users.js), [pages/admin/activity.js](../pages/admin/activity.js), and [pages/admin/oauth-clients.js](../pages/admin/oauth-clients.js) via direct `PageHeader`
  - [pages/account.js](../pages/account.js) and [pages/demo.js](../pages/demo.js) via direct `PageHeader`

## Remaining Gaps

This repo is no longer blocked from direct runtime package consumption. It is now partially migrated.

1. Shell migration gap:
   docs-site composition still relies on a thin local wrapper for shared docs navigation and framing. The previous fake local search and fake version-selector controls were removed; public informational pages and admin pages now consume GDS shells directly at page level.

2. Lint debt gap:
   most docs/editorial waiver debt is removed, but two long-form narrative docs pages still carry explicit localized waivers for prose-heavy quote/apostrophe content:
   [pages/docs/app-permissions.js](../pages/docs/app-permissions.js)
   and [pages/docs/admin-approval.js](../pages/docs/admin-approval.js).

## Local Adapter Inventory

None. `components/DocsLayout.js` was the last entry and is deleted; the `components/`
directory no longer exists. Docs routes compose `PublicShell` and `DocsPageShell`
directly, sharing shell props through [lib/docs-shell-config.js](../lib/docs-shell-config.js) —
which is configuration data (navigation sections, brand, footer slots), not a UI adapter.

## Board-Aligned Implementation Notes

- The local adapter inventory is empty. `styles/globals.css` is deleted as well, so there is no local token or stylesheet authority left to drift back toward.

## Approved Exceptions

| Scope | Reason | User impact | Removal condition |
|-------|--------|-------------|-------------------|
| Long-form docs prose | two `react/no-unescaped-entities` waivers on narrative docs copy | none — the waivers affect lint only, never rendering | normalize the remaining long-form page copy |

Closed this pass: the docs/editorial shell exception — the last five pages moved to `PublicShell` + `DocsPageShell`, `components/DocsLayout.js` is deleted, and `styles/globals.css` went with it.

Closed previously: OAuth provider buttons — replaced with canonical `ProviderIdentityButtonGroup` (Google + Facebook, both natively supported by the shipped provider registry). No custom provider CTA styling remains.

## Advanced Package Items Usable Now

These are already present in the published package line and can be adopted in this repo without requesting new GDS features:

- Public/editorial:
  - `EditorialHero`
  - `FeatureBand`
  - `ConsumerSection`
  - `ConsumerDashboardGrid`
  - `EditorialCard`
  - `CtaButtonGroup`
  - `AccentPanel`
  - `SectionPanel`
- Documentation/content:
  - `ArticleShell`
  - `DocsPageShell`
  - `SimpleDataTable`
  - `PlaceholderPanel`
- Forms/media:
  - `FormField`
  - `MediaField`
  - `MediaCard`
  - `AccessSummary`
- Admin/data:
  - `FilterDrawer`
  - `StatsSection`
  - `DataTable`
  - `ResponsiveDataView`
  - `EditorScaffold`

Current repo usage proves the public/editorial family is viable on this runtime line. The next low-risk adoptions should come from the documentation/content and admin/data families, not from new local one-off patterns.

## Rules For This Repo

- Do not add new old-placeholder package references.
- Prefer direct `@sovereignsquad/*` imports when a stable package contract already exists.
- Do not create a second local token or provider authority.
- Keep local wrappers thin and temporary.
- Prefer deleting mirrored local contracts family-by-family once direct package imports are actually viable.

## Validation

- `npm run lint`
- `npm run lint:gds`
- `npm run gds:validate-manifest`
- `npm run gds:check`
- `npm run build`
- `npm run check:docs`

`npm run lint` remains the repo's existing baseline lint contract. `npm run lint:gds` wires the shared `@sovereignsquad/gds-eslint-config` package and now runs cleanly with only two explicit localized waivers left on long-form docs copy plus the existing server-generated HTML response template exceptions.

## Next Honest Migration Step

1. Remove the last two localized editorial lint waivers in [pages/docs/app-permissions.js](../pages/docs/app-permissions.js) and [pages/docs/admin-approval.js](../pages/docs/admin-approval.js) by normalizing the remaining long-form prose copy. These are the only local exceptions left, and they are lint-only — nothing about them reaches a rendered page.
