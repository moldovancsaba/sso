# Design System Adapter

Status: Migrating  
Last updated: 2026-05-24

Design / UI / UX SSOT: `/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM`
Aligned SSOT version/date: `2.3.0 / 2026-05-24`

`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM` is the single source of truth for design, UI, and UX. Project-local files describe only implementation adapter details, migration state, validation commands, and approved exceptions.

Canonical shared documents for this repo:

- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/FOUNDATION.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/FOUNDATION.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPONENTS_AND_PATTERNS.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPONENTS_AND_PATTERNS.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PATTERN_SERVICE_MODEL.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PATTERN_SERVICE_MODEL.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/SERVICE_BACKBONE_IMPLEMENTATION_PLAN.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/SERVICE_BACKBONE_IMPLEMENTATION_PLAN.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE_AND_ADOPTION.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE_AND_ADOPTION.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPATIBILITY_AND_RELEASES.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/COMPATIBILITY_AND_RELEASES.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/THEME_GOVERNANCE.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/THEME_GOVERNANCE.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/EXCEPTION_SURFACES.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/EXCEPTION_SURFACES.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/PORTFOLIO_ADOPTION_MATRIX.md)
- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/SSO_MANTINE_REFACTOR.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/SSO_MANTINE_REFACTOR.md)

## Local Adapter

- Current UI foundation: Mantine root provider plus narrow editorial CSS on docs surfaces
- Target UI foundation: pure Mantine
- Theme/provider path: `pages/_app.js`, `pages/_document.js`, and `lib/ui/mantineTheme.js`
- Notifications/modals setup: `pages/_app.js` via `@mantine/notifications` and `@mantine/modals`
- Primitive policy: Mantine primitives by default, with only thin approved wrappers where necessary
- Consumed GDS version: `2.3.0`
- Shared package install path: not yet adopted; this repo currently consumes the GDS as governance/docs plus local Mantine packages
- UI validation commands: `npm run lint`, `npm run check:docs`

## Local Contract Inventory

- App shell/page header: [components/AdminShell.js](/Users/Shared/Projects/sso/components/AdminShell.js), [components/AccountShell.js](/Users/Shared/Projects/sso/components/AccountShell.js)
- Auth shell: [components/AuthSurface.js](/Users/Shared/Projects/sso/components/AuthSurface.js)
- Article/docs shell: [components/DocsLayout.js](/Users/Shared/Projects/sso/components/DocsLayout.js)
- Theme/token authority: [lib/ui/mantineTheme.js](/Users/Shared/Projects/sso/lib/ui/mantineTheme.js)
- Metric card: backlog, no dedicated local contract yet
- Data toolbar/responsive data view: currently embedded in admin pages; promote to local contract before reuse spreads further
- State block: backlog, no dedicated local contract yet

## Known Exceptions

| Scope | Reason | User impact | Removal condition |
|-------|--------|-------------|-------------------|
| OAuth provider buttons | Must remain compliant with Google/Facebook branding rules | visual treatment may stay slightly custom during migration | replace with Mantine-hosted brand-compliant wrappers |
| Docs/editorial surfaces | current docs pages rely on editorial CSS layout | docs remain partly legacy-styled until later migration phase | migrate `pages/docs/*` to Mantine layout and typography |

## Migration Backlog

1. Migrate docs surfaces.
2. Promote repeated admin data-toolbar and responsive data-view patterns into explicit local contracts before further spread.
3. Introduce a dedicated reusable `StateBlock` contract for loading, empty, error, permission, disabled, and success states.
4. Delete remaining legacy editorial CSS after the Mantine docs surfaces are complete.

## Phase Status

### Phase 1: Root Mantine Platform

- Mantine packages are installed
- root provider is active in `pages/_app.js`
- shared Mantine theme exists in `lib/ui/mantineTheme.js`
- notifications and modals are centralized at the app root
- auth entry surfaces are no longer on the legacy login CSS module path

### Phase 2: Auth Surfaces

- `pages/login.js` is Mantine-based
- `pages/admin/index.js` is Mantine-based
- `pages/admin/callback.js` is Mantine-based
- `pages/oauth/consent.js` is Mantine-based
- the old auth-page CSS module remains legacy inventory until the deletion phase

### Phase 3: Admin Shell And CRUD

- `pages/admin/dashboard.js` is Mantine-based
- `pages/admin/users.js` is Mantine-based
- `pages/admin/oauth-clients.js` is Mantine-based
- `pages/admin/activity.js` is Mantine-based
- `pages/admin/forgot-password.js` is Mantine-based
- `pages/account.js` is Mantine-based
- `pages/index.js` is Mantine-based

### Phase 4: Style Editor Decision

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
