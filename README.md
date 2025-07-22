# Session SPA
# DoneIsBetter SSO Service

A secure, easy-to-integrate Single Sign-On (SSO) service for web applications.

## Features

- 🔐 Secure authentication and session management
- 🌐 Cross-origin support for multiple applications
- 👥 User permission management
- ⚡️ Real-time session validation
- 🔄 Automatic session monitoring
- 📱 Responsive login interface

## Quick Start

### 1. Install the Client Library

```bash
npm install @doneisbetter/sso-client
# or
yarn add @doneisbetter/sso-client
```

### 2. Initialize the SSO Client

```javascript
import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient('https://your-sso-server.com');
```

### 3. Implement Authentication

```javascript
// Check authentication status
async function checkAuth() {
  const session = await sso.validateSession();
  
  if (session.isValid) {
    // User is authenticated
    const { username, permissions } = session.user;
    console.log(`Authenticated as: ${username}`);
    console.log('Permissions:', permissions);
  } else {
    // Redirect to login
    sso.redirectToLogin();
  }
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

### 4. Enable Session Monitoring

```javascript
// Monitor session status
const cleanup = sso.enableSessionMonitoring({
  interval: 60000, // Check every minute
  onInvalidSession: () => {
    alert('Session expired. Please log in again.');
    sso.redirectToLogin();
  },
  onError: (error) => {
    console.error('Session check failed:', error);
  }
});

// Clean up when component unmounts
cleanup();
```

## Documentation

- [Integration Guide](./docs/integration.md)
- [API Reference](./docs/api-reference.md)
- [Security Best Practices](./docs/security.md)
- [Examples](./docs/examples.md)

## Configuration

### Client Options

```javascript
const sso = new SSOClient('https://your-sso-server.com', {
  loginPath: '/auth/login',            // Custom login path
  logoutPath: '/api/auth/logout',      // Custom logout endpoint
  validatePath: '/api/auth/validate',  // Custom validation endpoint
  headers: {                          // Additional headers
    'X-Custom-Header': 'value'
  }
});
```

### Environment Variables

Configure your SSO server with these environment variables:

```env
SSO_SERVER_URL=https://your-sso-server.com
SESSION_SECRET=your-session-secret
MONGODB_URI=your-mongodb-uri
ALLOWED_ORIGINS=https://app1.com,https://app2.com
```

## Security Features

- HTTP-only session cookies
- CSRF protection
- Rate limiting
- Secure password hashing
- Session expiration
- Permission-based access control

## Error Handling

The SSO client provides detailed error information:

```javascript
try {
  const session = await sso.validateSession();
  // Handle successful validation
} catch (error) {
  if (error.code === 'SESSION_EXPIRED') {
    // Handle expired session
  } else if (error.code === 'NETWORK_ERROR') {
    // Handle network issues
  }
}
```

## Best Practices

1. Always validate sessions on sensitive operations
2. Implement proper error handling
3. Use HTTPS in production
4. Regularly monitor session status
5. Follow security recommendations

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- 📧 Email: support@doneisbetter.com
- 📖 Documentation: [docs.doneisbetter.com](https://docs.doneisbetter.com)
- 💬 Discord: [Join our community](https://discord.gg/doneisbetter)

## License

MIT License - see [LICENSE](LICENSE) for details
A Single Page Application for managing user sessions and permissions.

## Version
[![Version Badge](https://img.shields.io/badge/version-3.3.0-blue)](RELEASE_NOTES.md)

## Dependencies
- Next.js ^15.4.2
- React ^19.1.0
- MongoDB ^6.3.0
- Node.js >= 14.0.0
- TypeScript >= 4.5.0

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features
- Username-based authentication
- Admin user management
  - Rename users
  - Toggle admin rights
  - Delete users
- Activity logging
- Permission system

## Documentation
- [User Manual](USERMANUAL.md) - How to use the application
- [Architecture](ARCHITECTURE.md) - System design and components
- [Release Notes](RELEASE_NOTES.md) - Version history and changes
- [Roadmap](ROADMAP.md) - Future development plans
- [Task List](TASKLIST.md) - Current and upcoming tasks
- [Learnings](LEARNINGS.md) - Development insights
- [API Documentation](#) - Reference for developers
