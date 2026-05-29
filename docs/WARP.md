# WARP.md

Historical internal reference retained for compatibility with older tooling.

**Document**: WARP.md — SSO Service  
**Repository**: sso  
**Version**: 5.29.0  
**LastUpdated (UTC)**: 2026-05-20T00:00:00.000Z  
**Status**: Current condensed reference

## Essential Commands

```bash
npm install
npm run setup
npm run dev
npm run build
npm start
npm run lint
npm run type-check
npm run test
npm run guard:repo
npm run check:docs
npm run validate-config
npm run test-connection
npm run sync:version
```

Operational commands in active use:

```bash
NEW_ADMIN_TOKEN=<32-hex-token> node scripts/bootstrap-admin.mjs
node scripts/bootstrap-admin-client.mjs
node scripts/migrate-admins-to-unified-system.mjs
NEW_MAGIC_EMAIL=<email> node scripts/generate-magic-link.mjs
node scripts/check-user.mjs <email>
node scripts/grant-admin-access.mjs <email> [admin|super-admin]
EMAIL=<email> node scripts/grant-admin-permission.mjs
node scripts/grant-app-access.mjs <userEmail> [clientId] [role]
node scripts/verify-oauth-client.mjs <client_id>
node scripts/verify-client-secret.mjs <client_id> <plaintext_secret>
DRY_RUN=true node scripts/merge-duplicate-accounts.mjs
```

## Current Runtime Model

- Framework: Next.js Pages Router
- Admin users live in `users` and use canonical role `admin`
- Public users live in `publicUsers`
- Admin session cookie: `admin-session`
- Public session cookie: `public-session`
- Admin sessions are server-side DB-backed sessions with 4-hour sliding expiry
- Public sessions are stored in `publicSessions` with hashed token storage and 30-day sliding expiry
- Canonical app-permission roles: `none`, `user`, `admin`
- Canonical app-permission statuses: `pending`, `approved`, `revoked`
- Legacy compatibility normalization remains at runtime:
  - `super-admin`, `superadmin`, `owner` -> `admin`
  - `guest` -> `none`
  - `active` -> `approved`
- The current admin UI uses OAuth plus a public session with admin app permission checks; legacy `admin-session` support remains available

## Current Authentication Surfaces

- Admin login: `POST /api/admin/login`
- Admin session validation: `GET /api/admin/session`
- Public login: `POST /api/public/login`
- Public session validation: `GET /api/public/session`
- Compatibility mixed-session validation: `GET /api/sso/validate`
- Social login: Google and Facebook only
- OAuth / OIDC:
  - `GET /api/oauth/authorize`
  - `POST /api/oauth/token`
  - `GET /api/oauth/userinfo`
  - `POST /api/oauth/revoke`
  - `GET /api/oauth/logout`
  - `GET /.well-known/openid-configuration`
  - `GET /.well-known/jwks.json`

## Important Constraints

- Apple Sign In is not implemented
- Passkeys are not implemented
- Enterprise federation features such as SAML and SCIM are not implemented
- Public-auth endpoints set cookie-backed sessions; they do not replace the OAuth token flow
- App-level authorization is not encoded by default as the canonical app-permission contract; use permission APIs when app access or app role matters
- Canonical docs live in [`/Users/moldovancsaba/Projects/sso/docs/README.md`](/Users/moldovancsaba/Projects/sso/docs/README.md), [`/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md`](/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md), and [`/Users/moldovancsaba/Projects/sso/docs/THIRD_PARTY_INTEGRATION_GUIDE.md`](/Users/moldovancsaba/Projects/sso/docs/THIRD_PARTY_INTEGRATION_GUIDE.md)
- Design, UI, and UX SSOT lives in the [general-design-system README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md); local design notes are subordinate to that shared authority
