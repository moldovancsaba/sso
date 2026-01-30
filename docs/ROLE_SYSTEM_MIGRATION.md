# Role System Migration - January 2026

## Overview
Consolidated SSO role system from multiple overlapping role hierarchies to a simple 3-role system.

## Migration Date
January 20, 2026

## Problem Statement
The system had confusing, overlapping role types across different parts of the codebase:
- Old `users` collection: `admin`, `super-admin`
- `appPermissions` collection: `none`, `user`, `admin`, `owner`, `superadmin`, `guest`
- Various middleware checking: `['admin', 'super-admin', 'owner']`

This caused issues like:
- User `moldovancsaba@gmail.com` had `admin` role in appPermissions
- OAuth clients page checked for `super-admin` role
- Result: "+ New Client" button was hidden despite user having admin access

## Solution: 3-Role System

### Consolidated Roles
1. **`none`** - No access to the system
2. **`user`** - Regular user access (read-only or standard features)
3. **`admin`** - Full administrative access (all permissions)

### Role Mapping
**Old Roles → New Roles:**
- `super-admin` → `admin`
- `owner` → `admin`
- `superadmin` → `admin`
- `admin` → `admin` (unchanged)
- `user` → `user` (unchanged)
- `none` → `none` (unchanged)
- `guest` → removed (not used)

## Files Changed

### Core Authentication
- `lib/auth.mjs`
  - Updated role checks to use `admin` instead of `super-admin`
  - Removed `owner` from accepted roles
  - Simplified permission checks

### OAuth Client Management
- `pages/admin/oauth-clients.js`
  - Changed UI checks from `super-admin` to `admin` (4 locations)
- `pages/api/admin/oauth-clients/index.js`
  - Updated role check for creating clients
- `pages/api/admin/oauth-clients/[clientId].js`
  - Updated role checks for updating/deleting clients
- `pages/api/admin/oauth-clients/[clientId]/regenerate-secret.js`
  - Updated role check for regenerating secrets

### User Management
- `pages/api/admin/users/index.js`
  - Changed user creation permission from `super-admin` to `admin`
- `pages/api/admin/users/[userId].js`
  - Updated role update and deletion permissions
- `pages/admin/users.js`
  - Removed `superadmin` option from role dropdowns (3 locations)
- `pages/api/admin/users/[userId]/apps/[clientId]/permissions.js`
  - Removed `superadmin` from valid roles
  - Updated authorization checks

### Settings & Configuration
- `pages/api/admin/settings/pin-verification.js`
  - Changed settings update permission to `admin`

### Bootstrap & Development
- `pages/api/admin/bootstrap.js`
  - Creates `admin` role instead of `super-admin`
- `pages/api/admin/dev-login.js`
  - Creates `admin` role for dev users
- `pages/api/admin/magic-link.js`
  - Uses `admin` as default role

## Database Impact

### No Migration Required
The production database was already using the correct roles:
- `users` collection: 5 users with `super-admin` role (deprecated collection, not actively used)
- `publicUsers` collection: Already using `admin`, `user`, `none`
- `appPermissions` collection: Already using `admin` role

The code changes align with the existing database state, so **no database migration script is needed**.

## Testing Checklist

### OAuth Clients
- [ ] Login as admin user
- [ ] Navigate to `/admin/oauth-clients`
- [ ] Verify "+ New Client" button is visible
- [ ] Create a new OAuth client
- [ ] Edit an existing client
- [ ] Regenerate client secret
- [ ] Delete a client

### User Management
- [ ] View user list in admin dashboard
- [ ] Grant app access to a user
- [ ] Change user role within an app
- [ ] Verify only `user` and `admin` options appear in dropdowns

### Settings
- [ ] Toggle PIN verification setting
- [ ] Verify admin can change settings

## Rollback Plan
If issues arise, revert the following commits and redeploy:
1. Role system migration commit (this change)

The database does not need to be rolled back as no data was modified.

## Benefits
1. **Simplified mental model** - Only 3 roles to understand
2. **Consistent permissions** - Admin role has full access everywhere
3. **No privilege escalation issues** - Clear separation between user and admin
4. **Easier maintenance** - Less code checking multiple role variations
5. **Better security** - Explicit role checks, no ambiguity

## Future Considerations
- The old `users` collection (5 users with `super-admin` role) can be deprecated/removed
- All authentication should use `publicUsers` collection + `appPermissions`
- Consider removing `users` collection entirely in future cleanup

## Related Documentation
- `lib/auth.mjs` - Core authentication logic
- `lib/appPermissions.mjs` - App-level permission management
- MongoDB database: `sso` on cluster `doneisbetter.49s2z.mongodb.net`
