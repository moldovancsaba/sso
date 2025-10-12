# Admin and Public User Separation Audit

**Date**: 2025-10-12T19:05:00Z  
**Critical Issue**: Admin and public user systems must be COMPLETELY SEPARATE  
**Impact**: High - Mixing these systems violates security boundaries and confuses users

---

## Fundamental Principle

**ADMIN USERS** and **PUBLIC USERS** are TWO COMPLETELY DIFFERENT SYSTEMS:

### Admin Users (System Management)
- **Purpose**: Manage the SSO system itself
- **Database**: `users` collection
- **Authentication**: Email + 32-hex token (NOT password)
- **Access**: `/admin` portal ONLY
- **Capabilities**: Manage OAuth clients, manage public users, system configuration
- **Sessions**: `admin-session` cookie

### Public Users (SSO Service)
- **Purpose**: Use SSO to log into client applications (LaunchMass, etc.)
- **Database**: `publicUsers` collection  
- **Authentication**: Email + bcrypt password, magic links, PIN verification
- **Access**: Public pages (`/`, `/login`, `/register`, `/account`)
- **Capabilities**: OAuth authorization, manage own account
- **Sessions**: `public-session` cookie

---

## Violation Checklist

### ❌ NEVER DO THIS:

1. Show admin login option on public pages
2. Show public login option on admin pages
3. Check admin session on public user pages
4. Check public session on admin pages
5. Mix `users` and `publicUsers` collections in queries
6. Allow admin users to authenticate as public users
7. Allow public users to access admin functions
8. Show admin info (email, role) to public users
9. Use same authentication flow for both
10. Cross-reference between databases

---

## Current Violations Found & Fixed

### ✅ Fixed: Homepage (/)
- **Was**: Showing admin login button and checking admin sessions
- **Now**: Only shows public user login/register, only checks public sessions
- **Status**: FIXED (commit 84afa990)

### ✅ Fixed: OAuth Endpoints  
- **Was**: Only checking admin sessions
- **Now**: Checks both admin and public sessions (OAuth should work for both)
- **Status**: FIXED (multiple commits)
- **Note**: OAuth is special case - it's a PUBLIC service that admins can also test

---

## Audit Results by Component

### Public-Facing Pages (Should NEVER reference admin)

| Page | Checks Admin? | Shows Admin UI? | Status |
|------|---------------|-----------------|--------|
| `/` (homepage) | ❌ No | ❌ No | ✅ CORRECT |
| `/login` | ❌ No | ❌ No | ✅ CORRECT |
| `/register` | ❌ No | ❌ No | ✅ CORRECT |
| `/account` | ❌ No | ❌ No | ✅ CORRECT |
| `/forgot-password` | ❌ No | ❌ No | ✅ CORRECT |
| `/logout` | ❌ No | ❌ No | ✅ CORRECT |

### Admin Pages (Should NEVER reference public users)

| Page | Checks Public? | Shows Public UI? | Status |
|------|----------------|------------------|--------|
| `/admin` | ❌ No | ❌ No | ✅ CORRECT |
| `/admin/users` | ❌ No | ❌ No | ✅ CORRECT |
| `/admin/public-users` | ✅ Yes | ✅ Yes | ✅ CORRECT (this is for MANAGING public users as admin) |
| `/admin/oauth-clients` | ❌ No | ❌ No | ✅ CORRECT |

### OAuth Flow Pages (Special Case - PUBLIC service)

| Page | Purpose | Auth Check | Status |
|------|---------|------------|--------|
| `/oauth/consent` | User grants permissions | Both admin & public | ✅ CORRECT (OAuth is public) |

### API Endpoints - Public User Operations

| Endpoint | Should Check | Currently Checks | Status |
|----------|-------------|------------------|--------|
| `/api/public/register` | Public only | Public only | ✅ CORRECT |
| `/api/public/login` | Public only | Public only | ✅ CORRECT |
| `/api/public/session` | Public only | Public only | ✅ CORRECT |
| `/api/public/profile` | Public only | Public only | ✅ CORRECT |
| `/api/public/change-password` | Public only | Public only | ✅ CORRECT |
| `/api/public/account` | Public only | Public only | ✅ CORRECT |
| `/api/public/authorizations` | Public only | Public only | ✅ CORRECT |
| `/api/public/forgot-password` | Public only | Public only | ✅ CORRECT |
| `/api/public/magic-login` | Public only | Public only | ✅ CORRECT |
| `/api/public/verify-pin` | Public only | Public only | ✅ CORRECT |

### API Endpoints - Admin Operations

| Endpoint | Should Check | Currently Checks | Status |
|----------|-------------|------------------|--------|
| `/api/admin/login` | Admin only | Admin only | ✅ CORRECT |
| `/api/admin/users/*` | Admin only | Admin only | ✅ CORRECT |
| `/api/admin/public-users/*` | Admin only | Admin only | ✅ CORRECT (managing public users) |
| `/api/admin/oauth-clients/*` | Admin only | Admin only | ✅ CORRECT |

### API Endpoints - OAuth Flow (Special Case)

| Endpoint | Should Check | Currently Checks | Status |
|----------|-------------|------------------|--------|
| `/api/oauth/authorize` | Both | Both admin & public | ✅ CORRECT |
| `/api/oauth/consent` | Both | Both admin & public | ✅ CORRECT |
| `/api/oauth/authorize/approve` | Both | Both admin & public | ✅ CORRECT |
| `/api/oauth/token` | Neither (uses client_secret) | Client authentication | ✅ CORRECT |
| `/api/sso/validate` | Both | Both admin & public | ✅ CORRECT (session validation endpoint) |

