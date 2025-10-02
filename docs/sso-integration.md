# SSO Integration Guide

This guide explains how to integrate your website with our SSO (Single Sign-On) service.

## Quick Start

1. Include the SSO client script in your HTML:
```html
<script src="https://your-sso-domain.com/sso-client.js"></script>
```

2. Initialize the SSO client:
```javascript
const sso = new SSOClient('https://your-sso-domain.com');
```

3. Check session status:
```javascript
async function checkSession() {
  const result = await sso.validateSession();
  if (result.isValid) {
    // User is authenticated
    console.log('Logged in as:', result.user.username);
    // Handle authenticated state
  } else {
    // User is not authenticated
    sso.redirectToLogin();
  }
}
```

## API Reference

### Endpoints

#### GET /api/sso/validate
Validates the current SSO session.

**Response Format:**
```json
{
  "isValid": true,
  "user": {
    "id": "user_id",
    "username": "username",
    "permissions": {
      "isAdmin": false,
      "canViewUsers": false,
      "canManageUsers": false
    }
  },
  "session": {
    "expiresAt": "2025-07-21T14:43:47Z"
  }
}
```

### Error Responses

- 401 Unauthorized: Session is invalid or expired
- 403 Forbidden: Origin not allowed
- 500 Internal Server Error: Server-side error

## Security Considerations

1. Only domains listed in the allowedOrigins configuration can access the SSO service.
2. All requests must include credentials (cookies).
3. HTTPS is required in production.
4. Session tokens are HTTP-only cookies.

## Example Implementation

```javascript
// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
  const sso = new SSOClient('https://your-sso-domain.com');
  
  try {
    const session = await sso.validateSession();
    if (session.isValid) {
      // Update UI for authenticated user
      document.getElementById('username').textContent = session.user.username;
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('userSection').style.display = 'block';
    } else {
      // Show login button or redirect to SSO login
      sso.redirectToLogin();
    }
  } catch (error) {
    console.error('Failed to validate session:', error);
    // Handle error state
  }
});
```

## Adding Your Domain

To add your domain to the allowed origins:

1. Contact the SSO administrator
2. Provide your domain name
3. Wait for confirmation
4. Test the integration in a development environment first

## Best Practices

1. Always check session validity on sensitive operations
2. Implement proper error handling
3. Add session refresh logic if needed
4. Keep the SSO client script updated
5. Monitor SSO-related errors in your application

## Support

For integration support or to report issues, please contact the SSO team.
