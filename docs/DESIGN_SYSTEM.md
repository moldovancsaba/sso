# Design System Adapter

Status: Mostly direct package adoption  
Last updated: 2026-08-08

Design / UI / UX SSOT (authoritative):
- [GDS README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)
- [Compatibility & Releases](https://github.com/sovereignsquad/general-design-system/blob/main/COMPATIBILITY_AND_RELEASES.md)
- [Components & Patterns](https://github.com/sovereignsquad/general-design-system/blob/main/COMPONENTS_AND_PATTERNS.md)
- [Governance & Adoption](https://github.com/sovereignsquad/general-design-system/blob/main/GOVERNANCE_AND_ADOPTION.md)
- [Adoption & Migration Playbook](https://github.com/sovereignsquad/general-design-system/blob/main/ADOPTION_AND_MIGRATION_PLAYBOOK.md)
- [Compliance Toolkit](https://github.com/sovereignsquad/general-design-system/blob/main/COMPLIANCE_TOOLKIT.md)

Aligned SSOT version/date: `4.1.3 / 2026-08-08`

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

- Current UI foundation: direct GDS runtime packages with one remaining local UI adapter (`DocsLayout`)
- Current root provider wiring: [pages/_app.js](../pages/_app.js) via direct `@sovereignsquad/gds-theme/client`
- Current token/theme authority: [lib/theme/mantineTheme.js](../lib/theme/mantineTheme.js) via `@sovereignsquad/gds-theme/server`
- Current app root wiring: [pages/_app.js](../pages/_app.js)
- Current manifest: [gds-adoption.json](../gds-adoption.json)
- Installed runtime packages:
  - `@sovereignsquad/gds-theme@4.1.3`
  - `@sovereignsquad/gds-core@4.1.3`
  - `@sovereignsquad/gds-admin@4.1.3`

## Current Direct Consumption

- `@sovereignsquad/gds-theme/client`
  - [pages/_app.js](../pages/_app.js)
- `@sovereignsquad/gds-theme/server`
  - [lib/theme/mantineTheme.js](../lib/theme/mantineTheme.js)
- `@sovereignsquad/gds-core/server`
  - [pages/login.js](../pages/login.js), [pages/register.js](../pages/register.js), [pages/forgot-password.js](../pages/forgot-password.js), [pages/logout.js](../pages/logout.js), [pages/admin/index.js](../pages/admin/index.js), [pages/admin/callback.js](../pages/admin/callback.js), and [pages/admin/forgot-password.js](../pages/admin/forgot-password.js) via direct `AuthShell`
  - [pages/admin/users.js](../pages/admin/users.js) and [pages/admin/activity.js](../pages/admin/activity.js) via direct `DataToolbar`
  - [components/DocsLayout.js](../components/DocsLayout.js)
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

2. Exception surface gap:
   Google and Facebook provider-branded entry buttons remain a documented narrow exception surface.

3. Lint debt gap:
   most docs/editorial waiver debt is removed, but two long-form narrative docs pages still carry explicit localized waivers for prose-heavy quote/apostrophe content:
   [pages/docs/app-permissions.js](../pages/docs/app-permissions.js)
   and [pages/docs/admin-approval.js](../pages/docs/admin-approval.js).

## Local Adapter Inventory

- Docs/article shell:
  - [components/DocsLayout.js](../components/DocsLayout.js) thin adapter over `PublicShell` and `DocsPageShell`

## Board-Aligned Implementation Notes

- The local adapter inventory is now documented as one active local UI authority: `DocsLayout`.

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

1. Remove the last two localized editorial lint waivers in [pages/docs/app-permissions.js](../pages/docs/app-permissions.js) and [pages/docs/admin-approval.js](../pages/docs/admin-approval.js) by normalizing the remaining long-form prose copy.
2. Collapse [components/DocsLayout.js](../components/DocsLayout.js) only after the remaining docs pages no longer require local navigation/framing glue, or after GDS ships a canonical docs-site shell.
