# Universal SSO Service

Version: 5.29.0  
Status: Active

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
- Admin sessions use the `admin-session` cookie

## Start Here

- Canonical service overview: [docs/README.md](/Users/moldovancsaba/Projects/sso/docs/README.md)
- Integration guide: [docs/THIRD_PARTY_INTEGRATION_GUIDE.md](/Users/moldovancsaba/Projects/sso/docs/THIRD_PARTY_INTEGRATION_GUIDE.md)
- Architecture: [docs/ARCHITECTURE.md](/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md)
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
- Legacy role/status inputs are normalized in runtime compatibility paths, but documentation uses only canonical values.
