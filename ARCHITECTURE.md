# Architecture Documentation

## Current Status [![Version Badge](https://img.shields.io/badge/version-3.3.0-blue)](RELEASE_NOTES.md)

### Technology Stack
- Next.js ^15.4.2
- React ^19.1.0
- MongoDB ^6.3.0
- Node.js >= 14.0.0
- TypeScript >= 4.5.0

### Client Dependencies
- axios ^1.6.0
- jsonwebtoken ^9.0.0

### System Components
#### Frontend
- Next.js React Framework
- Client-side state management with React hooks
- Responsive design with CSS
- Admin dashboard interface

#### Backend
- Next.js API Routes
- MongoDB for data persistence
- Session-based authentication
- Activity logging system

### Database Schema
#### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  permissions: {
    isAdmin: Boolean,
    canViewUsers: Boolean,
    canManageUsers: Boolean
  },
  activityLog: [{
    action: String,
    timestamp: Date,
    details: Mixed
  }],
  createdAt: Date,
  lastLogin: Date
}
```

### API Routes
#### Authentication
- POST /api/users/register
  - Creates new user or returns existing
  - Sets up session
  - Returns user data

#### User Management
- GET /api/users
  - Lists all users (admin only)
  - Returns user data without sensitive info

- PUT /api/users/[userId]
  - Updates user properties
  - Handles username changes
  - Manages admin rights

- DELETE /api/users/[userId]
  - Removes user from system
  - Logs deletion activity

### Security Features
- Admin-only route protection
- Activity logging for all operations
- Session-based authentication
- Prevention of self-permission modification

### State Management
- React hooks for local state
- Session storage for auth state
- Real-time updates for user management
