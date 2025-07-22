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

### Authentication API

The authentication API provides endpoints for user authentication and session management:

```bash
# Authenticate user
POST /api/auth/login

# Validate session
GET /api/auth/validate

# Logout user
POST /api/auth/logout
```

## Documentation

- [Integration Guide](./docs/integration.md)
- [API Reference](./docs/api-reference.md)
- [Security Best Practices](./docs/security.md)
- [Examples](./docs/examples.md)

## Configuration

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

The API provides detailed error responses:

```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "Your session has expired",
    "details": {
      "expiredAt": "2025-07-23T10:00:00.000Z"
    }
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
[![Version Badge](https://img.shields.io/badge/version-3.4.0-blue)](RELEASE_NOTES.md)

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
