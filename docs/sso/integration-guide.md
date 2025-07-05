# SSO Integration Guide

This guide explains how to integrate our SSO solution into your application.

## Prerequisites

1. Tenant Account
   - Register at https://sso.doneisbetter.com/admin
   - Create a new tenant
   - Generate an API key

2. Technical Requirements
   - HTTPS enabled endpoint for your application
   - Ability to securely store API keys and tokens
   - Support for standard HTTP headers

## Integration Steps

### 1. Tenant Setup

1. Log in to the Admin Dashboard
2. Navigate to Tenant Settings
3. Configure:
   - Allowed redirect domains
   - IP whitelist (optional)
   - Rate limit settings
   - Token expiry time

### 2. API Key Generation

1. In the Admin Dashboard, go to API Keys
2. Generate a new API key
3. Store the key securely - it won't be shown again
4. Optional: Add a key description and expiry date

### 3. Implementation

#### Authentication Flow

1. Create a token for a user:
```javascript
async function createAuthToken(identifier) {
  const response = await fetch('https://sso.doneisbetter.com/api/auth/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_tenant_api_key'
    },
    body: JSON.stringify({ identifier })
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const { token } = await response.json();
  return token;
}
```

2. Handle rate limits:
```javascript
async function makeAuthRequest(identifier) {
  try {
    const response = await fetch('https://sso.doneisbetter.com/api/auth/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_tenant_api_key'
      },
      body: JSON.stringify({ identifier })
    });

    // Check rate limit headers
    const rateLimit = {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset')
    };

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }

    if (!response.ok) {
      throw new Error('Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Auth request failed:', error);
    throw error;
  }
}
```

### 4. Error Handling

Implement proper error handling for all possible response codes:

```javascript
function handleAuthError(error) {
  switch (error.status) {
    case 400:
      // Invalid parameters
      break;
    case 401:
      // Invalid API key
      break;
    case 403:
      // IP not whitelisted
      break;
    case 429:
      // Rate limit exceeded
      const retryAfter = error.headers.get('Retry-After');
      scheduleRetry(retryAfter);
      break;
    default:
      // Other errors
      break;
  }
}
```

## Best Practices

1. API Key Security
   - Never expose API keys in client-side code
   - Rotate keys periodically
   - Use environment variables for key storage

2. Rate Limiting
   - Implement exponential backoff for retries
   - Monitor rate limit headers
   - Cache tokens when possible

3. Error Handling
   - Implement proper error handling
   - Log failed requests
   - Set up monitoring for rate limit issues

## Testing

1. Rate Limit Testing
   - Test burst scenarios
   - Verify retry behavior
   - Check header handling

2. Error Scenarios
   - Invalid API key
   - Rate limit exceeded
   - Network failures
   - Invalid parameters

## Support

- Documentation: https://sso.doneisbetter.com/docs
- Email: support@doneisbetter.com
- Status page: https://status.doneisbetter.com

For complete API details, see [API Reference](api-reference.md)
