# External Website Integration Guide

This guide shows how to integrate the Universal SSO service into any external website or web application.

## Quick Start

### 1. Add the SSO Client to Your Website

**Option A: Using NPM (Recommended)**
```bash
npm install @moldovancsaba/universal-sso
```

**Option B: Direct Script Include**
```html
<script src="https://your-sso-domain.com/sso-client.js"></script>
```

### 2. Initialize the SSO Client

```javascript
import { SSOClient } from '@moldovancsaba/universal-sso';

const sso = new SSOClient({
    serverUrl: 'https://your-sso-server.com'
});
```

### 3. Check Authentication Status

```javascript
async function checkUserAuth() {
    try {
        const session = await sso.validateSession();
        if (session.isValid) {
            // User is authenticated
            console.log('Welcome', session.user.username);
            return session.user;
        } else {
            // User not authenticated
            showLoginButton();
            return null;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}
```

## Complete Integration Example

### HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App with SSO</title>
</head>
<body>
    <div id="app">
        <!-- Login button (shown when not authenticated) -->
        <button id="loginBtn" onclick="login()" style="display: none;">
            Login with SSO
        </button>
        
        <!-- User info (shown when authenticated) -->
        <div id="userInfo" style="display: none;">
            <h3>Welcome, <span id="username"></span>!</h3>
            <button onclick="logout()">Logout</button>
        </div>
        
        <!-- Protected content -->
        <div id="protectedContent" style="display: none;">
            <h2>Protected Content</h2>
            <p>This content is only visible to authenticated users.</p>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

### JavaScript Implementation

```javascript
// app.js
import { SSOClient } from '@moldovancsaba/universal-sso';

// Initialize SSO client
const sso = new SSOClient({
    serverUrl: 'https://your-sso-server.com',
    // Optional custom paths
    paths: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        validate: '/api/auth/validate'
    }
});

// Check authentication on page load
document.addEventListener('DOMContentLoaded', checkAuth);

async function checkAuth() {
    try {
        const session = await sso.validateSession();
        
        if (session.isValid) {
            showUserInterface(session.user);
        } else {
            showLoginInterface();
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        showLoginInterface();
    }
}

function showUserInterface(user) {
    // Hide login button
    document.getElementById('loginBtn').style.display = 'none';
    
    // Show user info
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('username').textContent = user.username;
    
    // Show protected content
    document.getElementById('protectedContent').style.display = 'block';
}

function showLoginInterface() {
    // Show login button
    document.getElementById('loginBtn').style.display = 'block';
    
    // Hide user info and protected content
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('protectedContent').style.display = 'none';
}

// Login function
async function login() {
    // Option 1: Redirect to SSO login page
    sso.redirectToLogin(window.location.href);
    
    // Option 2: Login with credentials (if you have a login form)
    // const username = document.getElementById('username').value;
    // const password = document.getElementById('password').value;
    // try {
    //     const result = await sso.login(username, password);
    //     showUserInterface(result.user);
    // } catch (error) {
    //     alert('Login failed: ' + error.message);
    // }
}

// Logout function
async function logout() {
    try {
        await sso.logout();
        showLoginInterface();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Optional: Monitor session status
const stopMonitoring = sso.enableSessionMonitoring({
    interval: 60000, // Check every minute
    onInvalidSession: () => {
        alert('Your session has expired. Please log in again.');
        showLoginInterface();
    },
    onError: (error) => {
        console.error('Session monitoring error:', error);
    }
});
```

## Configuration Options

### SSO Client Configuration

```javascript
const sso = new SSOClient({
    // Required: Your SSO server URL
    serverUrl: 'https://your-sso-server.com',
    
    // Optional: Custom endpoint paths
    paths: {
        login: '/api/auth/login',      // Default
        logout: '/api/auth/logout',    // Default
        validate: '/api/auth/validate' // Default
    },
    
    // Optional: Custom headers for all requests
    headers: {
        'X-API-Key': 'your-api-key',
        'X-Client-Version': '1.0.0'
    }
});
```

### Session Monitoring Configuration

```javascript
const cleanup = sso.enableSessionMonitoring({
    interval: 30000, // Check every 30 seconds (default: 60000)
    
    onInvalidSession: () => {
        // Called when session becomes invalid
        alert('Session expired');
        window.location.href = '/login';
    },
    
    onError: (error) => {
        // Called when monitoring encounters an error
        console.error('Session monitoring failed:', error);
    }
});

// Stop monitoring when no longer needed
// cleanup();
```

