# Architecture — SSO

Version: 5.29.0  
Last updated: 2026-05-21T00:00:00.000Z

## Stack

- Next.js Pages Router
- Node.js 18+
- MongoDB Atlas

## Design System Boundary

- Design, UI, and UX governance is defined outside this repo in [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM)
- The local pointer is [docs/DESIGN_SYSTEM.md](/Users/moldovancsaba/Projects/sso/docs/DESIGN_SYSTEM.md)
- Current local CSS modules and `styles/globals.css` are implementation artifacts, not the long-term design SSOT
- Future UI work should migrate this repo toward the Mantine-first contracts in that shared directory

## Canonical Runtime Model

### Admin users
- Collection: `users`
- Canonical role: `admin`
- Legacy `super-admin` values are normalized to `admin`
- Legacy session cookie: `admin-session`
- Legacy session storage: `sessions`
- Current admin UI authorization also supports a public session plus `sso-admin-dashboard` app permission
- Session timeout: 4 hours with server-side validation and sliding extension on activity
- High-risk unified-admin mutations require recent authentication; default freshness window is 15 minutes unless `ADMIN_FRESH_AUTH_WINDOW_MS` overrides it
- The admin UI handles `REAUTH_REQUIRED` by returning the operator to `/admin`, preserving the current admin route, and resuming at that route after OAuth login completes

### Public users
- Collection: `publicUsers`
- Global roles used in public auth flows: `user`, `admin`
- Session cookie: `public-session`
- Session storage: `publicSessions` with hashed token storage
- Session timeout: 30 days with sliding extension on activity
- Elevated admin actions on the unified public-session path require the session fingerprint to continue matching the current request

### OAuth clients
- Collection: `oauthClients`
- Statuses: `active`, `suspended`
- Supported grants in the current codebase include authorization code, refresh token, and client credentials where configured

### App permissions
- Collection: `appPermissions`
- Canonical roles: `none`, `user`, `admin`
- Canonical statuses: `pending`, `approved`, `revoked`
- Access is granted only when status is `approved` and role is not `none`
- Legacy records are normalized at read/write time:
  - `active` -> `approved`
  - `guest` -> `none`
  - `owner`, `superadmin`, `super-admin` -> `admin`

## Main Flows

### Admin authentication
1. Preferred admin UI path starts at `/admin`, which launches an OAuth flow for `sso-admin-dashboard`
2. Successful admin OAuth login creates a public session and checks `appPermissions` for admin access
3. `GET /api/admin/session` validates that admin access, and still supports legacy `admin-session` users
4. Sensitive admin mutations may require recent authentication and can return `REAUTH_REQUIRED`
5. Sensitive unified-admin mutations also reject unbound or stale legacy public sessions and force re-auth to refresh the session binding

### Public authentication
1. User authenticates with password, magic link, PIN, Google, or Facebook
2. Server creates a `public-session`
3. Raw session token is stored in the cookie, hashed token is stored in `publicSessions`

### OAuth authorization
1. Client starts at `/api/oauth/authorize`
2. Server validates client and request shape
3. User authenticates if needed
4. Server checks or creates per-app permission state
5. Approved users continue through consent and code issuance
6. Client exchanges code at `/api/oauth/token`
7. ID token returns identity claims; app-specific authorization remains a separate permission concern

## Security-Relevant Behavior

### Social callback state validation
- Google and Facebook login flows use a shared encoded callback state contract
- Callback processing validates state parsing and CSRF binding before continuing login

### Public session cookies
- Development: `SameSite=Lax`
- Production cross-subdomain mode: `SameSite=None`, `Secure`, and `Domain=<configured cookie domain>`

### Access request protection
- `/api/users/[userId]/apps/[clientId]/request-access` requires a real validated bearer token
- The token subject must match `userId`
- The token client must match `clientId`

### Permission reads and writes
- Self-service reads are constrained to the token subject and token client
- App-to-app permission mutations require a client token with `manage_permissions`
- Admin-session mutation paths remain available for the admin UI
- Sensitive unified-admin mutations can return `REAUTH_REQUIRED` even when the session is otherwise valid
- Permission DTOs normalize legacy values but the canonical runtime contract is still `none|user|admin` plus `pending|approved|revoked`

## Important Collections

### `users`
- Admin identity store
- Backward compatibility remains for older records, but runtime treats all valid admins as `admin`

### `publicUsers`
- Public user account store
- Can contain password-backed and social-linked identities

### `publicSessions`
- Public session records
- Contains hashed token, userId, expiry, and request metadata

### `oauthClients`
- OAuth client registrations
- Holds client metadata, allowed scopes, grant settings, and redirect URIs

### `organizations`
- Enterprise tenant records used to scope federation groundwork

### `orgUsers`
- Organization-scoped identities for tenant-managed access

### `enterpriseConnections`
- Enterprise OIDC / SAML metadata inventory and future SCIM attachment point

### `appPermissions`
- Central per-user, per-app authorization records
- Canonical source of app access state

### `auditLogs`
- Admin action audit trail

### `appAccessLogs`
- Access attempts and permission-change events around app authorization

## Known Boundaries

- Passkeys are not implemented yet
- Apple Sign In is not implemented yet
- Enterprise federation features such as SAML and SCIM are not implemented yet
- Enterprise groundwork endpoints exist, but they currently stop at metadata/configuration inventory rather than live federation runtime
- Documentation pages under `pages/docs` may still lag behind this file and should be treated as secondary until reconciled
- The current repo still contains legacy local styling infrastructure that has not yet been replaced by the shared Mantine-first design-system target
