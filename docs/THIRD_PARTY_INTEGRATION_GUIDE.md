# Third-Party Integration Guide — SSO Service

**Version**: 5.39.2  
**Last Updated**: 2026-08-21T00:00:00.000Z  
**Service URL**: https://sso.doneisbetter.com  
**Status**: Current Runtime Guide

## Overview

The SSO service provides:

- OAuth 2.0 / OIDC login and token issuance
- centralized app-approval and role management
- hosted public-user authentication
- cookie-based SSO for shared subdomain deployments

## Design / UI / UX SSOT

If you are building or modifying hosted UI surfaces, admin screens, auth forms, or shared component patterns around this service, use the shared design-system source of truth:

- [general-design-system README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)

That directory is authoritative for Mantine-first component, form, modal, and interaction rules across projects.

## What You Get

- Single Sign-On across integrated applications
- Public authentication methods: password, magic link, PIN, Google, Facebook
- Standard OAuth 2.0 / OIDC flows with PKCE support
- Canonical per-app roles: `none`, `user`, `admin`
- Canonical per-app statuses: `pending`, `approved`, `revoked`
- Centralized approval workflows managed in SSO

Planned but not currently implemented:

- Apple Sign In
- passkeys
- enterprise federation such as SAML and SCIM

## Integration Methods

| Method | Best For | Domain Requirement | Notes |
| --- | --- | --- | --- |
| OAuth2 / OIDC | External domains, mobile apps, SPAs, server apps | Any domain | Recommended default |
| Cookie-Based SSO | Shared subdomain apps | Shared cookie domain | Simple session-validation flow |
| Social Login via hosted SSO | Lower-friction end-user auth | Any domain | End users authenticate on the hosted SSO login page |
| Client Credentials (M2M) | Agents, daemons, scheduled jobs, service-to-service | Any domain | No user context; no browser; see Method 4 |

## Method 1: OAuth2 / OIDC

### Recommended flow

Use Authorization Code flow, with PKCE for public clients.

1. Register an OAuth client in the SSO admin UI.
2. Redirect users to `/api/oauth/authorize`.
3. Receive an authorization code on your redirect URI.
4. Exchange the code at `/api/oauth/token`.
5. Validate the returned `id_token` and use the `access_token` for SSO API calls.

### Authorization request

```http
GET https://sso.doneisbetter.com/api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/auth/callback
  &response_type=code
  &scope=openid%20profile%20email%20offline_access
  &state=RANDOM_STATE
  &nonce=RANDOM_NONCE
  &code_challenge=PKCE_CODE_CHALLENGE
  &code_challenge_method=S256
```

Supported optional parameters include:

- `prompt`
- `provider`
- `login_hint`

### Token exchange

```http
POST https://sso.doneisbetter.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/auth/callback",
  "code_verifier": "PKCE_CODE_VERIFIER"
}
```

Success response:

```json
{
  "access_token": "JWT_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "REFRESH_TOKEN",
  "id_token": "JWT_ID_TOKEN"
}
```

### OIDC endpoints

- `GET /.well-known/openid-configuration`
- `GET /.well-known/jwks.json`
- `GET /api/oauth/userinfo`
- `POST /api/oauth/revoke`
- `GET /api/oauth/logout`

### Token usage

- Use the `id_token` for identity claims.
- Use the `access_token` for SSO API calls.
- Refresh expired access tokens with `grant_type=refresh_token`.
- Do not infer per-app access or per-app admin role from the ID token alone. Use the permission APIs when app authorization matters.

## App-Level Permissions

SSO owns per-app access decisions. The canonical model is:

- role: `none`, `user`, `admin`
- status: `pending`, `approved`, `revoked`

Access is granted only when:

- `status === "approved"`
- `role !== "none"`

### User/client permission read

```http
GET /api/users/{userId}/apps/{clientId}/permissions
Authorization: Bearer ACCESS_TOKEN
```

Valid callers:

- the same user for the same client
- the same client with `manage_permissions`
- an authenticated admin session

### App-managed permission write

