# Multi-App User Permission System

**Version**: 2.0.0  
**Created**: 2025-01-13T23:15:00.000Z  
**Updated**: 2026-01-20T14:00:00.000Z  
**Status**: Production (Updated for 3-Role System)

## Overview

This document defines the architecture for managing user permissions across multiple applications (Amanoba, launchmass, messmass, cardmass, blockmass) with centralized SSO authentication and per-app authorization.

**Updated for 3-Role System (2026-01-20):**
- Simplified from 5 roles to 3 roles: `none`, `user`, `admin`
- Removed `superadmin` and `org-admin` roles
- `admin` role now encompasses all administrative permissions

---

## User Flow

### New User Registration & Access

```
1. User visits: launchmass.doneisbetter.com
2. Clicks "Login" → Redirects to SSO OAuth flow
3. SSO: Login or Register
   - If new: Register at sso.doneisbetter.com/register
   - If existing: Login at sso.doneisbetter.com/login
4. OAuth Consent: "Launchmass wants to access your profile"
5. Redirect to: launchmass.doneisbetter.com/api/oauth/callback
6. Check App Permission:
   ✅ HAS PERMISSION → Enter app with role
   ❌ NO PERMISSION → Show "Access Pending" page
```

### Permission Check Flow

```javascript
// In launchmass OAuth callback
1. Receive authorization code from SSO
2. Exchange code for tokens (access_token, id_token)
3. Decode id_token → get user info (id, email, name)
4. Query SSO API: GET /api/users/{userId}/apps/{clientId}/permissions
5. Response:
   {
     "hasAccess": true,
     "role": "admin",
     "status": "active",
     "grantedAt": "2025-01-10T12:00:00.000Z",
     "grantedBy": "admin-user-uuid"
   }
   OR
   {
     "hasAccess": false,
     "status": "pending",
     "requestedAt": "2025-01-13T12:00:00.000Z"
   }
6. If hasAccess: Create session, sync user, redirect to app
   If !hasAccess: Show pending/denied page, log access attempt
```

---

## Database Schema

### SSO Database Collections

#### 1. `publicUsers` (existing, minimal changes)

```javascript
{
  _id: ObjectId,
  id: "uuid-v4",                    // User's unique SSO ID
  email: "user@example.com",
  name: "John Doe",
  passwordHash: "bcrypt-hash",
  role: "user",                     // SSO role (not app-specific)
  status: "active" | "disabled",
  role: "user" | "admin",           // User's global SSO role (simplified 3-role system)
  emailVerified: true,
  emailVerifiedAt: "ISO-8601",
  createdAt: "ISO-8601",
  updatedAt: "ISO-8601",
  lastLoginAt: "ISO-8601",
  loginCount: 123
}
```

**Indexes**:
- `{ email: 1 }` unique
- `{ id: 1 }` unique
- `{ role: 1 }` for admin queries

---

#### 2. `appPermissions` (NEW)

Stores per-user, per-app access rights.

```javascript
{
  _id: ObjectId,
  userId: "user-uuid",              // References publicUsers.id
  clientId: "oauth-client-uuid",    // References oauthClients.client_id
  appName: "launchmass",            // Denormalized for quick display
  
  // Permission details
  hasAccess: true,
  status: "active" | "pending" | "revoked",
  role: "none" | "user" | "admin",
  
  // Audit trail
  requestedAt: "ISO-8601",          // First login attempt
  grantedAt: "ISO-8601" | null,     // When access was granted
  grantedBy: "admin-uuid" | null,   // Who granted access
  revokedAt: "ISO-8601" | null,
  revokedBy: "admin-uuid" | null,
  lastAccessedAt: "ISO-8601",       // Last successful login to app
  
  // Timestamps
  createdAt: "ISO-8601",
  updatedAt: "ISO-8601"
}
```

**Indexes**:
- `{ userId: 1, clientId: 1 }` unique compound
- `{ clientId: 1, status: 1 }` for app admin views
- `{ userId: 1 }` for user profile views
- `{ status: 1, requestedAt: -1 }` for pending queue

**Status Values**:
- `pending` - User requested access, waiting approval
- `active` - User has active access
- `revoked` - Access was granted then revoked

**Role Values** (Updated 2026-01-20):
- `none` - No access (used with status: pending/revoked)
- `user` - Basic app access (can read data, create own content)
- `admin` - Full administrative access (can manage all users, app settings, permissions)

