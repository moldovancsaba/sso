# Release Notes

## [v5.1.0] — 2025-07-06T20:25:16Z

### Added
- Alternative login methods:
  - Anonymous login with chosen identifier (existing method)
  - Email-based login for future benefits
- User interface improvements:
  - Radio button selection for login method
  - Dynamic form fields based on selected method
  - Email validation and format checking
  - Helpful tooltips for email login benefits

### Technical
- Enhanced user schema to support optional email field
- Updated database operations for email handling
- Improved input validation and error messages
- Maintained existing GTC and Privacy Policy requirements

## [v5.0.0] — 2025-07-06T11:20:40Z

### Major Changes
- Complete overhaul of documentation system
- New OAuth2 integration documentation
- Updated API reference with OAuth2 endpoints
- Enhanced technical specification

### Documentation
- Restructured all core documentation files:
  - README.md - Updated features and quick start
  - ARCHITECTURE.md - Complete system overview
  - LEARNINGS.md - Enhanced with recent experiences
  - ROADMAP.md - Updated milestones and plans
  - TASKLIST.md - Current and upcoming tasks

### Public Documentation
- Enhanced overview.md with current features
- Updated technical-spec.md with actual architecture
- Expanded api-reference.md with OAuth2 endpoints
- Improved integration guides

### Technical
- Version bump to 5.0.0
- Removed deprecated documentation
- Updated all timestamps to ISO 8601
- Synchronized version numbers

### Enhanced
- OAuth2 implementation details
- NextAuth.js integration guide
- Environment configuration
- Security best practices
- Deployment guidelines

## [v4.1.2] — 2025-07-06T11:09:57Z

### Documentation
- Comprehensive update of all documentation files
- README.md restructured for clarity and current features
- ARCHITECTURE.md updated with complete system overview
- LEARNINGS.md expanded with recent experiences
- ROADMAP.md aligned with current progress and future plans

### Technical
- Removed deprecated and duplicate documentation
- Unified documentation structure and format
- Updated all timestamps to ISO 8601 standard
- Synchronized version numbers across all files

### Enhanced
- Documentation for OAuth2 implementation
- Environment configuration guidelines
- Security best practices
- Integration guides

## [v4.1.1] — 2025-07-06T09:04:56Z

### Added
- Comprehensive integration documentation for OAuth2 and NextAuth.js
- Detailed API reference in integration guide
- Security considerations and best practices

### Fixed
- Package.json repository URL format
- TypeScript type definitions for OAuth client management

## [v4.1.0] — 2025-07-06T08:59:19Z

### Added
- OAuth2 support for NextAuth.js integration
  - Authorization Code grant flow
  - OAuth client management interface
  - Secure client credentials handling
- New /admin/oauth-clients page for managing OAuth applications
- OAuth2-compatible endpoints:
  - /api/oauth/authorize for authorization
  - /api/oauth/token for token exchange
  - /api/oauth/clients for client management

### Enhanced
- Navigation menu to include OAuth Clients section
- Database schema to support OAuth clients
- Documentation to cover OAuth integration

## [v4.0.1] — 2025-07-06T08:48:03Z

### Fixed
- Aligned both local and production environments to use the same MongoDB database
- Resolved "Invalid API key" error by ensuring consistent database configuration
- Updated MongoDB URI to use a cloud-based and shared connection string

### Note
- A reminder to maintain consistency across environments: always ensure configurations are uniformly applied to avoid similar issues in the future.

## [v4.0.0] — 2025-07-06T08:29:46Z

### Added
- Comprehensive environment configuration system
  - Development (.env) and production (.env.production) environment separation
  - Secure handling of sensitive variables
  - Public configuration version control

### Changed
- Enhanced authentication flow with proper API key handling
- Improved environment variable management
- Updated documentation with environment setup guidelines

### Security
- Protected sensitive credentials from version control
- Implemented proper environment variable separation
- Enhanced API key security in frontend requests

### Technical
- Added production-ready environment configuration
- Improved local development setup
- Enhanced deployment documentation

