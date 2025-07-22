# Release Notes [![Version Badge](https://img.shields.io/badge/version-3.3.0-blue)](RELEASE_NOTES.md)

## [v3.3.0] — 2025-07-22T08:03:17Z

### Updated Dependencies
- Upgraded Next.js to ^15.4.2
- Upgraded React to ^19.1.0
- Upgraded MongoDB to ^6.3.0
- Added TypeScript >= 4.5.0 requirement
- Updated Node.js requirement to >= 14.0.0
- Updated all client dependencies:
  - axios ^1.6.0
  - jsonwebtoken ^9.0.0

### Technical Updates
- Enhanced build system stability
- Improved development environment setup
- Updated package overrides for better dependency management
- Optimized session handling and validation

## [v3.0.0]

### Major Changes
- Upgraded all dependencies to their latest stable versions
- Fixed deprecated package warnings
- Removed legacy dependencies
- Improved build system configuration

### Technical Updates
- Added lru-cache for better memory management
- Updated glob to version 10
- Updated rimraf to version 5
- Updated eslint to version 9
- Added package overrides for transitive dependencies
- Optimized Next.js configuration for Pages Router
- Added .npmrc for better dependency management

### Removed
- Deprecated inflight package
- Legacy glob versions
- Outdated eslint configuration

### Technical Details
- Configured proper versioning for all dependencies
- Enhanced build system stability
- Improved development environment setup
- Better memory management with lru-cache
- Stricter npm configuration

## [v2.0.0] — 2025-07-21T13:12:00.000Z

### Added
- User management features:
  - Rename users functionality
  - Toggle admin rights
  - Delete users capability
- Enhanced admin dashboard
- Real-time user list updates
- Improved error handling
- User manual documentation

### Modified
- Updated frontend interface
- Enhanced permission system
- Improved activity logging
- Updated all documentation

### Technical Updates
- React hooks for state management
- MongoDB integration
- Next.js API routes
- Session management

### Major Changes
- Migrated to Next.js framework
- Implemented serverless API routes
- Added MongoDB integration
- Created user management system
- Added session management
- Implemented activity logging
- Added admin dashboard
- Created permission system

### Removed
- Express server implementation
- Static file serving through Express
- Server-side session management
- Express routes

### Technical Details
- Updated to Next.js 15.4.2
- Updated to React 19.1.0
- Added MongoDB integration
- Implemented user authentication
- Added admin user management
- Created API routes for user operations

## [v1.0.0] — 2024-04-13T12:00:00.000Z

### Added
- Initial project setup
- Basic Express.js server configuration
- Static file serving
- SPA routing support
- Basic HTML structure
- CSS styling foundation
- Client-side JavaScript initialization

### Technical Details
- Express.js server implementation
- SPA structure with HTML5 history API support
- Static file middleware configuration
- Basic responsive styling