**Note:** The `superadmin` and `org-admin` roles have been consolidated into `admin`.

---

#### 3. `appAccessLogs` (NEW)

Audit log of all access attempts and permission changes.

```javascript
{
  _id: ObjectId,
  userId: "user-uuid",
  clientId: "oauth-client-uuid",
  appName: "launchmass",
  
  eventType: "access_attempt" | "access_granted" | "access_denied" | "role_changed" | "access_revoked",
  
  // For access attempts
  accessGranted: true | false,
  currentRole: "user" | "admin" | null,
  
  // For permission changes
  previousRole: "user" | null,
  newRole: "admin" | null,
  changedBy: "admin-uuid" | null,
  
  // Context
  ip: "1.2.3.4",
  userAgent: "Mozilla/5.0...",
  message: "User requested access",
  
  timestamp: "ISO-8601"
}
```

**Indexes**:
- `{ userId: 1, timestamp: -1 }`
- `{ clientId: 1, timestamp: -1 }`
- `{ eventType: 1, timestamp: -1 }`

---

### Launchmass Database Collections

#### 1. `users` (existing, updated)

Local cache of users who have accessed launchmass.

```javascript
{
  _id: ObjectId,
  ssoUserId: "uuid",                // References SSO publicUsers.id
  email: "user@example.com",
  name: "John Doe",
  ssoRole: "user",
  
  // App-specific permissions (synced from SSO on each login)
  appRole: "none" | "user" | "admin",
  appStatus: "pending" | "active" | "revoked",
  hasAccess: false,                 // Quick boolean check
  
  // Local permissions (future use)
  localPermissions: {},
  
  // Timestamps
  createdAt: "ISO-8601",            // First login attempt
  updatedAt: "ISO-8601",
  lastLoginAt: "ISO-8601",
  lastSyncedAt: "ISO-8601"          // Last permission sync from SSO
}
```

**IMPORTANT**: 
- `appRole` and `hasAccess` are **read-only** in launchmass
- Updated via SSO API calls only
- Cached locally for performance
- Synced on every login

**Indexes**:
- `{ ssoUserId: 1 }` unique
- `{ email: 1 }`
- `{ appStatus: 1, createdAt: -1 }` for admin pending queue

---

## API Endpoints

### SSO API (New Endpoints)

#### Get User's App Permissions

```
GET /api/users/{userId}/apps/{clientId}/permissions
Authorization: Bearer {access_token} OR admin session cookie

Response 200:
{
  "userId": "uuid",
  "clientId": "uuid",
  "appName": "launchmass",
  "hasAccess": true,
  "status": "active",
  "role": "admin",
  "requestedAt": "ISO-8601",
  "grantedAt": "ISO-8601",
  "grantedBy": "uuid",
  "lastAccessedAt": "ISO-8601"
}

Response 404:
{
  "error": "No permission record found",
  "hasAccess": false,
  "status": "none"
}
```

#### List All Users (SSO Admin)

```
GET /api/admin/users?page=1&limit=50&search=john&status=active
Authorization: Admin session cookie
Role Required: SSO Admin

Response 200:
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "status": "active",
      "isSsoSuperadmin": false,
      "emailVerified": true,
      "createdAt": "ISO-8601",
      "lastLoginAt": "ISO-8601",
      "appAccess": [
        {
          "clientId": "uuid",
          "appName": "launchmass",
          "role": "admin",
          "status": "active",
          "lastAccessedAt": "ISO-8601"
        },
        {
          "clientId": "uuid",
          "appName": "messmass",
          "role": "user",
          "status": "pending",
          "requestedAt": "ISO-8601"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

#### Grant/Update App Permission (SSO Admin Only)

```
PUT /api/admin/users/{userId}/apps/{clientId}/permissions
Authorization: Admin session cookie
Role Required: admin

Body:
{
  "hasAccess": true,
  "role": "admin",
  "status": "active"
}

Response 200:
{
  "success": true,
  "permission": {
    "userId": "uuid",
    "clientId": "uuid",
    "hasAccess": true,
    "role": "admin",
    "status": "active",
    "grantedAt": "ISO-8601",
    "grantedBy": "admin-uuid"
  }
}
```

#### Revoke App Access

```
DELETE /api/admin/users/{userId}/apps/{clientId}/permissions
Authorization: Admin session cookie

