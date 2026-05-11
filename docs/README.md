# SSO Service

Version: 5.29.0  
Last updated: 2026-05-10T00:00:00.000Z

This repository provides the SSO service for `sso.doneisbetter.com`. It acts as:

- an OAuth 2.0 / OpenID Connect authorization server
- a hosted login surface for public users
- an admin system for user, client, and permission management
- a centralized per-app authorization service

## Current Runtime Contract

### Authentication methods
- Email and password
- Magic links
- PIN verification
- Google login
- Facebook login

Apple Sign In is planned and not implemented yet.

### Admin roles
- Canonical admin role: `admin`
- Legacy `super-admin` input is normalized to `admin` in runtime compatibility paths

### App permission roles
- `none`
- `user`
- `admin`

### App permission statuses
- `pending`
- `approved`
- `revoked`

Legacy permission values are normalized in runtime:
- `active` -> `approved`
- `guest` -> `none`
- `owner`, `superadmin`, `super-admin` -> `admin`

### Session model
- Admin sessions use the `admin-session` cookie
- Public user sessions use the `public-session` cookie
- Public session tokens are hashed at rest in `publicSessions`
- In production public session cookies use `SameSite=None`, `Secure`, and the configured cross-subdomain cookie domain

## What Was Recently Hardened

The May 2026 remediation pass shipped these runtime fixes:

- Removed duplicate and credential-bearing backup routes from the active tree
- Added canonical social callback state parsing and CSRF validation
- Enforced real bearer-token validation in app access request flows
- Unified public session cookie behavior across login paths
- Normalized admin roles and app permission roles/statuses across runtime code
- Tightened redirect validation in magic-link and related flows

## Developer References

- [docs/ARCHITECTURE.md](/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md): runtime architecture and core contracts
- [docs/MULTI_APP_PERMISSIONS.md](/Users/moldovancsaba/Projects/sso/docs/MULTI_APP_PERMISSIONS.md): permission model and API contract
- [docs/ROLE_SYSTEM_MIGRATION.md](/Users/moldovancsaba/Projects/sso/docs/ROLE_SYSTEM_MIGRATION.md): role consolidation and compatibility notes
- [docs/TASKLIST.md](/Users/moldovancsaba/Projects/sso/docs/TASKLIST.md): current implementation backlog
- [docs/ROADMAP.md](/Users/moldovancsaba/Projects/sso/docs/ROADMAP.md): delivered phases and upcoming work

## Environment

Important environment variables:

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
npm run build
npm test
```
