# @doneisbetter/sso-client

A TypeScript/JavaScript client for DoneIsBetter SSO integration.

## Installation

```bash
npm install @doneisbetter/sso-client
# or
yarn add @doneisbetter/sso-client
# or
pnpm add @doneisbetter/sso-client
```

## Quick Start

```typescript
import { SSOClient } from '@doneisbetter/sso-client';

// Initialize the client
const sso = new SSOClient('https://sso.doneisbetter.com');

// Check session status
const session = await sso.validateSession();
if (session.isValid) {
  console.log('Logged in as:', session.user.username);
} else {
  sso.redirectToLogin();
}
```

## Session Monitoring

```typescript
// Enable automatic session monitoring
const cleanup = sso.enableSessionMonitoring({
  interval: 60000, // Check every minute
  onInvalidSession: () => {
    console.log('Session expired');
    sso.redirectToLogin();
  },
  onError: (error) => {
    console.error('Session check failed:', error);
  }
});

// Clean up when component unmounts
cleanup();
```

## Configuration Options

```typescript
const sso = new SSOClient('https://sso.doneisbetter.com', {
  // Custom endpoints
  loginPath: '/auth/login',
  logoutPath: '/auth/logout',
  validatePath: '/auth/validate',
  
  // Custom headers
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

## API Reference

### `new SSOClient(ssoServerUrl, options?)`

Creates a new SSO client instance.

#### Options

- `loginPath`: Custom login page path (default: '/')
- `logoutPath`: Custom logout endpoint (default: '/api/users/logout')
- `validatePath`: Custom validation endpoint (default: '/api/sso/validate')
- `headers`: Additional headers for requests

### `validateSession()`

Validates the current session.

```typescript
const result = await sso.validateSession();
if (result.isValid) {
  const { user, session } = result;
  console.log('User:', user);
  console.log('Session expires:', session.expiresAt);
}
```

### `signOut()`

Signs out the current user.

```typescript
await sso.signOut();
```

### `redirectToLogin(redirectUrl?)`

Redirects to the login page.

```typescript
// Redirect with current URL as return path
sso.redirectToLogin();

// Redirect with custom return URL
sso.redirectToLogin('https://app.example.com/dashboard');
```

### `enableSessionMonitoring(options?)`

Enables automatic session monitoring.

```typescript
const cleanup = sso.enableSessionMonitoring({
  interval: 60000,
  onInvalidSession: () => {
    // Handle invalid session
  },
  onError: (error) => {
    // Handle errors
  }
});
```

## Framework Examples

### React

```typescript
import { useEffect, useState } from 'react';
import { SSOClient } from '@doneisbetter/sso-client';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sso = new SSOClient('https://sso.doneisbetter.com');
    
    async function checkAuth() {
      try {
        const result = await sso.validateSession();
        if (result.isValid) {
          setUser(result.user);
        } else {
          sso.redirectToLogin();
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    }

    const cleanup = sso.enableSessionMonitoring({
      onInvalidSession: () => {
        setUser(null);
        sso.redirectToLogin();
      }
    });

    checkAuth();
    return cleanup;
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Welcome, {user.username}!</div>;
}
```

### Vue.js

```typescript
import { defineComponent } from 'vue';
import { SSOClient } from '@doneisbetter/sso-client';

export default defineComponent({
  data() {
    return {
      user: null,
      loading: true
    }
  },
  async created() {
    const sso = new SSOClient('https://sso.doneisbetter.com');
    
    try {
      const result = await sso.validateSession();
      if (result.isValid) {
        this.user = result.user;
      } else {
        sso.redirectToLogin();
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      this.loading = false;
    }

    const cleanup = sso.enableSessionMonitoring({
      onInvalidSession: () => {
        this.user = null;
        sso.redirectToLogin();
      }
    });

    this.$once('hook:beforeDestroy', cleanup);
  }
});
```

## License

MIT License