Response 200:
{
  "success": true,
  "permission": {
    "hasAccess": false,
    "status": "revoked",
    "revokedAt": "ISO-8601",
    "revokedBy": "admin-uuid"
  }
}
```

---

### Launchmass API (New Endpoints)

#### List App Users (Launchmass Admin)

```
GET /api/admin/users?status=pending&page=1
Authorization: OAuth session cookie
Role Required: admin

Response 200:
{
  "users": [
    {
      "ssoUserId": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "appRole": "none",
      "appStatus": "pending",
      "createdAt": "ISO-8601",
      "lastLoginAt": "ISO-8601"
    }
  ],
  "pagination": { ... }
}
```

#### Grant Access (App Admin)

```
POST /api/admin/users/{ssoUserId}/grant-access
Authorization: OAuth session cookie
Role Required: admin

Body:
{
  "role": "user" | "admin"
}

Response 200:
{
  "success": true,
  "message": "Access granted",
  "user": {
    "ssoUserId": "uuid",
    "appRole": "user",
    "appStatus": "active",
    "hasAccess": true
  }
}
```

**Implementation**:
- Calls SSO API: `PUT /api/admin/users/{userId}/apps/{clientId}/permissions`
- Updates local user cache
- Returns result

---

## User Interface Components

### SSO Admin - Users Dashboard

**Location**: `sso.doneisbetter.com/admin/users`

**Sections**:

1. **User List Table**
   - Columns: Name, Email, Status, SSO Superadmin, Created, Last Login
   - Filters: Status, SSO Superadmin, Search
   - Actions: View Details, Edit, Disable

2. **User Details Modal**
   ```
   User: john@example.com
   Status: Active
   SSO Role: user
   Email Verified: Yes
   Created: 2025-01-01
   Last Login: 2025-01-13
   
   App Access:
   ┌─────────────┬──────────┬────────────┬─────────────────────┐
   │ App         │ Role     │ Status     │ Last Accessed       │
   ├─────────────┼──────────┼────────────┼─────────────────────┤
   │ launchmass  │ admin    │ active     │ 2025-01-13 12:00    │
   │ sso         │ user     │ active     │ 2025-01-13 11:00    │
   │ messmass    │ none     │ pending    │ Requested: 01-12    │
   │ cardmass    │ -        │ -          │ Never accessed      │
   │ blockmass   │ -        │ -          │ Never accessed      │
   └─────────────┴──────────┴────────────┴─────────────────────┘
   
   [Edit App Permissions] [Change SSO Role] [Disable User]
   ```

3. **App Permission Editor**
   - Select app from dropdown
   - Toggle access: Pending / Active / Revoked
   - Select role: None / User / Admin
   - Save button → Calls SSO API
   
**Note:** Removed Superadmin option - `admin` role now has all permissions.

---

### Launchmass Admin - Users Management

**Location**: `launchmass.doneisbetter.com/admin/users`

**Sections**:

1. **Pending Approvals** (priority view)
   ```
   Pending Access Requests (3)
   ┌──────────────────────┬───────────────────────┬────────────────┐
   │ User                 │ Requested             │ Actions        │
   ├──────────────────────┼───────────────────────┼────────────────┤
   │ john@example.com     │ 2025-01-13 10:30      │ [Grant] [Deny] │
   │ jane@example.com     │ 2025-01-12 15:20      │ [Grant] [Deny] │
   │ bob@example.com      │ 2025-01-11 09:00      │ [Grant] [Deny] │
   └──────────────────────┴───────────────────────┴────────────────┘
   ```

2. **All Users Table**
   - Columns: Name, Email, Role, Status, Last Login
   - Filters: Role, Status
   - Actions: View, Change Role, Revoke

3. **Grant Access Modal**
   ```
   Grant Access to john@example.com
   
   Select Role:
   ( ) User - Basic access (read data, create own content)
   ( ) Admin - Full administrative access (manage users, app settings)
   
   [Cancel] [Grant Access]
   ```

---

### Launchmass - Access Pending Page

**Location**: `launchmass.doneisbetter.com/access-pending`

**Content**:
```
🔒 Access Pending

Your request to access Launchmass is being reviewed.

What happens next?
1. An administrator will review your request
2. You'll receive an email once access is granted
3. You can then log in and start using Launchmass

Requested on: January 13, 2025 at 12:30 PM

Need help? Contact support@doneisbetter.com