## [v3.1.0] — 2025-07-06T00:02:29Z

### Added
- Default tenant document for API validation
- JWT_SECRET configuration

### Changed
- Updated admin page to fetch users with API key

### Fixed
- Ensured token and user creation flow works correctly

### Deployed
- Successfully deployed the updated version

## [v3.0.5] — 2025-07-05T23:03:22Z

### Fixed
- Middleware composition and execution chain
- API route handler syntax
- Build and deployment issues

### Changed
- Improved middleware type safety
- Enhanced middleware error handling

### Deployed
- Successfully deployed to https://sso.doneisbetter.com

## [v3.0.4] — 2025-07-05T23:03:22Z

### Added
- Centralized Database service with singleton pattern
- Improved type safety across API layer

### Changed
- Consolidated all database operations into single service
- Removed duplicate MongoDB connections
- Improved API key handling and validation
- Enhanced error handling across all endpoints

### Removed
- Deprecated MongoDB connection files
- Legacy API key handling code

## [v3.0.3] — 2025-07-05T22:58:35Z

### Added
- Script to set up test tenant with API key
- Automated tenant configuration setup

### Changed
- Added test tenant documentation

## [v3.0.2] — 2025-07-05T22:52:10Z

### Added
- Comprehensive API documentation with examples
- Detailed integration guide with best practices
- Rate limiting and security documentation

### Changed
- Updated all documentation to reflect current implementation
- Improved error handling documentation

### Deployed
- Successfully deployed to https://sso.doneisbetter.com

## [v3.0.1] — 2025-07-05T22:46:15Z

### Added
- Implemented comprehensive rate limiting system with sliding window and burst control
- Added detailed request logging with response times and error tracking
- Created middleware composition utility for clean API route handling

### Changed
- Updated all API routes to use new middleware stack
- Improved error handling and response type safety

### Deployed
- Successfully deployed to https://sso.doneisbetter.com

## [v3.0.0] — 2025-07-05T22:45:23.456Z

### Deployment
- Successfully deployed to production at 2025-07-05T22:45:23.456Z
- Production URL: https://sso.doneisbetter.com
- All features verified and functional

### Added
- Comprehensive documentation system with three sections:
  - Integration Guide
  - General Terms and Conditions (GTC)
  - Privacy Policy (PP)
- Legal compliance with GTC and Privacy Policy acceptance
- Mobile-first, responsive design system

### Changed
- Simplified navigation to only show Docs and Admin
- Rebranded from "Simple SSO" to just "SSO"
- Improved UI with minimal, responsive components
- Configured Next.js for optimal performance

### Technical
- Implemented mobile-first CSS architecture
- Removed App Router dependencies for cleaner build
- Enhanced build configuration for better performance
- Unified TypeScript implementation across components

## [v2.0.0] — 2025-07-05T21:23:25Z

### Added
- New admin dashboard with user management
- Comprehensive documentation system
- MongoDB integration for user persistence
- API key authentication system

### Changed
- Complete navigation system overhaul
- Enhanced user interface with Tailwind CSS
- Improved error handling and validation

### Technical
- Migrated to Next.js 15.3.5
- Implemented TypeScript throughout
- Added proper MongoDB connection handling
- Enhanced JWT token security

## [v1.0.0] — 2025-07-05T20:12:47.000Z

### Changed
- Major version upgrade from 0.2.0 to 1.0.0
- Marks the first stable release of ThanPerfect

## [v0.2.0] — 2025-07-05T17:11:25Z

### Changed
- Removed duplicate files for cleaner codebase structure
- Standardized TypeScript implementation across the project

## [v0.1.0] — 2024-07-05T16:18:56.789Z

### Added
- Initial release of ThanPerfect
- Implemented JWT-based authentication system
  - Short-lived tokens for enhanced security
  - Memory-only token storage
  - No persistent token tracking
- Core security features
  - Rate limiting on authentication endpoints
  - Secure token transmission
  - Automatic token expiration
- Privacy-focused architecture
  - Minimal data collection
  - Ephemeral session handling
  - Automatic data cleanup
