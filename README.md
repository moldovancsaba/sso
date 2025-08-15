# Universal SSO Service

A configurable Single Sign-On (SSO) service that can be integrated into any project. This service provides authentication, session management, and user validation across multiple applications.

## Features

- 🔐 **Universal Authentication**: Works with any project/domain
- ⚙️ **Fully Configurable**: Environment-based configuration
- 🔧 **Multiple Auth Methods**: Session-based and JWT support
- 🛡️ **Security Built-in**: CORS, rate limiting, CSRF protection
- 📦 **Easy Integration**: Simple client library included
- 🔄 **Session Management**: Automatic session validation and monitoring
- 📊 **MongoDB Backend**: Scalable user and session storage

## Quick Start

### 1. Installation

```bash
git clone <repository-url>
cd universal-sso
npm install
```

### 2. Configuration

```bash
npm run setup
# Edit .env file with your settings
# IMPORTANT: Never commit .env files to version control
```

Required environment variables:
```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_database_name
SESSION_SECRET=your_secure_session_secret
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 3. Start the Service

```bash
npm run dev
```

## Integration Guide

### Client-Side Integration

Install the SSO client in your project:

```bash
npm install path/to/universal-sso/src
```

#### Basic Usage

```javascript
import { SSOClient } from 'universal-sso';

// Initialize the client
const sso = new SSOClient({
  serverUrl: 'http://localhost:3000'
});

// Check if user is authenticated
try {
  const session = await sso.validateSession();
  if (session.isValid) {
    console.log('User authenticated:', session.user);
  } else {
    sso.redirectToLogin();
  }
} catch (error) {
  console.error('Authentication error:', error);
}
```

#### Advanced Configuration

```javascript
const sso = new SSOClient({
  serverUrl: 'https://your-sso-service.com',
  paths: {
    login: '/custom/login',
    logout: '/custom/logout',
    validate: '/custom/validate'
  },
  headers: {
    'X-API-Key': 'your-api-key'
  }
});

// Enable session monitoring
const stopMonitoring = sso.enableSessionMonitoring({
  interval: 30000, // Check every 30 seconds
  onInvalidSession: () => {
    alert('Session expired. Please log in again.');
    sso.redirectToLogin();
  },
  onError: (error) => {
    console.error('Session monitoring error:', error);
  }
});
```

## API Endpoints

### Authentication Endpoints

#### `GET /api/auth/validate`
Validates the current session.

**Response:**
```json
{
  "isValid": true,
  "user": {
    "id": "user123",
    "username": "john@example.com",
    "permissions": ["read", "write"]
  },
  "session": {
    "expiresAt": "2024-01-01T12:00:00Z"
  }
}
```

#### `POST /api/auth/logout`
Destroys the current session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### User Management

#### `GET /api/users`
Returns all users (admin endpoint).

#### `GET /api/users/[userId]`
Returns specific user information.

## Configuration Reference

### Database Configuration

```env
MONGODB_URI=your_mongodb_connection_string      # MongoDB connection string (local or Atlas)
MONGODB_DB=sso_database                         # Database name
USERS_COLLECTION=users                          # Users collection name
SESSIONS_COLLECTION=sessions                    # Sessions collection name
```

### CORS Configuration

```env
ALLOWED_ORIGINS=http://localhost:3000,https://app.com  # Comma-separated origins
CORS_CREDENTIALS=true                                   # Allow credentials
```

### Session Configuration

```env
SESSION_SECRET=your-secret-key                  # Session encryption key
SESSION_MAX_AGE=86400000                        # Session lifetime (24h)
SESSION_SAME_SITE=lax                          # SameSite attribute
```

### Security Settings

```env
BCRYPT_ROUNDS=12                               # Password hashing rounds
RATE_LIMIT_MAX=100                             # Max requests per window
RATE_LIMIT_WINDOW=900000                       # Rate limit window (15min)
CSRF_PROTECTION=true                           # Enable CSRF protection
```

## Development

### Project Structure

```
sso/
├── src/                    # Client library source
│   ├── client.ts           # Main SSO client class
│   ├── types.ts            # TypeScript definitions
│   ├── constants.ts        # Constants and defaults
│   └── index.ts            # Main export file
├── pages/                  # Next.js API routes
│   └── api/
│       ├── auth/           # Authentication endpoints
│       └── users/          # User management endpoints
├── lib/
│   └── config.js           # Configuration management
├── .env.example            # Environment template
└── package.json
```

### Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run linting
npm run type-check       # Type checking
npm run validate-config  # Validate configuration
npm run test-connection  # Test MongoDB connection
```

## Deployment

### Environment Setup

1. Copy `.env.example` to `.env` (for local development only)
2. Configure all required environment variables
3. Ensure MongoDB is accessible
4. Set `NODE_ENV=production`

### Vercel Deployment

Set environment variables in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add all required variables from `.env.example`
- Never commit actual `.env` files to your repository

### Production Considerations

- Use strong `SESSION_SECRET` and `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- Configure `TRUSTED_PROXIES` if behind a proxy
- Set appropriate `ALLOWED_ORIGINS` for your domains
- Enable HTTPS in production
- Store all secrets in environment variables, never in code
- Use Vercel environment variables for deployment
- Consider using Redis for session storage at scale

## Security

- All passwords are hashed with bcrypt
- Sessions are secured with HTTP-only cookies
- CORS is configurable per environment
- Rate limiting prevents abuse
- CSRF protection is enabled by default
- Supports trusted proxy configurations

## Troubleshooting

### Common Issues

**"Configuration error"**
- Check that all required environment variables are set
- Run `npm run validate-config` to verify configuration

**"CORS error"**
- Ensure your domain is in `ALLOWED_ORIGINS`
- Check that `CORS_CREDENTIALS` is set correctly

**"Database connection failed"**
- Verify `MONGODB_URI` is correct and accessible
- Check MongoDB server is running

**"Session validation failed"**
- Check session hasn't expired
- Verify cookies are being sent with requests
- Ensure `SESSION_SECRET` hasn't changed

## License

MIT License - see LICENSE file for details.