# Release Notes [![Version Badge](https://img.shields.io/badge/version-4.3.0-blue)](RELEASE_NOTES.md)

## [v4.3.0] — 2025-09-14T08:25:57.000Z

### Added
- UUIDs as the primary identifier for admin users (with backfill for legacy users)
- Sparse-unique index on users.id for fast UUID lookups
- Organizations (UUID) admin endpoints:
  - GET/POST /api/admin/orgs
  - GET/PATCH/DELETE /api/admin/orgs/[id]
- Organization Users (UUID) admin endpoints:
  - GET/POST /api/admin/orgs/[orgId]/users
  - GET/PATCH/DELETE /api/admin/orgs/[orgId]/users/[id]
- tools/backfill-user-uuids.mjs utility

### Changed
- Admin session tokens now carry userId as UUID
- Admin users CRUD responses prefer UUID id (fallback to legacy _id only if needed)
- RBAC clarified: super-admin full access; admin read-only for org/org-user routes unless permissioned

---

## [v4.2.0] — 2025-09-11T14:28:29.000Z

### Added
- Admin login UI at /admin (email + 32‑hex token) with session display and logout
- Homepage updated to link to Admin Login and show current admin session state

### Changed
- Removed legacy username sign-in UI from homepage

---

## [v4.1.0] — 2025-09-11T13:57:38.000Z

### Changed
- Version bump to align with commit protocol; no functional changes since v4.0.1

## [v4.0.1] — 2025-09-11T13:35:02.000Z

### Added
- DB-backed admin authentication with HttpOnly cookie session (admin-session)
- New admin endpoints:
  - POST /api/admin/login (email + token)
  - DELETE /api/admin/login (logout)
  - GET/POST /api/admin/users (list/create)
  - GET/PATCH/DELETE /api/admin/users/[id] (manage)
- Resource password service with admin-session bypass and usage tracking:
  - POST /api/resource-passwords (generate/retrieve + shareable link)
  - PUT /api/resource-passwords (validate password)
- CORS helper and deployment guidance for sso.doneisbetter.com

### Changed
- /api/sso/validate now validates admin cookie sessions
- Secured /api/users to admin-only

### Removed
- Deprecated username-based endpoints: /api/auth/login, /api/auth/logout, /api/users/register, /api/users/logout, /api/users/[userId]
- Duplicate/insecure routes removed or deprecated with 410 Gone

---

## [v3.4.0] — 2025-07-23T10:00:00.000Z

### Removed
- Removed nested client package (@doneisbetter/sso-client)
- Removed client-related documentation and examples
- Simplified project structure

### Modified
- Updated documentation to focus on server-side implementation
- Streamlined API documentation
- Simplified configuration options
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
