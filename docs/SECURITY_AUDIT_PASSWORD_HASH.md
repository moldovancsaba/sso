# Security Audit: passwordHash Stripping Bug

**Date**: 2025-12-25T22:48:44Z  
**Severity**: HIGH  
**Status**: PARTIALLY FIXED

## Root Cause

All helper functions in `lib/publicUsers.mjs` that return user objects intentionally strip `passwordHash` for security:
- `createPublicUser()` - line 61
- `validateUserCredentials()` - line 111  
- `findPublicUserById()` - line 130 ⚠️ **CRITICAL**
- `findPublicUserByEmail()` - line 150
- `updatePublicUser()` - line 246
- `setEmailVerified()` - line 385

This is correct for security, BUT creates bugs when code later needs to check `passwordHash` to determine if Email+Password login is available.

## Affected Code

### ✅ FIXED
1. **`pages/account.js`** (Server-side props)
   - **Issue**: Used `getPublicUserFromRequest()` → no `passwordHash` → Email+Password shows as "Not linked"
   - **Fix**: Query database directly to get full user object for `getUserLoginMethods()`
   - **Commit**: cf64cb89

### ❌ CRITICAL BUG - NOT FIXED
2. **`pages/api/public/account/unlink/[provider].js`**
   - **Line 25**: `user = await getPublicUserFromRequest(req)` → no `passwordHash`
   - **Line 44**: `validateUnlinking(user, provider)` → can't see password method
   - **Line 53**: `getUserLoginMethods(user)` → missing 'password' in array
   - **Impact**: User could accidentally unlink last social provider when they only have password, causing account lockout
   - **Severity**: HIGH - breaks safety validation

### ✅ SAFE (No bug)
3. **`pages/api/admin/public-users/[id]/link.js`**
   - **Line 65**: Queries DB directly with `findOne()` → has `passwordHash` ✓
   - **Line 93**: `getUserLoginMethods(user)` works correctly

4. **`pages/api/admin/public-users/[id]/unlink/[provider].js`**
   - **Line 44**: Queries DB directly with `findOne()` → has `passwordHash` ✓
   - **Line 60**: `getUserLoginMethods(user)` works correctly

5. **`pages/api/public/session.js`**
   - **Already fixed in commit 0bed848d**
   - Returns `loginMethods` in response

## Solution

### Option 1: Create `findPublicUserByIdWithPassword()` 
Add a new function that returns user WITH passwordHash for internal use only:

```javascript
export async function findPublicUserByIdWithPassword(userId) {
  const db = await getDb()
  const user = await db.collection('publicUsers').findOne({ id: userId })
  return user // Returns FULL user including passwordHash
}
```

### Option 2: Add `includePassword` parameter
Modify existing functions to optionally include passwordHash:

```javascript
export async function findPublicUserById(userId, includePassword = false) {
  const db = await getDb()
  const user = await usersCollection.findOne({ id: userId })
  if (!user) return null
  
  if (includePassword) {
    return user // Return full user
  }
  
  const { passwordHash: _, ...userWithoutPassword } = user
  return userWithoutPassword
}
```

### Option 3: Direct DB queries (Recommended)
In endpoints that need passwordHash for validation, query DB directly instead of using helper functions:

```javascript
// Instead of:
const user = await getPublicUserFromRequest(req)

// Do this:
const user = await getPublicUserFromRequest(req)
if (!user) return res.status(401).json({ error: 'Unauthorized' })

const db = await getDb()
const fullUser = await db.collection('publicUsers').findOne({ id: user.id })
```

## Required Fixes

1. **URGENT**: Fix `/api/public/account/unlink/[provider].js`
   - Query DB directly to get full user object
   - Use `fullUser` for `validateUnlinking()` and `getUserLoginMethods()`

2. **Review**: Search for ALL usages of `getUserLoginMethods()` and `canLoginWithPassword()` 
   - Ensure they receive user objects that include `passwordHash`

3. **Documentation**: Add JSDoc warnings to `getUserLoginMethods()`:
   ```javascript
   /**
    * @param {Object} user - User object (MUST include passwordHash field to detect Email+Password login)
    */
   ```

## Testing Checklist

- [ ] User with only Email+Password cannot unlink password
- [ ] User with only Facebook cannot unlink Facebook  
- [ ] User with Email+Password + Facebook CAN unlink either one
- [ ] Account page correctly shows all linked methods
- [ ] Admin manual link/unlink works correctly
