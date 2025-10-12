# SSO Authentication Audit Report

**Date**: 2025-10-12T18:45:00Z  
**Purpose**: Comprehensive audit of authentication patterns across all API endpoints  
**Issue**: Multiple endpoints only checked admin sessions, breaking OAuth flow for public users

## Executive Summary

**Problem Identified**: SSO was designed to serve both admin users (internal management) and public users (OAuth clients), but many endpoints only validated admin sessions. This caused OAuth authorization flow to fail for public users.

**Root Cause**: Code was initially written with admin-only authentication, and when public user support was added, not all endpoints were updated.

**Impact**: High - Broke complete OAuth flow for public users attempting to authenticate with client applications.

---

## Authentication Pattern Classification

### Pattern A: Admin-Only (Correct)
Endpoints that manage SSO system itself - should ONLY accept admin users.

### Pattern B: Dual Authentication (Required)
Endpoints used in OAuth flow or user-facing features - MUST accept both admin and public users.

### Pattern C: Public-Only (Correct)
Endpoints for public user registration, login, password reset - only for public users.

---

## Endpoint Audit Results

### ✅ FIXED - OAuth Flow Endpoints (Pattern B Required)

| Endpoint | Status | Fixed | Notes |
|----------|--------|-------|-------|
| `/api/sso/validate` | ✅ Fixed | 2025-10-12 | Now checks both admin and public sessions |
| `/api/oauth/authorize` | ✅ Fixed | Earlier | Already supported both user types |
| `/api/oauth/consent` | ✅ Fixed | 2025-10-12 | Now checks both admin and public sessions |
| `/api/oauth/authorize/approve` | ✅ Fixed | 2025-10-12 | Now checks both admin and public sessions, made code_challenge optional |

### ✅ CORRECT - Admin-Only Endpoints (Pattern A)

These endpoints correctly use admin-only authentication:

| Endpoint | Purpose | Auth Pattern |
|----------|---------|--------------|
| `/api/admin/login` | Admin authentication | Admin-only ✓ |
| `/api/admin/users/*` | Manage admin users | Admin-only ✓ |
| `/api/admin/public-users/*` | Manage public users | Admin-only ✓ |
| `/api/admin/oauth-clients/*` | Manage OAuth clients | Admin-only ✓ |

### ✅ CORRECT - Public-Only Endpoints (Pattern C)

| Endpoint | Purpose | Auth Pattern |
|----------|---------|--------------|
| `/api/public/register` | Public user registration | Public-only ✓ |
| `/api/public/login` | Public user authentication | Public-only ✓ |
| `/api/public/forgot-password` | Password reset | Public-only ✓ |
| `/api/public/request-magic-link` | Magic link auth | Public-only ✓ |
| `/api/public/magic-login` | Magic link consumption | Public-only ✓ |

### 🔍 NEEDS REVIEW - Resource Passwords

| Endpoint | Current State | Should Be |
|----------|---------------|-----------|
| `/api/resource-passwords` | Uses getAdminUser only | **Needs investigation** - May need both admin bypass AND public user access |

---

## Code Pattern Analysis

### ❌ Anti-Pattern (Caused Bugs)
```javascript
// WRONG - Only checks admin
const user = await getAdminUser(req)
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

### ✅ Correct Pattern for OAuth/User Endpoints
```javascript
// CORRECT - Checks both admin and public
let user = await getAdminUser(req)
if (!user) {
  user = await getPublicUserFromRequest(req)
}

if (!user) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

### ✅ Correct Pattern for Admin-Only Endpoints
```javascript
// CORRECT - Admin-only is appropriate
const admin = await getAdminUser(req)
if (!admin) {
  return res.status(401).json({ error: 'Admin authentication required' })
}
```

---

## Recommended Improvements

### 1. Create Authentication Helper Function

Create `lib/authHelpers.mjs`:

```javascript
/**
 * Get authenticated user (admin or public)
 * WHAT: Checks both admin and public user sessions
 * WHY: OAuth and user-facing endpoints should work for both user types
 * @returns {{ user: Object, userType: 'admin'|'public' } | { user: null, userType: null }}
 */
export async function getAuthenticatedUser(req) {
  let user = await getAdminUser(req)
  if (user) {
    return { user, userType: 'admin' }
  }
  
  user = await getPublicUserFromRequest(req)
  if (user) {
    return { user, userType: 'public' }
  }
  
  return { user: null, userType: null }
}
```

### 2. Clear Documentation in Code

Every endpoint should have a comment explaining its authentication requirement:

```javascript
// AUTHENTICATION: Admin-only (manages SSO system)
// AUTHENTICATION: Dual (admin or public user)
// AUTHENTICATION: Public-only (user registration/login)
```

### 3. Consistent Error Messages

- Admin-only: `"Admin authentication required"`
- Dual auth: `"Unauthorized"` or `"Authentication required"`
- Public-only: `"Invalid credentials"` or specific error

---

## Testing Checklist

### OAuth Flow Tests (CRITICAL)

- [ ] Public user can log into LaunchMass via SSO
- [ ] Admin user can log into LaunchMass via SSO
- [ ] Consent page loads correctly with request param
- [ ] Consent approval generates authorization code
- [ ] Authorization code exchange works
- [ ] Tokens are issued correctly
- [ ] Refresh token flow works

### Admin Function Tests

- [ ] Admin login works
- [ ] Admin can manage public users
- [ ] Admin can manage OAuth clients
- [ ] Admin can view system logs

### Public User Tests

- [ ] Public user registration works
- [ ] Public user login works
- [ ] Magic link login works
- [ ] Forgot password works
- [ ] PIN verification works
- [ ] Account management page works

---

## Prevention Strategy

### Code Review Checklist

When adding new endpoints that involve authentication:

1. **Identify the endpoint's purpose**: System management? OAuth flow? Public user feature?
2. **Choose correct authentication pattern**: Admin-only, Dual, or Public-only
3. **Add explicit comment** documenting the auth requirement
4. **Test with both user types** if using dual authentication
5. **Update this audit document** with the new endpoint

### Automated Testing

Consider adding integration tests that:
- Test OAuth flow with both admin and public users
- Verify all OAuth endpoints accept both user types
- Catch 401 errors during OAuth flow

---

## Lessons Learned

1. **Architecture First**: When adding new user types, audit ALL existing endpoints
2. **Explicit Documentation**: Every endpoint should document its authentication requirement
3. **Helper Functions**: Reduce duplication with reusable authentication helpers
4. **End-to-End Testing**: Test complete flows, not just individual endpoints
5. **Error Messages Matter**: Generic errors hide the root cause - be specific

---

## Action Items

- [x] Fix `/api/sso/validate` to check both user types
- [x] Fix `/api/oauth/consent` to check both user types
- [x] Fix `/api/oauth/authorize/approve` to check both user types
- [ ] Create `getAuthenticatedUser()` helper function
- [ ] Review and potentially fix `/api/resource-passwords`
- [ ] Add authentication pattern comments to all endpoints
- [ ] Update ARCHITECTURE.md with authentication patterns
- [ ] Create integration tests for OAuth flow
- [ ] Test complete LaunchMass OAuth integration

---

**Status**: In Progress  
**Next Review**: After helper function creation and endpoint comments are added