[Return to Home] [Logout]
```

---

## Implementation Order

### Phase 1: Database & API Foundation
1. ✅ Add `appPermissions` collection to SSO
2. ✅ Add `appAccessLogs` collection to SSO
3. ✅ Update `publicUsers` schema (add `isSsoSuperadmin`)
4. ✅ Update `users` schema in launchmass (add `appRole`, `appStatus`, `hasAccess`)
5. ✅ Create SSO API: GET/PUT/DELETE app permissions endpoints
6. ✅ Create migration script to set existing users

### Phase 2: OAuth Flow Integration
7. ✅ Update launchmass OAuth callback to check SSO permissions
8. ✅ Create "Access Pending" page in launchmass
9. ✅ Log access attempts in `appAccessLogs`
10. ✅ Update launchmass `upsertUserFromSso()` to sync permissions

### Phase 3: Launchmass Admin UI
11. ✅ Create `/admin/users` page
12. ✅ Pending approvals section
13. ✅ Grant/revoke access functionality
14. ✅ Role management (user/admin/superadmin)

### Phase 4: SSO Admin UI
15. ✅ Create `/admin/users` page (or enhance existing)
16. ✅ User list with app access overview
17. ✅ App permission editor modal
18. ✅ SSO superadmin toggle

### Phase 5: Documentation & Testing
19. ✅ Update ARCHITECTURE.md
20. ✅ Update RELEASE_NOTES.md
21. ✅ End-to-end testing
22. ✅ Security review

---

## Security Considerations

1. **Authorization Hierarchy** (Updated 2026-01-20):
   - SSO Admin > App Admin > User
   - SSO admin (global) can manage all users across all apps
   - App admin can manage users in their specific app
   - Simplified from previous 5-role hierarchy

2. **Permission Sync**:
   - Permissions cached in launchmass for performance
   - Synced on every login (cache invalidation)
   - TTL: Session lifetime (refresh on new session)

3. **Audit Trail**:
   - All permission changes logged in `appAccessLogs`
   - Include: who, what, when, why
   - Immutable log (no deletions)

4. **API Security**:
   - All admin endpoints require authentication
   - Role checks before permission changes
   - Rate limiting on sensitive endpoints

5. **OAuth Scope**:
   - ID token includes: `sub`, `email`, `name`, `role` (SSO role)
   - Does NOT include app-specific permissions (query separately)
   - Access token used to query permission API

---

## Future Enhancements

1. **Granular Permissions**:
   - Move beyond role-based to permission-based
   - E.g., `cards.read`, `cards.write`, `members.manage`

2. **Self-Service Access Request**:
   - User can request access with justification
   - Admin sees request with message

3. **Temporary Access**:
   - Grant access with expiration date
   - Auto-revoke after time limit

4. **Access Request Notifications**:
   - Email/webhook when user requests access
   - Email user when access granted/denied

5. **Multi-Organization Support**:
   - User can have different roles in different orgs
   - Already partially supported in launchmass

---

## Questions & Decisions

### Q1: Where to store app admin list?
**Decision**: In `appPermissions` with `role: 'admin'`

### Q2: Can app admin manage themselves?
**Decision**: No, only SSO admin or another app admin can modify their role

### Q3: What happens when user loses access while logged in?
**Decision**: 
- Access checked on login, not on every request (performance)
- To force logout: invalidate OAuth refresh token
- Or implement session polling (check every 5 min)

### Q4: Should we notify admins of new access requests?
**Decision**: Phase 2 - add email notifications, webhook option

---

## Migration Plan

### Existing Users (Updated 2026-01-20)
- All current launchmass users with admin access
- Migration script should:
  1. Find all users in launchmass.users with `isAdmin: true`
  2. Create `appPermissions` record for each
  3. Set: `hasAccess: true`, `role: 'admin'`, `status: 'active'`
  4. Set `grantedAt` to their `createdAt`, `grantedBy: null`
  5. Consolidate any existing `superadmin` roles to `admin`

### OAuth Clients
- Need to add `appName` field to `oauthClients` collection
- Used for display in admin UI
- Migration: manually set names (launchmass, messmass, etc.)

---

This architecture provides:
- ✅ Centralized authentication (SSO)
- ✅ Distributed authorization (per-app)
- ✅ Clear admin hierarchy
- ✅ Comprehensive audit trail
- ✅ Scalable to many apps
- ✅ User-friendly flow