---

## Database Collections Separation

### Admin Database
- Collection: `users`
- Fields: `id` (UUID), `email`, `name`, `role` ('admin'|'super-admin'), `password` (32-hex token)
- Authentication: Email + 32-hex token
- Session cookie: `admin-session`

### Public Database
- Collection: `publicUsers`
- Fields: `id` (UUID), `email`, `name`, `passwordHash` (bcrypt), `status`, `emailVerified`
- Authentication: Email + bcrypt password, magic links, PIN
- Session cookie: `public-session`

### NEVER:
- Query both collections in same operation
- Join between collections
- Allow user from one collection to impersonate other
- Share session cookies between systems

---

## Session Isolation

### Admin Sessions
- Cookie name: `admin-session` (configurable via `ADMIN_SESSION_COOKIE`)
- Library: `lib/auth.mjs` + `lib/sessions.mjs`
- Validation: `getAdminUser(req)`
- Storage: `sessions` collection with `userId` matching `users.id`

### Public Sessions
- Cookie name: `public-session` (configurable via `PUBLIC_SESSION_COOKIE`)
- Library: `lib/publicSessions.mjs`
- Validation: `getPublicUserFromRequest(req)`
- Storage: `publicSessions` collection with `userId` matching `publicUsers.id`

### Isolation Rules:
1. Different cookie names
2. Different storage collections
3. Different validation functions
4. No shared tokens
5. Different lifetime policies (both now 30 days but managed independently)

---

## UI/UX Separation Rules

### Public User Journey
```
Homepage (/) → Register/Login → OAuth Consent → Client App → Account Management
```

**NEVER shows**:
- Admin portal link
- Admin session info
- "Admin" role
- 32-hex token input
- System management options

### Admin User Journey
```
/admin → Login (32-hex token) → Admin Dashboard → Manage System
```

**NEVER shows**:
- Public user registration
- "Login with password"
- OAuth consent (admins test OAuth as public users would)
- Account management (admins don't have public accounts)

---

## Exception: OAuth Testing

**Admins MAY test OAuth flow** by:
1. Creating a PUBLIC user account (separate from admin account)
2. Logging in as that PUBLIC user
3. Testing OAuth authorization as a normal user would

This is NOT mixing systems - admins are using the public system like any user would.

---

## Navigation Rules

### Public Pages Must NEVER Link To:
- `/admin`
- `/admin/*`
- Any admin-specific page

### Admin Pages Must NEVER Link To:
- `/login` (public)
- `/register`
- `/account`
- Any public user page

**Exception**: Admin can link to `/docs` (documentation is shared resource)

---

## Error Messages

### Public User Errors
- "Invalid email or password"
- "Please verify your email"
- "Account not found"

### Admin User Errors  
- "Invalid admin credentials"
- "Admin authentication required"
- "Unauthorized - admin access only"

**NEVER**: Mix error messages between systems

---

## Recommended Improvements

### 1. Explicit Comments in Every Endpoint

```javascript
// AUTHENTICATION: Public users only - NO admin access
// AUTHENTICATION: Admin users only - NO public access  
// AUTHENTICATION: Both (OAuth flow exception)
```

### 2. Separate Helper Functions

DO NOT use a combined `getAuthenticatedUser()` helper everywhere.

Instead:
- `getAdminUser()` - admin endpoints only
- `getPublicUserFromRequest()` - public endpoints only
- `getAuthenticatedUserForOAuth()` - OAuth flow only

### 3. Route Prefixes

Already correct:
- `/admin/*` - admin only
- `/api/admin/*` - admin API only
- `/api/public/*` - public API only
- `/api/oauth/*` - OAuth (both users)

### 4. Separate Documentation

- Admin docs: How to manage SSO system
- Public docs: How to integrate OAuth with client apps

---

## Testing Checklist

### Public User Flow (Must Work)
- [ ] Register new account at `/register`
- [ ] Login at `/login` with email + password
- [ ] Login with magic link
- [ ] Complete OAuth flow (LaunchMass)
- [ ] Manage account at `/account`
- [ ] Logout from `/account` or `/logout`
- [ ] NEVER see admin references

### Admin Flow (Must Work)
- [ ] Login at `/admin` with email + 32-hex token
- [ ] Access admin dashboard
- [ ] Manage OAuth clients
- [ ] Manage public users (via admin interface)
- [ ] Logout from admin dashboard
- [ ] NEVER see public user UI

### Isolation Tests (Must Fail Gracefully)
- [ ] Admin token does NOT work on public login
- [ ] Public password does NOT work on admin login
- [ ] Admin session does NOT grant public user access
- [ ] Public session does NOT grant admin access
- [ ] No cross-references in UI
- [ ] No leaked admin info on public pages

---

## Conclusion

**Admin and Public are TWO SEPARATE SYSTEMS** that happen to live in the same codebase for deployment convenience.

They share:
- ✅ Database server (different collections)
- ✅ OAuth implementation (public service)
- ✅ Documentation pages
- ✅ Infrastructure

They DO NOT share:
- ❌ Authentication methods
- ❌ Sessions
- ❌ User data
- ❌ UI/UX flows
- ❌ Navigation
- ❌ Database collections
- ❌ API endpoints

**This separation is CRITICAL for security and usability.**

---

**Status**: Audit complete, violations fixed  
**Next Review**: Before any new authentication features are added
