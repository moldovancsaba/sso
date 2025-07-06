# SSO API Reference

Last Updated: 2025-07-06T11:17:21Z

## Direct Authentication

### Create Authentication Token
```http
POST /api/auth/create
Content-Type: application/json
X-API-Key: your_tenant_api_key

{
  "identifier": "string"  // User's unique identifier
}
```

#### Response
```json
{
  "token": "string"  // JWT token valid for configured duration
}
```

### Validate API Key
```http
POST /api/auth/validate
Content-Type: application/json
Authorization: Bearer your_api_key
```

#### Response
```json
{
  "tenant": {
    "id": "string",
    "name": "string"
  }
}
```

## OAuth2 Endpoints

### Authorization Request
```http
GET /api/oauth/authorize
Content-Type: application/json

Query Parameters:
- client_id: string
- redirect_uri: string
- response_type: string (code)
- scope: string
- state: string
```

#### Response
Redirects to the specified `redirect_uri` with:
```
code: string (authorization code)
state: string (same as request)
```

### Token Exchange
```http
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

Body Parameters:
- grant_type: string (authorization_code)
- code: string
- redirect_uri: string
```

#### Response
```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "string"
}
```

### Token Validation
```http
POST /api/oauth/introspect
Content-Type: application/json
Authorization: Bearer client_credentials

{
  "token": "string"  // Access token to validate
}
```

#### Response
```json
{
  "active": true,
  "scope": "string",
  "client_id": "string",
  "exp": 1625097600
}
```

## OAuth Client Management

### Create OAuth Client
```http
POST /api/clients
Content-Type: application/json
X-API-Key: your_tenant_api_key

{
  "name": "string",
  "redirect_uris": ["string"],
  "allowed_scopes": ["string"]
}
```

#### Response
```json
{
  "client_id": "string",
  "client_secret": "string",
  "name": "string",
  "redirect_uris": ["string"],
  "allowed_scopes": ["string"],
  "created_at": "2025-07-06T11:17:21Z"
}
```

### List OAuth Clients
```http
GET /api/clients
X-API-Key: your_tenant_api_key
```

#### Response
```json
[
  {
    "client_id": "string",
    "name": "string",
    "redirect_uris": ["string"],
    "allowed_scopes": ["string"],
    "created_at": "2025-07-06T11:17:21Z"
  }
]
```

## User Management

### List Users
```http
GET /api/users
X-API-Key: your_tenant_api_key
```

#### Response
```json
[
  {
    "id": "string",
    "identifier": "string",
    "created_at": "2025-07-06T11:17:21Z",
    "last_login_at": "2025-07-06T11:17:21Z"
  }
]
```

## Rate Limiting

Every API endpoint is protected by rate limiting with the following default limits:
- 100 requests per minute per tenant/IP combination
- Burst allowance of 10 requests
- Rate limits are calculated using a sliding window algorithm

### Rate Limit Headers

All API responses include the following headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1689459600
```

When rate limits are exceeded, the API returns:
```http
Status: 429 Too Many Requests
Retry-After: 30

{
  "error": "Rate limit exceeded",
  "retry_after": 30
}
```

## Request Logging

All API requests are logged with the following information:
- Timestamp (ISO 8601)
- HTTP method
- URL path
- Client IP
- User agent
- Tenant ID (if available)
- OAuth client ID (if applicable)
- Response status code
- Response time (ms)
- Error details (if any)

## Response Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Bad Request - Invalid parameters |
| 401  | Unauthorized - Missing or invalid credentials |
| 403  | Forbidden - Insufficient permissions |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error |

## Error Format

All error responses follow this format:
```json
{
  "error": "Error description",
  "error_description": "Detailed error message",
  "error_uri": "https://docs.example.com/errors/specific-error"
}
```

## Configuration

### Tenant Configuration
- API key(s)
- IP whitelist
- Rate limit settings
- Allowed redirect domains
- Token expiry time

### OAuth Configuration
- Client credentials
- Allowed redirect URIs
- Authorized scopes
- Token lifetimes

Contact support to modify these settings.
