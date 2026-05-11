# SSO Service

Version: 5.29.0  
Last updated: 2026-05-11T12:00:00.000Z

This repository provides the SSO service for `https://sso.doneisbetter.com`.

It currently acts as:

- an OAuth 2.0 / OpenID Connect authorization server
- a hosted login surface for public users
- a centralized per-app authorization layer
- an admin interface and API for users, clients, permissions, and audit operations

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

- Admin sessions use the `admin-session` cookie
- Public user sessions use the `public-session` cookie
- Public session tokens are hashed at rest in the `publicSessions` collection
- Production public sessions use `SameSite=None`, `Secure`, and the configured shared cookie domain when cross-subdomain SSO is enabled

### OAuth / OIDC contract

- Primary flow: Authorization Code
- PKCE supported for public clients
- Standard scopes: `openid`, `profile`, `email`, `offline_access`
- OIDC discovery available at `/.well-known/openid-configuration`
- JWKS available at `/.well-known/jwks.json`

## Operational Notes

The May 2026 hardening pass delivered these changes:

- duplicate and credential-bearing route files removed from the active tree
- canonical social callback state parsing and CSRF validation
- callback-state replay reduction by consuming the CSRF cookie after successful social callback validation
- real bearer-token validation for access-request flows
- normalized app-permission and admin-role handling in runtime compatibility paths
- repository guardrails and documentation-maintenance checks

## Recommended Reading

- [docs/ARCHITECTURE.md](/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md): runtime architecture and core contracts
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
npm run type-check
npm run test
npm run build
npm run guard:repo
npm run check:docs
```
