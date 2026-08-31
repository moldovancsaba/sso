# Architecture — SSO

Version: 5.39.4  
Last updated: 2026-08-21T00:00:00.000Z

## Stack

- Next.js Pages Router
- Node.js 24.x
- MongoDB Atlas

## Design System Boundary

- Design, UI, and UX governance is defined in the [general-design-system repo](https://github.com/sovereignsquad/general-design-system), which is the only authoritative SSOT.
- [docs/DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) is local implementation tracking for this repo (non-authoritative).
- Current local CSS modules and `styles/globals.css` are implementation artifacts, not the long-term design SSOT
- Future UI work should migrate this repo toward the Mantine-first contracts in that shared directory

## Canonical Runtime Model

### Admin users
- Collection: `users`
- Canonical role: `admin`
- Legacy `super-admin` values are normalized to `admin`
- Legacy session cookie: `admin-session`
- Legacy session storage: `adminSessions`
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
- Supported grants in the current codebase are authorization code, refresh token, and client credentials
- `client_credentials` issues a token with no user context: no `sub` claim, no refresh token, no ID token. `validateAccessToken()` resolves such a token to `userId: null`, so it can never satisfy a user-identity comparison
- Machine clients should be registered one per automated caller, with no redirect URIs, since revocation and audit are per-client

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
- Login initiation endpoints are simple `GET` handlers that should return a provider `302` immediately; if they time out in production, treat that as a broader API runtime failure before assuming a provider credential problem

### Public session cookies
- Development: `SameSite=Lax`
- Production cross-subdomain mode: `SameSite=None`, `Secure`, and `Domain=<configured cookie domain>`

### Access request protection
- `/api/users/[userId]/apps/[clientId]/request-access` requires a real validated bearer token
- The token subject must match `userId`
- The token client must match `clientId`

### Admin session identity resolution
- `getAdminUser()` (`lib/auth.mjs`) resolves the acting admin's identity from the database-verified session record (`sessionValidation.session.userId`), never from the unsigned `userId` field carried in the session cookie payload
- This prevents a request from acting as a different admin by presenting a cookie with a modified identity field

### CSRF protection (state-changing requests)

`lib/middleware/csrf.mjs` implements two independent CSRF mechanisms for two different contexts.

**Origin/Referer allowlist** — the primary mechanism for cookie-authenticated admin and public-session routes:
- `validateRequestOrigin(req)` runs inside `requireAdmin()` and `requireUnifiedAdmin()` (`lib/auth.mjs`), which gate the admin API routes, and is also called directly by cookie-authenticated public-session routes (e.g. `pages/api/public/account.js`, `pages/api/public/change-password.js`, `pages/api/public/logout.js`, `pages/api/public/profile.js`, `pages/api/oauth/consent.js`, `pages/api/resource-passwords/index.js`)
- Safe methods (`GET`, `HEAD`, `OPTIONS`) always pass; other methods must present an `Origin` (or, failing that, `Referer`) header that matches a trusted-origin allowlist, or the request is rejected before session/auth logic runs
- Requests with no `Origin`/`Referer` header at all are allowed through this check, since browsers always attach one of these headers on cross-origin state-changing requests; a request missing both has no ambient browser authority to forge
- Trusted origins come from `getTrustedOrigins()`, seeded from the service's own canonical origin plus any explicitly configured additional origins
- Rejections return `403` with a `FORBIDDEN` error code and are recorded via `logSecurityEvent('csrf_origin_rejected', ...)`
- This is a distinct mechanism from CORS (`lib/cors.mjs`): CORS controls whether a browser lets client-side JavaScript read a cross-origin response; this Origin check controls whether the server accepts a state-changing request at all, independent of CORS headers
- Pre-session endpoints (`pages/api/admin/login.js` and equivalents) don't call this check: there is no session cookie yet for a forged cross-site request to ride on, so ambient-cookie CSRF doesn't apply to the login submission itself

**Callback-state CSRF cookie** — used only for the Google/Facebook social-login callback contract:
- `ensureCsrfToken()` sets a signed CSRF cookie when the login flow starts (`pages/api/auth/{google,facebook}/login.js`)
- The encoded OAuth `state` parameter carries a copy of that token; `validateStateCsrfToken()` confirms the callback's `state.csrf` matches the signed cookie before the callback continues (`pages/api/auth/{google,facebook}/callback.js`)
- `clearCsrfCookie()` consumes the cookie after successful validation, so a replayed callback state cannot be validated twice
- This mechanism is unrelated to the Origin/Referer allowlist above; it protects the OAuth callback state parameter specifically, not general state-changing admin/public routes

### Rate limiting
- `express-rate-limit`-based limiters are applied via the shared `applyRateLimiter()` helper (`lib/apiHelpers.mjs`), which resolves once the underlying limiter has finished handling the request — including the case where the limiter itself sends a `429` response instead of calling `next()`
- Distinct limiters exist for public login/register/forgot-password flows, magic-link and PIN endpoints (admin and public), OAuth token/authorize endpoints, and admin login/mutation/query traffic, each with its own window and request cap defined in `lib/middleware/rateLimit.mjs`
- Callers must check `res.writableEnded` after awaiting the limiter, since a limited request has already sent its own response

### Admin password storage
- Admin passwords are stored as bcrypt hashes (`lib/users.mjs`: `hashAdminPassword()`, `verifyAdminPassword()`)
- Legacy non-bcrypt stored values are compared using a constant-time comparison (`lib/timingSafeCompare.mjs`) and transparently rehashed to bcrypt on the next successful login (lazy migration); no bulk migration or downtime is required

### Machine-only scopes
- `manage_permissions` is defined with `machineOnly: true` (`lib/oauth/scopes.mjs`)
- `validateScopes()` gates only the interactive `/authorize` flow and rejects machine-only scopes there; the `client_credentials` path validates against `client.allowed_scopes` instead
- The distinction is load-bearing: a bearer of `manage_permissions` can write permission records for every user of that client, so it must never be reachable by a token one end user consented to

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

### `accessTokens`
- OAuth bearer access token records issued at `/api/oauth/token` (`lib/oauth/tokens.mjs`)

### `refreshTokens`
- OAuth refresh token records, rotated and revoked alongside access tokens (`lib/oauth/tokens.mjs`)

### `authorizationCodes`
- Short-lived OAuth authorization codes pending exchange at `/api/oauth/token` (`lib/oauth/codes.mjs`)

### `userConsents`
- Per-user, per-client OAuth consent grants recorded during the authorize flow (`pages/api/oauth/authorize.js`)

### `adminSessions`
- Legacy admin session records (see Canonical Runtime Model, "Legacy session storage") (`lib/sessions.mjs`)

### `publicMagicTokens`
- Magic-link login tokens for public users (`pages/api/public/magic-login.js`)

### `adminMagicTokens`
- Signed, single-use magic-link tokens for admin access (`lib/magic.mjs`)

### `loginPins`
- Random PIN-verification codes issued on selected login attempts, admin and public (`lib/loginPin.mjs`)

### `systemSettings`
- Runtime-configurable settings, including the PIN-verification trigger frequency (`lib/loginPin.mjs`)

### `resourcePasswords`
- Shared resource-level passwords and usage tracking, generic across resources (`lib/resourcePasswords.mjs`)

### `passwordResetTokens`
- Time-limited, single-use password reset tokens for all user types (`lib/passwordReset.mjs`)

### `orgEmailConfigs`
- Per-organization email provider configuration (SMTP, Resend) for multi-tenant sending (`lib/orgEmailConfig.mjs`)

## Known Boundaries

- Next.js Pages Router requires consistent dynamic segment names within the same path family. For example, `/api/admin/orgs/[orgId]` and `/api/admin/orgs/[orgId]/users/[id]` are valid together, but mixing `/api/admin/orgs/[id]` with nested `/api/admin/orgs/[orgId]/...` can break the production runtime even if the build passes.
- Passkeys are not implemented yet
- Apple Sign In is not implemented yet
- Enterprise federation features such as SAML and SCIM are not implemented yet
- Enterprise groundwork endpoints exist, but they currently stop at metadata/configuration inventory rather than live federation runtime
- Documentation pages under `pages/docs` may still lag behind this file and should be treated as secondary until reconciled
- The current repo still contains legacy local styling infrastructure that has not yet been replaced by the shared Mantine-first design-system target
