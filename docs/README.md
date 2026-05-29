# SSO Service

Version: 5.29.0  
Last updated: 2026-05-21T00:00:00.000Z

This repository provides the SSO service for `https://sso.doneisbetter.com`.

It currently acts as:

- an OAuth 2.0 / OpenID Connect authorization server
- a hosted login surface for public users
- a centralized per-app authorization layer
- an admin interface and API for users, clients, permissions, and audit operations

## Design SSOT

All design, UI, and UX rules now defer to the shared cross-project source of truth:

- [docs/DESIGN_SYSTEM.md](/Users/moldovancsaba/Projects/sso/docs/DESIGN_SYSTEM.md)
- [general-design-system README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)

That shared directory is normative for:

- Mantine-first UI rules
- component contracts
- form and modal behavior
- interaction and accessibility expectations

This repository still contains legacy CSS modules and theme infrastructure that should be migrated toward that SSOT rather than extended as a parallel system.

## Current Runtime Contract

### Authentication methods

- Email and password
- Magic links
- PIN verification during selected login attempts
- Google login
- Facebook login

Planned, not implemented:

- Apple Sign In
- Passkeys
- enterprise federation features such as SAML and SCIM

### Canonical roles and statuses

Admin role:

- `admin`

App permission roles:

- `none`
- `user`
- `admin`

App permission statuses:

- `pending`
- `approved`
- `revoked`

Legacy compatibility inputs are normalized in runtime:

- `active` -> `approved`
- `guest` -> `none`
- `owner`, `superadmin`, `super-admin` -> `admin`

### Session model

- Legacy admin sessions use the `admin-session` cookie
- Public user sessions use the `public-session` cookie
- The current admin UI signs in through OAuth and is authorized through a public session plus admin app permission checks
- Public session tokens are hashed at rest in the `publicSessions` collection
- Production public sessions use `SameSite=None`, `Secure`, and the configured shared cookie domain when cross-subdomain SSO is enabled
- High-risk admin mutations require recent authentication and can return `REAUTH_REQUIRED` after the freshness window expires
- High-risk unified-admin mutations also require the session fingerprint to still match the current request; stale legacy public sessions are forced back through re-auth before mutation
- Admin UI routes preserve the current `/admin/*` path during that forced re-login and return to the same screen after OAuth completes

### Enterprise groundwork

- Organizations live in `organizations`
- Organization-scoped users live in `orgUsers`
- Enterprise identity-provider metadata lives in `enterpriseConnections`
- Admin CRUD endpoints now exist for organizations, organization users, and enterprise connection inventory under `/api/admin/orgs/*`
- Live enterprise OIDC, SAML login, and SCIM provisioning are still not implemented

### OAuth / OIDC contract

- Primary flow: Authorization Code
- PKCE supported for public clients
- Standard scopes: `openid`, `profile`, `email`, `offline_access`
- OIDC discovery available at `/.well-known/openid-configuration`
- JWKS available at `/.well-known/jwks.json`
- ID tokens carry identity claims. App-level access state still comes from `appPermissions` and related APIs.

### Canonical session endpoints

- `GET /api/public/session`: canonical public-user session check
- `GET /api/admin/session`: canonical admin UI session check
- `GET /api/sso/validate`: compatibility endpoint that can validate either admin or public sessions

## Operational Notes

The May 2026 hardening pass delivered these changes:

- duplicate and credential-bearing route files removed from the active tree
- canonical social callback state parsing and CSRF validation
- callback-state replay reduction by consuming the CSRF cookie after successful social callback validation
- real bearer-token validation for access-request flows
- normalized app-permission and admin-role handling in runtime compatibility paths
- repository guardrails and documentation-maintenance checks
- fresh-auth admin mutations now also require a bound unified public session
- organization and enterprise federation groundwork endpoints are active again

## Recommended Reading

- [docs/ARCHITECTURE.md](/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md): runtime architecture and core contracts
- [docs/DESIGN_SYSTEM.md](/Users/moldovancsaba/Projects/sso/docs/DESIGN_SYSTEM.md): local pointer to the shared design / UI / UX SSOT
- [docs/THIRD_PARTY_INTEGRATION_GUIDE.md](/Users/moldovancsaba/Projects/sso/docs/THIRD_PARTY_INTEGRATION_GUIDE.md): integration guide for app teams
- [docs/MULTI_APP_PERMISSIONS.md](/Users/moldovancsaba/Projects/sso/docs/MULTI_APP_PERMISSIONS.md): app-permission semantics and workflows
- [docs/ROLE_SYSTEM_MIGRATION.md](/Users/moldovancsaba/Projects/sso/docs/ROLE_SYSTEM_MIGRATION.md): compatibility notes for legacy roles
- [docs/TASKLIST.md](/Users/moldovancsaba/Projects/sso/docs/TASKLIST.md): current backlog

## Important Environment Variables

```bash
MONGODB_URI=...
MONGODB_DB=sso

SESSION_SECRET=...
CSRF_SECRET=...

SSO_BASE_URL=https://sso.doneisbetter.com
SSO_COOKIE_DOMAIN=.doneisbetter.com
SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com

PUBLIC_SESSION_COOKIE=public-session
ADMIN_SESSION_COOKIE=admin-session

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/facebook/callback

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/google/callback
```

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
npm run sync:version
```
