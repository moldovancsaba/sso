# API Reference

Complete reference for the DoneIsBetter SSO API and client library.

## Client Library

### SSOClient

The main class for interacting with the SSO service.

#### Constructor

```typescript
constructor(ssoServerUrl: string, options?: SSOClientOptions)
```

Parameters:
- `ssoServerUrl`: Base URL of the SSO server
- `options`: Configuration options
  ```typescript
  interface SSOClientOptions {
    loginPath?: string;      // Custom login path
    logoutPath?: string;     // Custom logout endpoint
    validatePath?: string;   // Custom validation endpoint
    headers?: Record<string, string>; // Additional headers
    debug?: boolean;         // Enable debug logging
  }
  ```

#### Methods

##### validateSession

```typescript
async validateSession(): Promise<SessionResponse>
```

Validates the current session.

Returns:
```typescript
interface SessionResponse {
  isValid: boolean;
  message?: string;
  user?: {
    id: string;
    username: string;
    permissions: {
      isAdmin: boolean;
      canViewUsers: boolean;
      canManageUsers: boolean;
      [key: string]: boolean;
    };
  };
  session?: {
    expiresAt: string;
  };
}
```

##### signOut

```typescript
async signOut(): Promise<boolean>
```

Signs out the current user.

Returns:
- `true` if logout was successful
- Throws an error if logout fails

##### redirectToLogin

```typescript
redirectToLogin(redirectUrl?: string): void
```

Redirects to the SSO login page.

Parameters:
- `redirectUrl`: Optional URL to redirect to after successful login

##### enableSessionMonitoring

```typescript
enableSessionMonitoring(options?: {
  interval?: number;
  onInvalidSession?: () => void;
  onError?: (error: Error) => void;
}): () => void
```

Enables automatic session monitoring.

Parameters:
- `options.interval`: Check interval in milliseconds (default: 60000)
- `options.onInvalidSession`: Callback when session becomes invalid
- `options.onError`: Callback for session check errors

Returns:
- Cleanup function to stop monitoring

## REST API Endpoints

### Admin — Organizations (UUID)

GET /api/admin/orgs
- Lists organizations
- Response example:
```json
{
  "success": true,
  "organizations": [
    { "id": "d9e0b6d9-7b8a-4d1f-9a3a-6e3e9f5a1c2b", "name": "Acme Inc", "slug": "acme-inc", "domains": ["acme.com"], "status": "active", "plan": "pro", "createdAt": "2025-09-14T08:00:00.000Z", "updatedAt": "2025-09-14T08:00:00.000Z" }
  ]
}
```

POST /api/admin/orgs
- Create organization (super-admin required)
- Request:
```json
{ "name": "Acme Inc", "slug": "acme-inc", "domains": ["acme.com","app.acme.com"], "status": "active", "plan": "pro" }
```
- Response:
```json
{ "success": true, "organization": { "id": "<uuid>", "name": "Acme Inc", "slug": "acme-inc", "domains": ["acme.com","app.acme.com"], "status": "active", "plan": "pro", "createdAt": "2025-09-14T08:00:00.000Z", "updatedAt": "2025-09-14T08:00:00.000Z" } }
```

GET /api/admin/orgs/{id}
- Get organization by UUID

PATCH /api/admin/orgs/{id}
- Update organization fields

DELETE /api/admin/orgs/{id}
- Delete organization (super-admin required)

### Admin — Organization Users (UUID)

GET /api/admin/orgs/{orgId}/users
- Lists org users for an org (UUID-based orgId)

POST /api/admin/orgs/{orgId}/users
- Create org user (super-admin or admin with manage-org-users)
- Request:
```json
{ "email": "user@acme.com", "name": "User Name", "role": "member", "status": "active" }
```
- Response:
```json
{ "success": true, "user": { "id": "<uuid>", "email": "user@acme.com", "name": "User Name", "role": "member", "status": "active", "createdAt": "2025-09-14T08:00:00.000Z", "updatedAt": "2025-09-14T08:00:00.000Z" }, "password": "<32-hex>" }
```

GET /api/admin/orgs/{orgId}/users/{id}
- Get org user by UUID

PATCH /api/admin/orgs/{orgId}/users/{id}
- Update org user fields; if password is provided as empty string, a new 32-hex token is generated and returned as password

DELETE /api/admin/orgs/{orgId}/users/{id}
- Delete org user (super-admin or admin with manage-org-users)

### Session Validation

```http
GET /api/sso/validate
```

Validates a session token.

Headers:
- `Cookie`: Session cookie (required)
- `Origin`: Client origin (required)

Response:
```json
{
  "isValid": true,
  "user": {
    "id": "user_123",
    "username": "john_doe",
    "permissions": {
      "isAdmin": false,
      "canViewUsers": true
    }
  },
  "session": {
    "expiresAt": "2025-07-21T14:43:47.000Z"
  }
}
```

Status Codes:
- `200`: Valid session
- `401`: Invalid or expired session
- `403`: Invalid origin
- `500`: Server error

### User Registration

```http
POST /api/users/register
Content-Type: application/json

{
  "username": "john_doe"
}
```

Registers a new user or logs in an existing user.

Response:
```json
{
  "user": {
    "id": "user_123",
    "username": "john_doe",
    "permissions": {
      "isAdmin": false
    }
  }
}
```

Status Codes:
- `200`: Success
- `400`: Invalid request
- `500`: Server error

### User Logout

```http
POST /api/users/logout
```

Logs out the current user.

Response:
```json
{
  "success": true
}
```

Status Codes:
- `200`: Success
- `401`: Not authenticated
- `500`: Server error

### User Management (Admin Only)

#### List Users

```http
GET /api/users
```

Lists all users (requires admin permissions).

Response:
```json
{
  "users": [
    {
      "id": "user_123",
      "username": "john_doe",
      "permissions": {
        "isAdmin": false
      }
    }
  ]
}
```

#### Update User

```http
PUT /api/users/:userId
Content-Type: application/json

{
  "username": "new_username",
  "permissions": {
    "isAdmin": true
  }
}
```

Updates a user's details (requires admin permissions).

Response:
```json
{
  "user": {
    "id": "user_123",
    "username": "new_username",
    "permissions": {
      "isAdmin": true
    }
  }
}
```

#### Delete User

```http
DELETE /api/users/:userId
```

Deletes a user (requires admin permissions).

Response:
```json
{
  "success": true
}
```

## Error Handling

The API uses standard HTTP status codes and returns errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common Error Codes:
- `SESSION_EXPIRED`: Session has expired
- `INVALID_SESSION`: Session is invalid
- `NETWORK_ERROR`: Network connectivity issues
- `PERMISSION_DENIED`: Insufficient permissions
- `INVALID_REQUEST`: Invalid request parameters
- `SERVER_ERROR`: Internal server error

## Rate Limiting

The API implements rate limiting:
- 100 requests per minute per IP for authentication endpoints
- 1000 requests per minute per IP for session validation
- 50 requests per minute per IP for user management

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1627398061
```

## CORS Configuration

The SSO server allows requests from configured origins:
- Credentials must be included
- Only specified HTTP methods are allowed
- Only required headers are exposed

Example CORS headers:
```http
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://your-app.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Expose-Headers: X-RateLimit-*
```

## Security Considerations

1. Always use HTTPS in production
2. Keep session cookies HTTP-only
3. Implement CSRF protection
4. Use secure password storage
5. Monitor for suspicious activity
6. Regularly rotate session secrets
7. Set appropriate cookie security flags
8. Implement request origin validation
