# SSO Service

Version: 5.39.5  
Last updated: 2026-08-31T00:00:00.000Z

This repository provides the SSO service for `https://sso.doneisbetter.com`.

It currently acts as:

- an OAuth 2.0 / OpenID Connect authorization server
- a hosted login surface for public users
- a centralized per-app authorization layer
- an admin interface and API for users, clients, permissions, and audit operations

## Design SSOT

All design, UI, and UX rules now defer to one shared cross-project source of truth:

- [general-design-system README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)
- [general-design-system repository](https://github.com/sovereignsquad/general-design-system)

In this repo, [docs/DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) is local implementation tracking and migration status only (non-authoritative).

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

- [docs/ARCHITECTURE.md](ARCHITECTURE.md): runtime architecture and core contracts
- [docs/DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): local implementation/migration tracking for GDS adoption (non-authoritative)
- [docs/THIRD_PARTY_INTEGRATION_GUIDE.md](THIRD_PARTY_INTEGRATION_GUIDE.md): integration guide for app teams
- [docs/MULTI_APP_PERMISSIONS.md](MULTI_APP_PERMISSIONS.md): app-permission semantics and workflows
- [docs/ROLE_SYSTEM_MIGRATION.md](ROLE_SYSTEM_MIGRATION.md): compatibility notes for legacy roles
- [docs/TASKLIST.md](TASKLIST.md): current backlog

## Important Environment Variables

The complete, accurate list lives in `.env.example` — every variable there is read by
the code, with its real default. The ones that break auth flows when missing:

```bash
MONGODB_URI=...

# Canonical base URL for emailed links, OIDC issuer, CSP.
# Unset in production it falls back to https://sso.doneisbetter.com;
# on any other deployment set it explicitly.
SSO_BASE_URL=https://sso.doneisbetter.com

SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com

# Cross-subdomain SSO cookie domain. CAUTION: leave unset on Vercel
# previews/forks — lib/publicSessions.mjs otherwise forces .doneisbetter.com,
# the browser drops the cookie, and login silently fails.
SSO_COOKIE_DOMAIN=.doneisbetter.com

JWT_SECRET=...           # HS256 fallback + public magic links (PUBLIC_MAGIC_SECRET overrides)
CSRF_SECRET=...          # falls back to SESSION_SECRET
ADMIN_MAGIC_SECRET=...   # absent = admin magic links silently never send

# Email transport (lib/email.mjs): EMAIL_PROVIDER (nodemailer|resend),
# SMTP_HOST/PORT/SECURE/USER/PASS or RESEND_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME.

# Social login: GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI, FACEBOOK_APP_ID/SECRET/REDIRECT_URI.

# OAuth2/OIDC signing: JWT_PRIVATE_KEY / JWT_PUBLIC_KEY (inline PEM contents,
# not paths; falls back to keys/private.pem + keys/public.pem on disk).
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
npm run test-connection
npm run sync:version
```
