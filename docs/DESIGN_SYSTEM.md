# Design System Adapter

Status: Mostly direct package adoption  
Last updated: 2026-05-29

Design / UI / UX SSOT (authoritative):
- [GDS README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)
- [Compatibility & Releases](https://github.com/sovereignsquad/general-design-system/blob/main/COMPATIBILITY_AND_RELEASES.md)
- [Components & Patterns](https://github.com/sovereignsquad/general-design-system/blob/main/COMPONENTS_AND_PATTERNS.md)
- [Governance & Adoption](https://github.com/sovereignsquad/general-design-system/blob/main/GOVERNANCE_AND_ADOPTION.md)
- [Adoption & Migration Playbook](https://github.com/sovereignsquad/general-design-system/blob/main/ADOPTION_AND_MIGRATION_PLAYBOOK.md)
- [Compliance Toolkit](https://github.com/sovereignsquad/general-design-system/blob/main/COMPLIANCE_TOOLKIT.md)
- Optional local checkout mirror: [general-design-system](/Users/Shared/Projects/general-design-system) (non-authoritative convenience copy)

Aligned SSOT version/date: `2.6.3 / 2026-05-27`

This file records only local adapter state, migration blockers, validation commands, and approved exceptions. The shared GDS repo is authoritative for design rules, runtime contracts, and package usage.

## Current Truth

- Canonical package names are now:
  - `@doneisbetter/gds-theme`
  - `@doneisbetter/gds-core`
  - `@doneisbetter/gds-admin`
  - `@doneisbetter/gds-eslint-config`
  - `@doneisbetter/gds-compliance`
- Canonical import split is now:
  - `@doneisbetter/gds-theme/client`
  - `@doneisbetter/gds-theme/server`
  - `@doneisbetter/gds-core/client`
  - `@doneisbetter/gds-core/server`
  - `@doneisbetter/gds-admin/client`
  - `@doneisbetter/gds-admin/server`

## Current Repo State

- Current UI foundation: direct GDS runtime packages with two remaining local UI adapters (`DocsLayout` + `AppFooter`)
- Current root provider wiring: [pages/_app.js](/Users/Shared/Projects/sso/pages/_app.js) via direct `@doneisbetter/gds-theme/client`
- Current token/theme authority: [lib/theme/mantineTheme.js](/Users/Shared/Projects/sso/lib/theme/mantineTheme.js) via `@doneisbetter/gds-theme/server`
- Current app root wiring: [pages/_app.js](/Users/Shared/Projects/sso/pages/_app.js)
- Current manifest: [gds-adoption.json](/Users/Shared/Projects/sso/gds-adoption.json)
- Installed runtime packages:
  - `@doneisbetter/gds-theme@2.6.3`
  - `@doneisbetter/gds-core@2.6.3`
  - `@doneisbetter/gds-admin@2.6.3`

## Current Direct Consumption

- `@doneisbetter/gds-theme/client`
  - [pages/_app.js](/Users/Shared/Projects/sso/pages/_app.js)
- `@doneisbetter/gds-theme/server`
  - [lib/theme/mantineTheme.js](/Users/Shared/Projects/sso/lib/theme/mantineTheme.js)
- `@doneisbetter/gds-core/server`
  - [pages/login.js](/Users/Shared/Projects/sso/pages/login.js), [pages/register.js](/Users/Shared/Projects/sso/pages/register.js), [pages/forgot-password.js](/Users/Shared/Projects/sso/pages/forgot-password.js), [pages/logout.js](/Users/Shared/Projects/sso/pages/logout.js), [pages/admin/index.js](/Users/Shared/Projects/sso/pages/admin/index.js), [pages/admin/callback.js](/Users/Shared/Projects/sso/pages/admin/callback.js), and [pages/admin/forgot-password.js](/Users/Shared/Projects/sso/pages/admin/forgot-password.js) via direct `AuthShell`
  - [pages/admin/users.js](/Users/Shared/Projects/sso/pages/admin/users.js) and [pages/admin/activity.js](/Users/Shared/Projects/sso/pages/admin/activity.js) via direct `DataToolbar`
  - [components/DocsLayout.js](/Users/Shared/Projects/sso/components/DocsLayout.js)
  - [pages/index.js](/Users/Shared/Projects/sso/pages/index.js) via `PublicShell`, `EditorialHero`, `FeatureBand`, `ConsumerSection`, `ConsumerDashboardGrid`, `EditorialCard`, `AccentPanel`, and `CtaButtonGroup`
  - [pages/privacy.js](/Users/Shared/Projects/sso/pages/privacy.js), [pages/terms.js](/Users/Shared/Projects/sso/pages/terms.js), [pages/data-deletion.js](/Users/Shared/Projects/sso/pages/data-deletion.js), and [pages/test-fetch.js](/Users/Shared/Projects/sso/pages/test-fetch.js) via direct `PublicShell`, `PublicBrandFooter`, and `ArticleShell`
  - editorial callouts on core docs pages via `AccentPanel`
- `@doneisbetter/gds-admin/client`
  - [pages/admin/users.js](/Users/Shared/Projects/sso/pages/admin/users.js)
  - [pages/admin/oauth-clients.js](/Users/Shared/Projects/sso/pages/admin/oauth-clients.js)
- `@doneisbetter/gds-admin/server`
  - [pages/admin/dashboard.js](/Users/Shared/Projects/sso/pages/admin/dashboard.js), [pages/admin/users.js](/Users/Shared/Projects/sso/pages/admin/users.js), [pages/admin/activity.js](/Users/Shared/Projects/sso/pages/admin/activity.js), and [pages/admin/oauth-clients.js](/Users/Shared/Projects/sso/pages/admin/oauth-clients.js) via direct `PageHeader`
  - [pages/account.js](/Users/Shared/Projects/sso/pages/account.js) and [pages/demo.js](/Users/Shared/Projects/sso/pages/demo.js) via direct `PageHeader`

## Remaining Gaps

This repo is no longer blocked from direct runtime package consumption. It is now partially migrated.

1. Shell migration gap:
   docs-site composition still relies on a thin local wrapper for shared docs navigation and framing. The previous fake local search and fake version-selector controls were removed; public informational pages and admin pages now consume GDS shells directly at page level.

2. Exception surface gap:
   Google and Facebook provider-branded entry buttons remain a documented narrow exception surface.

3. Lint debt gap:
   most docs/editorial waiver debt is removed, but two long-form narrative docs pages still carry explicit localized waivers for prose-heavy quote/apostrophe content:
   [pages/docs/app-permissions.js](/Users/Shared/Projects/sso/pages/docs/app-permissions.js)
   and [pages/docs/admin-approval.js](/Users/Shared/Projects/sso/pages/docs/admin-approval.js).

## Local Adapter Inventory

- Docs/article shell:
  - [components/DocsLayout.js](/Users/Shared/Projects/sso/components/DocsLayout.js) thin adapter over `PublicShell` and `DocsPageShell`
- Root legal/footer shell:
  - [components/AppFooter.js](/Users/Shared/Projects/sso/components/AppFooter.js) currently provides legacy fixed footer rendering below routed pages.

## Board-Aligned Implementation Notes

- The local adapter inventory is now documented as two active local UI authorities: `DocsLayout` and `AppFooter`.
- `AppFooter` is tracked as a temporary exception and must be removed in the same sequence as docs and public shell cleanup work.

## Approved Exceptions

| Scope | Reason | User impact | Removal condition |
|-------|--------|-------------|-------------------|
| OAuth provider buttons | Google and Facebook branding remains a narrow exception surface | provider CTA visuals stay slightly custom | replace with canonical GDS provider-branded identity controls once shipped |
| Docs/editorial surfaces | docs still use a local docs-site shell wrapper and two targeted lint waivers on long narrative docs pages | docs remain partly locally wrapped and two prose-heavy pages remain locally waived | replace the wrapper with a canonical package-level docs-site shell and normalize the remaining long-form page copy |

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
- Prefer direct `@doneisbetter/*` imports when a stable package contract already exists.
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

`npm run lint` remains the repo's existing baseline lint contract. `npm run lint:gds` wires the shared `@doneisbetter/gds-eslint-config` package and now runs cleanly with only two explicit localized waivers left on long-form docs copy plus the existing server-generated HTML response template exceptions.

## Next Honest Migration Step

1. Remove the last two localized editorial lint waivers in [pages/docs/app-permissions.js](/Users/Shared/Projects/sso/pages/docs/app-permissions.js) and [pages/docs/admin-approval.js](/Users/Shared/Projects/sso/pages/docs/admin-approval.js) by normalizing the remaining long-form prose copy.
2. Collapse [components/DocsLayout.js](/Users/Shared/Projects/sso/components/DocsLayout.js) only after the remaining docs pages no longer require local navigation/framing glue, or after GDS ships a canonical docs-site shell.
