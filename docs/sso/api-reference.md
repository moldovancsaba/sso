# SSO API Reference

## Authentication

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
  "token": "string"  // JWT token valid for 10 minutes
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
    "createdAt": "string",
    "lastLoginAt": "string"
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
  "retryAfter": 30
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
- Response status code
- Response time (ms)
- Error details (if any)

## Response Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Bad Request - Invalid parameters |
| 401  | Unauthorized - Missing or invalid API key |
| 403  | Forbidden - IP not whitelisted or insufficient permissions |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error |

## Error Format

All error responses follow this format:
```json
{
  "error": "Error description"
}
```

## Tenant Configuration

Your tenant configuration includes:
- API key(s)
- IP whitelist
- Rate limit settings
- Allowed redirect domains
- Token expiry time

Contact support to modify these settings.