## API Reference

### Methods

#### `validateSession()`
Checks if the current session is valid.

```javascript
const session = await sso.validateSession();
// Returns: { isValid: boolean, user?: object, session?: object }
```

#### `login(username, password)`
Authenticates a user with credentials.

```javascript
const result = await sso.login('john@example.com', 'password');
// Returns: { success: boolean, user: object, session: object }
```

#### `logout()`
Logs out the current user.

```javascript
await sso.logout();
// Returns: { success: boolean, message: string }
```

#### `redirectToLogin(returnUrl?)`
Redirects to the SSO login page.

```javascript
sso.redirectToLogin(window.location.href);
```

#### `enableSessionMonitoring(config)`
Starts monitoring session status.

```javascript
const stopMonitoring = sso.enableSessionMonitoring({
    interval: 30000,
    onInvalidSession: () => { /* handle */ },
    onError: (error) => { /* handle */ }
});
```

## CORS Configuration

Ensure your SSO server allows your domain in the `ALLOWED_ORIGINS` environment variable:

```env
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com,http://localhost:3000
```

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production for both your app and SSO server
2. **Validate Sessions**: Always validate sessions on page load and before accessing protected resources
3. **Handle Errors**: Implement proper error handling for network failures and authentication errors
4. **Monitor Sessions**: Use session monitoring to handle expired sessions gracefully
5. **Secure Cookies**: The SSO service uses secure, HTTP-only cookies for session management

## Error Handling

```javascript
try {
    const session = await sso.validateSession();
    // Handle success
} catch (error) {
    switch (error.code) {
        case 'SESSION_EXPIRED':
            // Redirect to login
            sso.redirectToLogin();
            break;
        case 'NETWORK_ERROR':
            // Show offline message
            showOfflineMessage();
            break;
        case 'SERVER_ERROR':
            // Show server error message
            showErrorMessage('Service temporarily unavailable');
            break;
        default:
            console.error('Unexpected error:', error);
    }
}
```

## Framework-Specific Examples

### React Integration

```jsx
import React, { useState, useEffect } from 'react';
import { SSOClient } from '@moldovancsaba/universal-sso';

const sso = new SSOClient({
    serverUrl: process.env.REACT_APP_SSO_URL
});

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const session = await sso.validateSession();
            if (session.isValid) {
                setUser(session.user);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin() {
        sso.redirectToLogin(window.location.href);
    }

    async function handleLogout() {
        try {
            await sso.logout();
            setUser(null);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            {user ? (
                <div>
                    <h1>Welcome, {user.username}!</h1>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            ) : (
                <div>
                    <h1>Please log in</h1>
                    <button onClick={handleLogin}>Login with SSO</button>
                </div>
            )}
        </div>
    );
}

export default App;
```

### Vue.js Integration

```vue
<template>
  <div>
    <div v-if="user">
      <h1>Welcome, {{ user.username }}!</h1>
      <button @click="logout">Logout</button>
    </div>
    <div v-else>
      <h1>Please log in</h1>
      <button @click="login">Login with SSO</button>
    </div>
  </div>
</template>

<script>
import { SSOClient } from '@moldovancsaba/universal-sso';

const sso = new SSOClient({
  serverUrl: process.env.VUE_APP_SSO_URL
});

export default {
  data() {
    return {
      user: null
    };
  },
  
  async mounted() {
    await this.checkAuth();
  },
  
  methods: {
    async checkAuth() {
      try {
        const session = await sso.validateSession();
        if (session.isValid) {
          this.user = session.user;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    },
    
    login() {
      sso.redirectToLogin(window.location.href);
    },
    
    async logout() {
      try {
        await sso.logout();
        this.user = null;
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  }
};
</script>
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your domain is in the SSO server's `ALLOWED_ORIGINS`
2. **Session Not Persisting**: Check that cookies are enabled and your app is served over HTTPS (in production)
3. **Login Redirect Loops**: Verify the `returnUrl` parameter is correctly handled
4. **API Timeouts**: Check network connectivity and SSO server status

### Debug Mode

Enable debug logging by opening your browser's developer console. The SSO client logs all API requests and responses.

## Support

- **Repository**: https://github.com/moldovancsaba/sso
- **Issues**: https://github.com/moldovancsaba/sso/issues
- **Documentation**: See the main README.md file