```http
PUT /api/users/{userId}/apps/{clientId}/permissions
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "role": "user",
  "status": "approved"
}
```

Requirements:

- bearer token must belong to the same client
- bearer token must include `manage_permissions`

### Admin-managed permission write

```http
PUT /api/admin/users/{userId}/apps/{clientId}/permissions
Cookie: admin-session=... or public-session=...
Content-Type: application/json

{
  "role": "admin",
  "status": "approved"
}
```

The canonical admin UI path now uses `GET /api/admin/session`, which can validate either a legacy admin session or the current OAuth-backed admin public session.

### Access-request flow

If a user does not yet have app access, the client can create a pending request:

```http
POST /api/users/{userId}/apps/{clientId}/request-access
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "User Name"
}
```

Security requirements:

- token must be a user-bound access token
- token subject must match `userId`
- token client must match `clientId`

## Method 2: Cookie-Based SSO

Use this only when the integrated app shares the configured cookie domain.

### Public session validation

```http
GET /api/public/session
Cookie: public-session=...
```

Success response:

```json
{
  "isValid": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "status": "active",
    "emailVerified": true,
    "loginMethods": ["password", "google"]
  }
}
```

### Shared-domain validation helper

```http
GET /api/sso/validate
Cookie: public-session=... or admin-session=...
```

Use this only if your integration specifically depends on that compatibility endpoint. For new work, prefer `GET /api/public/session` for public-user session checks.

### Admin session validation

```http
GET /api/admin/session
Cookie: public-session=... or admin-session=...
```

Use this for the hosted admin UI contract. Unified-admin responses can also include:

```json
{
  "auth": {
    "model": "unified-public-session",
    "authenticatedAt": "2026-05-21T10:00:00.000Z",
    "requiresRecentAuth": false
  }
}
```

## Method 3: Hosted Public Authentication

### Public registration

```http
POST /api/public/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "name": "User Name"
}
```

This endpoint:

- creates a new public user, or
- links a password onto an existing social-only account with the same email

### Public password login

```http
POST /api/public/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

Important:

- this endpoint sets a `public-session` cookie
- it does not return OAuth tokens directly
- some logins may trigger PIN verification before session completion

### Magic-link request

```http
POST /api/public/request-magic-link
Content-Type: application/json

{
  "email": "user@example.com",
  "redirect_uri": "https://yourapp.com/after-login"
}
```

This endpoint always returns a generic success response to avoid email enumeration.

### PIN verification

```http
POST /api/public/verify-pin
Content-Type: application/json

