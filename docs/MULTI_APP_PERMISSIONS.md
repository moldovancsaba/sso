# Multi-App Permission System

Version: 5.29.0  
Last updated: 2026-05-20T00:00:00.000Z

## Purpose

`appPermissions` is the canonical authorization layer for deciding whether a public user can access a specific OAuth client application.

Authentication proves who the user is.  
`appPermissions` decides whether that user may access a given app, and with what role.

## Canonical Permission Contract

### Roles
- `none`
- `user`
- `admin`

### Statuses
- `pending`
- `approved`
- `revoked`

### Access rule

`hasAccess` is true only when:

- status is `approved`
- role is not `none`

## Legacy Normalization

The runtime compatibility layer normalizes older values:

- `active` -> `approved`
- `guest` -> `none`
- `owner` -> `admin`
- `superadmin` -> `admin`
- `super-admin` -> `admin`

New writes should not use the legacy values.

## Data Shape

```js
{
  userId: "public-user-uuid",
  clientId: "oauth-client-uuid",
  appName: "launchmass",
  hasAccess: true,
  status: "approved",
  role: "admin",
  requestedAt: "2026-05-10T00:00:00.000Z",
  grantedAt: "2026-05-10T00:00:00.000Z",
  grantedBy: "admin-uuid",
  revokedAt: null,
  revokedBy: null,
  lastAccessedAt: "2026-05-10T00:00:00.000Z",
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z"
}
```

## Primary Flows

### First access request
1. User starts OAuth flow for an app.
2. The app or SSO checks `appPermissions`.
3. If no record exists, SSO creates a `pending` record with role `none`.
4. Admin later approves or revokes access.

### Approved access
1. User authenticates at SSO.
2. `/api/oauth/authorize` checks the permission record.
3. If status is `approved` and role is not `none`, the flow continues.

### Revocation
1. Admin or authorized app integration updates the record.
2. The permission becomes `revoked` and role `none`.
3. Future authorization attempts are denied until access is granted again.

## API Contract

### Read one permission
`GET /api/users/{userId}/apps/{clientId}/permissions`

Authorized callers:
- admin session
- bearer token for the same `userId` and same `clientId`
- bearer token with `manage_permissions` for the same `clientId`

Example approved response:

```json
{
  "userId": "uuid",
  "clientId": "uuid",
  "appName": "launchmass",
  "hasAccess": true,
  "status": "approved",
  "role": "admin",
  "requestedAt": "ISO-8601",
  "grantedAt": "ISO-8601",
  "grantedBy": "uuid",
  "lastAccessedAt": "ISO-8601"
}
```

Example no-record response:

```json
{
  "error": "No permission record found",
  "hasAccess": false,
  "status": "none",
  "userId": "uuid",
  "clientId": "uuid"
}
```

### Create a pending access request
`POST /api/users/{userId}/apps/{clientId}/request-access`

Requirements:
- validated bearer token
- token subject must match `userId`
- token client must match `clientId`

Behavior:
- returns existing permission if one already exists
- otherwise creates a `pending` permission with role `none`

### Upsert from an app integration
`PUT /api/users/{userId}/apps/{clientId}/permissions`

Requirements:
- client bearer token with `manage_permissions`
- token client must match `clientId`

Request body:

```json
{
  "role": "user",
  "status": "approved"
}
```

### Admin mutation path
`PUT /api/admin/users/{userId}/apps/{clientId}/permissions`  
`DELETE /api/admin/users/{userId}/apps/{clientId}/permissions`

Requirements:
- admin session

Canonical admin DTO example:

```json
{
  "userId": "uuid",
  "clientId": "uuid",
  "appName": "launchmass",
  "hasAccess": true,
  "status": "approved",
  "role": "admin",
  "grantedAt": "2026-05-21T10:05:00.000Z",
  "grantedBy": "admin-uuid",
  "createdAt": "2026-05-21T10:00:00.000Z",
  "updatedAt": "2026-05-21T10:05:00.000Z"
}
```

## Notes for Integrators

- Treat `approved` as the canonical granted status
- Do not build new client logic around `active`
- Do not assume any roles beyond `none`, `user`, `admin`
- If you cache permission state in downstream apps, resync it on login
- Do not treat the OIDC ID token as the source of app-permission status; use permission APIs for that contract
