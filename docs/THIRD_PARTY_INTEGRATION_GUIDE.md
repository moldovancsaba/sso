# Third-Party Integration Guide — SSO Service

**Version**: 5.29.0  
**Last Updated**: 2026-05-21T00:00:00.000Z  
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

- [`/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md`](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/README.md)

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

- [docs/README.md](/Users/moldovancsaba/Projects/sso/docs/README.md)
- [docs/ARCHITECTURE.md](/Users/moldovancsaba/Projects/sso/docs/ARCHITECTURE.md)
- [docs/MULTI_APP_PERMISSIONS.md](/Users/moldovancsaba/Projects/sso/docs/MULTI_APP_PERMISSIONS.md)
