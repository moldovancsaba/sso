# Integration Guide

This guide walks you through integrating DoneIsBetter SSO into your application.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Basic Integration](#basic-integration)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:
- Node.js 14.x or later
- A modern web browser
- HTTPS enabled in production
- Your SSO server URL

## Installation

1. Install the SSO client package:
```bash
npm install @doneisbetter/sso-client
# or
yarn add @doneisbetter/sso-client
```

2. Import and initialize the client:
```javascript
import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient('https://your-sso-server.com');
```

## Basic Integration

### 1. Check Authentication Status

Add this to your app's entry point or protected routes:

```javascript
async function checkAuth() {
  try {
    const session = await sso.validateSession();
    
    if (session.isValid) {
      // User is authenticated
      const { username, permissions } = session.user;
      return { authenticated: true, user: session.user };
    } else {
      // No valid session
      return { authenticated: false };
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false, error };
  }
}
```

### 2. Protect Routes/Resources

React example:
```javascript
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      const { authenticated } = await checkAuth();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    }
    verify();
  }, []);

  if (isLoading) return <LoadingSpinner />;
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}
```

Express.js middleware example:
```javascript
async function requireAuth(req, res, next) {
  try {
    const session = await sso.validateSession();
    if (session.isValid) {
      req.user = session.user;
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Auth check failed' });
  }
}
```

### 3. Handle Login/Logout

```javascript
// Redirect to SSO login
function handleLogin() {
  sso.redirectToLogin();
}

// Handle logout
async function handleLogout() {
  try {
    await sso.signOut();
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

## Advanced Features

### 1. Session Monitoring

```javascript
class App extends React.Component {
  componentDidMount() {
    this.cleanup = sso.enableSessionMonitoring({
      interval: 60000, // Check every minute
      onInvalidSession: () => {
        alert('Session expired. Please log in again.');
        sso.redirectToLogin();
      },
      onError: (error) => {
        console.error('Session check failed:', error);
      }
    });
  }

  componentWillUnmount() {
    this.cleanup();
  }
}
```

### 2. Permission-Based Access Control

```javascript
function AdminPanel({ children }) {
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    async function checkPermissions() {
      const session = await sso.validateSession();
      if (session.isValid && session.user.permissions.isAdmin) {
        setCanAccess(true);
      }
    }
    checkPermissions();
  }, []);

  return canAccess ? children : <AccessDenied />;
}
```

### 3. Custom Headers

```javascript
const sso = new SSOClient('https://your-sso-server.com', {
  headers: {
    'X-Custom-Client': 'MyApp/1.0',
    'X-Tenant-ID': 'tenant123'
  }
});
```

### 4. Error Handling

```javascript
async function robustAuthCheck() {
  try {
    const session = await sso.validateSession();
    return session;
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      // Retry with exponential backoff
      await retry(checkAuth);
    } else if (error.code === 'SESSION_EXPIRED') {
      // Clear local state
      clearUserData();
      sso.redirectToLogin();
    } else {
      // Handle other errors
      console.error('Unexpected auth error:', error);
      throw error;
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your domain is allowed in the SSO server configuration
   - Check that credentials are included in requests
   - Verify HTTPS usage in production

2. **Session Validation Fails**
   - Check network connectivity
   - Verify SSO server URL configuration
   - Ensure cookies are enabled
   - Check for clock sync issues

3. **Infinite Login Loops**
   - Verify redirect URL handling
   - Check session cookie configuration
   - Debug authentication flow

### Debug Mode

Enable debug logging:
```javascript
const sso = new SSOClient('https://your-sso-server.com', {
  debug: true // Enables detailed logging
});
```

### Support

If you need help:
1. Check our [FAQ](./faq.md)
2. Review [API Documentation](./api-reference.md)
3. Contact support@doneisbetter.com
4. Join our [Discord community](https://discord.gg/doneisbetter)
