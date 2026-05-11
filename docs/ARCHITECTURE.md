# Architecture — SSO

Version: 5.29.0  
Last updated: 2026-05-10T00:00:00.000Z

## Stack

- Next.js Pages Router
- Node.js 18+
- MongoDB Atlas

## Canonical Runtime Model

### Admin users
- Collection: `users`
- Canonical role: `admin`
- Legacy `super-admin` values are normalized to `admin`
- Session cookie: `admin-session`

### Public users
- Collection: `publicUsers`
- Global roles used in public auth flows: `user`, `admin`
- Session cookie: `public-session`
- Session storage: `publicSessions` with hashed token storage

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
1. Admin authenticates against `users`
2. Server creates an `admin-session` cookie
3. Admin routes validate session and normalized role

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
- Documentation pages under `pages/docs` may still lag behind this file and should be treated as secondary until reconciled
