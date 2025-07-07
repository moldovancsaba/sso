# SSO Architecture

## System Overview

SSO (Single Sign-On) is a secure authentication system designed with privacy-first principles, featuring OAuth2 support, minimal data collection, and ephemeral token handling.

## Core Components

### Authentication Layer
- **Token Types**:
  - Short-lived JWTs for direct authentication
  - OAuth2 tokens for NextAuth.js integration
- **TTL**: Configurable token lifetimes
- **Tech**: UUID-based identifiers and OAuth2 grants

### Security Features
- Rate limiting middleware
- Request logging and monitoring
- Ephemeral token management
- Automated token expiration
- OAuth2 security protocols
- Environment-based configuration

### Backend Infrastructure
- **API Layer**: 
  - Next.js API routes
  - Middleware composition
  - OAuth2 endpoints
  - Rate-limited routes
- **Data Layer**: 
  - MongoDB for persistence
  - Shared database across environments
  - OAuth client storage
  - Activity logging

### Frontend Interface
- **Framework**: Next.js 15.3.5 with TypeScript
- **Styling**: TailwindCSS for responsive design
- **State**: React hooks for state management
- **Admin UI**: OAuth client management
- **Documentation**: Integrated docs system

## Security Architecture

### Authentication Workflow
1. Direct Authentication:
   - User submits identifier
   - System issues JWT
   - Token validates for configured duration
   - No server-side token storage

2. OAuth2 Flow:
   - Client registration
   - Authorization request
   - Token issuance
   - Resource access

### Privacy Protocol
- Minimal data collection
- Secure token transmission
- No persistent user tracking
- Configurable logging levels

## Integration Architecture

### External Systems
- MongoDB Atlas for data persistence
- Vercel for deployment
- npm registry for package distribution

### Key Endpoints

#### Authentication
- `/api/auth` - Direct authentication
- `/api/oauth/authorize` - OAuth2 authorization
- `/api/oauth/token` - OAuth2 token issuance
- `/api/validate` - Token validation

#### Administration
- `/api/clients` - OAuth client management
- `/api/users` - User management
- `/api/logs` - Activity monitoring

## Current Implementation

### Version: 7.0.0
- Standardized TypeScript module system
- Enhanced build pipeline reliability
- Full OAuth2 support
- NextAuth.js integration
- Rate limiting
- Request logging
- Environment configuration
- Comprehensive documentation
- Fully dynamic URL handling
  - Auto-detection and synchronization in development
  - Automatic port handling across OAuth flows
  - Centralized and environment-aware configuration management

### Security Measures
- JWT-based authentication
- OAuth2 protocol implementation
- Rate limiting on sensitive endpoints
- Secure environment variable handling
- Cross-environment database consistency

### Deployment
- Production: https://sso.doneisbetter.com
- Package: @doneisbetter/sso on npm
- Continuous deployment via Vercel

## Future Goals

### Security Enhancements
- Enhanced audit logging
- Additional OAuth2 grant types
- Advanced rate limiting strategies

### Scalability
- Multi-tenant improvements
- Horizontal scaling capabilities
- Enhanced monitoring
