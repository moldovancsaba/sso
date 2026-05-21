# Design System Adapter

Status: Migrating  
Last updated: 2026-05-21

Design / UI / UX SSOT: `/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM`
Aligned SSOT version/date: `1.3.0 / 2026-05-21`

The single source of truth for design, UI, and UX lives in the shared directory:

- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/FOUNDATION.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/FOUNDATION.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPONENT_CONTRACTS.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPONENT_CONTRACTS.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/MANTINE_PLATFORM.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/MANTINE_PLATFORM.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/NAVIGATION_RESPONSIVE.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/NAVIGATION_RESPONSIVE.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/UX_PATTERNS.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/UX_PATTERNS.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/MIGRATION_PLAYBOOK.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/MIGRATION_PLAYBOOK.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/IMPLEMENTATION_READINESS.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/IMPLEMENTATION_READINESS.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/SSO_MANTINE_REFACTOR.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/SSO_MANTINE_REFACTOR.md)

## Local Adapter

- Current UI foundation: Mantine root provider plus narrow editorial CSS on docs surfaces
- Target UI foundation: pure Mantine
- Theme/provider path: `pages/_app.js`, `pages/_document.js`, and shared theme in `lib/ui/mantineTheme.js`
- Wrapper components or primitive policy: Mantine primitives by default, with only thin approved wrappers where necessary
- Notifications/modals setup: `pages/_app.js` via `@mantine/notifications` and `@mantine/modals`
- Styling bridge or legacy layer: `styles/globals.css` plus narrow docs/editorial CSS modules
- UI validation commands: `npm run lint`, `npm run check:docs`

## Known Exceptions

| Scope | Reason | User impact | Removal condition |
|-------|--------|-------------|-------------------|
| OAuth provider buttons | Must remain compliant with Google/Facebook branding rules | visual treatment may stay slightly custom during migration | replace with Mantine-hosted brand-compliant wrappers |
| Docs/editorial surfaces | current docs pages rely on editorial CSS layout | docs remain partly legacy-styled until later migration phase | migrate `pages/docs/*` to Mantine layout and typography |

## Migration Backlog

1. Migrate docs surfaces.
2. Delete remaining legacy editorial CSS after the Mantine docs surfaces are complete.

## Phase 1 Status

- Mantine packages are installed
- root provider is active in `pages/_app.js`
- shared Mantine theme exists in `lib/ui/mantineTheme.js`
- notifications and modals are centralized at the app root
- auth entry surfaces are no longer on the legacy login CSS module path

## Phase 2 Status

- `pages/login.js` is Mantine-based
- `pages/admin/index.js` is Mantine-based
- `pages/admin/callback.js` is Mantine-based
- `pages/oauth/consent.js` is Mantine-based
- the old auth-page CSS module remains legacy inventory until the deletion phase

## Phase 3 Status

- `pages/admin/dashboard.js` is Mantine-based
- `pages/admin/users.js` is Mantine-based
- `pages/admin/oauth-clients.js` is Mantine-based
- `pages/admin/activity.js` is Mantine-based
- `pages/admin/forgot-password.js` is Mantine-based
- `pages/account.js` is Mantine-based
- `pages/index.js` is Mantine-based

## Phase 4 Status

- the legacy style editor was removed instead of being rewritten as a second theme system
- `components/ThemeProvider.js` is removed
- `lib/styleThemes.mjs` is removed
- `pages/admin/style-editor.js` is removed
- theme-management APIs under `pages/api/admin/themes/*` and `pages/api/themes/active.js` are removed

## Rules For This Repo During Migration

- treat the shared directory as its own git-managed repository because multiple projects will read from and write to it
- do not add new product UI CSS modules
- do not add new product UI token systems outside Mantine
- do not treat `styles/globals.css` or docs/editorial CSS modules as long-term sources of truth
- update the shared SSOT first if a reusable design rule changes
