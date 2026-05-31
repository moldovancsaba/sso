# Universal SSO Service

Version: 5.29.0  
Status: Active  
Last updated: 2026-05-21T00:00:00.000Z

This repository contains the DoneIsBetter SSO service for `https://sso.doneisbetter.com`.

It provides:

- OAuth 2.0 / OpenID Connect authorization
- hosted public-user authentication
- centralized per-app authorization and approval workflows
- admin tools for users, clients, permissions, and audit visibility

## Runtime Summary

- Public authentication methods: email/password, magic link, PIN verification, Google, Facebook
- Canonical admin role: `admin`
- Canonical app-permission roles: `none`, `user`, `admin`
- Canonical app-permission statuses: `pending`, `approved`, `revoked`
- Public sessions use the `public-session` cookie
- Legacy admin sessions use the `admin-session` cookie
- The current admin UI uses OAuth plus a public session with admin app permission checks
- App-level authorization is not encoded by default into the ID token; use permission APIs when app access or app role matters

## Start Here

- Canonical service overview: [docs/README.md](/Users/moldovancsaba/Projects/sso/docs/README.md)
- Integration guide: [docs/THIRD_PARTY_INTEGRATION_GUIDE.md](/Users/moldovancsaba/Projects/sso/docs/THIRD_PARTY_INTEGRATION_GUIDE.md)
- Architecture: [docs/ARCHITECTURE.md](/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md)
- Design / UI / UX implementation notes: [docs/DESIGN_SYSTEM.md](/Users/moldovancsaba/Projects/sso/docs/DESIGN_SYSTEM.md)
- Rendered docs entry: [pages/docs/api/index.js](/Users/moldovancsaba/Projects/sso/pages/docs/api/index.js)

## Local Commands

```bash
npm install
npm run setup
npm run dev
npm run lint
npm run type-check
npm run test
npm run build
npm run guard:repo
npm run check:docs
npm run validate-config
npm run test-connection
```

## Notes

- Apple Sign In is planned backlog work and is not currently implemented.
- `GET /api/public/session` is the canonical public-session check.
- `GET /api/admin/session` is the canonical admin-session check for the admin UI.
- `GET /api/sso/validate` remains a compatibility endpoint for mixed admin/public shared-domain checks.
- Legacy role/status inputs are normalized in runtime compatibility paths, but documentation uses only canonical values.
- Design, UI, and UX rules are governed by the shared SSOT in the [general-design-system repo](https://github.com/sovereignsquad/general-design-system).  
- [docs/DESIGN_SYSTEM.md](/Users/Shared/Projects/sso/docs/DESIGN_SYSTEM.md) tracks local migration state and adapter decisions for this repository.
- Current local CSS and theme infrastructure should be treated as legacy implementation to migrate toward that Mantine-first SSOT.