{
  "email": "user@example.com",
  "pin": "123456"
}
```

## Method 4: Machine-to-Machine (agents and background services)

Use this when the caller is **not a person** — an agent, a daemon, a scheduled job, or
one service calling another. The interactive `authorization_code` flow cannot be used
headlessly: it requires a browser and a human to authenticate and consent.

### Registering a machine client

Register a dedicated confidential client per automated caller — not one shared client
reused by several. Revocation and audit are per-client, so a shared client cannot be
withdrawn from one caller without breaking the rest.

- `grant_types` must include `client_credentials`
- omit redirect URIs — this grant never redirects
- keep `allowed_scopes` as narrow as the job requires

### Token request

```http
POST https://sso.doneisbetter.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "scope": "manage_permissions"
}
```

Success response:

```json
{
  "access_token": "JWT_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "manage_permissions"
}
```

Send credentials in the **request body**. The token endpoint does not read an HTTP Basic
`Authorization` header; if your OAuth library defaults to `client_secret_basic`,
configure it for `client_secret_post`. OIDC discovery advertises only the method that is
actually implemented, so a library that reads the discovery document will pick correctly.

### What a machine token is and is not

- It carries **no `sub` claim** and no user identity. `client_id` identifies the caller.
- No refresh token is issued. Request a new token when the current one expires; they
  last one hour by default (`OAUTH2_ACCESS_TOKEN_LIFETIME`).
- No `id_token` is issued — there is no user to describe.
- It cannot pass a user-identity check. Endpoints that compare the token's subject
  against a `userId` will correctly refuse it.

### Scopes

`scope` is **required** on this grant. Omitting it returns `invalid_scope`. It previously
defaulted to `manage_permissions`, so a caller that forgot the parameter was handed the
strongest machine scope it was allowed to hold; that default is gone.

Two kinds of machine scope exist.

**Resource scopes**, named `<resource>:<capability>`, authorize calls against one backend
service and nothing else. Request the narrowest one that does the job:

| Scope | Grants |
| --- | --- |
| `classscout:ingest.write` | Create and patch provider records via the ClassScout ingest API |
| `classscout:catalog.read` | Read the ClassScout provider catalog |
| `management:ingest.write` | Create and patch listing records via the management ingest API |
| `management:catalog.read` | Read the management listing catalog |
| `management:staff` | Act as staff in the management app — console and admin actions — with no human login |

`management:staff` is the most privileged of these. It exists for headless staff-console
work, and it is deliberately separate from the two `management:` ingest/catalog scopes: a
caller that writes listings should not thereby be able to act as staff, and vice versa.
Request it only for a caller that genuinely performs staff actions.

**`manage_permissions`** writes per-user app-permission records *at SSO itself*. It is not a
general-purpose machine scope — do not request it unless your caller administers SSO
permissions. Most integrations want a resource scope instead.

All of the above are **machine-only**: obtainable through this grant and rejected on
`/api/oauth/authorize`. A token obtained by one end user must never carry a scope that acts
on every user's data, or on a whole backend service.

Requesting a scope outside the client's `allowed_scopes` returns `invalid_scope`.

### Audience — which service a token is for

A token's `aud` claim names the **resource the token is for**, derived from the resource
prefix of the scopes you requested. `client_id` still identifies you, the caller.

```json
{ "aud": "classscout", "client_id": "openclaw-worker", "scope": "classscout:ingest.write" }
```

This is what lets a resource server reject a token minted for a different service
(RFC 9068 §4). Validate it: a service that accepts any well-signed SSO token regardless of
`aud` accepts tokens issued for every other service too.

Scopes that name no resource — `manage_permissions`, and user scopes such as `read:cards` —
leave `aud` set to the requesting `client_id`, exactly as before.

**One token per resource.** A request whose scopes span two resources is refused with
`invalid_scope`. A single bearer string valid at two services means leaking one leaks both;
ask for a ClassScout token and a management token separately.

You may also send RFC 8707 `resource` alongside `scope`. It is accepted only as an
assertion — it must equal the resource your scopes already name, or the request is refused
with `invalid_target`. It cannot aim a token at a service you hold no scope for.

### Revoking an agent

Set the client's `status` to `suspended`. The token endpoint refuses to issue new tokens
for a non-`active` client. Already-issued access tokens remain valid until they expire,
so treat one hour as the worst-case revocation lag.

## Social Login

Current hosted social providers:

- Google
- Facebook

Endpoints:

- `GET /api/auth/google/login`
- `GET /api/auth/google/callback`
- `GET /api/auth/facebook/login`
- `GET /api/auth/facebook/callback`

The hosted social-login flow:

- uses a canonical encoded callback state contract
- binds callback state to the signed CSRF cookie
- clears the callback CSRF cookie after successful validation
- preserves `oauth_request` when social login is part of an OAuth flow

## Security Best Practices

- use Authorization Code flow, not implicit-style patterns
- use PKCE for public clients
- always send `state`
- send `nonce` for OIDC login flows
- exchange tokens server-side when a client secret is involved
- treat `id_token` and `access_token` as separate contracts
- never assume app access from authentication alone; check permission state

## Common Integration Mistakes

- requesting non-canonical scopes or custom role scopes
- assuming `/api/public/login` returns bearer tokens
- using stale permission statuses such as `active` instead of `approved`
- treating `none` as a canonical granted status instead of “no granted role / no record”
- attempting to manage another client’s permissions with a bearer token

## Related Docs

- [docs/README.md](README.md)
- [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/MULTI_APP_PERMISSIONS.md](MULTI_APP_PERMISSIONS.md)
