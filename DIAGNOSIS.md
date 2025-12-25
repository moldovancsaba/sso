# SSO Login Issue Diagnosis

**Date:** 2025-12-25T13:53:00.000Z
**Issue:** All login methods (Google, Facebook, Magic Link) redirect back to login page instead of admin dashboard

## Problem Analysis

### What's Happening:
1. User clicks "Sign in with Google" at https://sso.doneisbetter.com/admin
2. Successfully redirects to Google
3. Successfully authenticates with Google
4. Google callback creates session and sets `public-session` cookie
5. Redirects back to `/admin`
6. `/admin` page calls `/api/admin/check-access` with cookies
7. **FAILS**: Returns 401 Unauthorized
8. Shows login page again

### Root Cause Analysis:

#### Recent Fix (cbcb3dac):
```
Bug: getPublicUserWithAdminCheck was calling validatePublicSession(req)
instead of getPublicUserFromRequest(req)

Fix: Use getPublicUserFromRequest() which properly extracts and validates
the session cookie from the request object
```

This fix should have resolved the issue, but the problem persists.

### Possible Causes:

#### 1. **Cookie Domain Mismatch** ❌ (Unlikely - Configured correctly)
- Cookie is set with `Domain=.doneisbetter.com`
- Should work across all `*.doneisbetter.com` subdomains
- Configuration in `/lib/publicSessions.mjs` looks correct

#### 2. **Missing appPermissions Entry** ⚠️ (MOST LIKELY)
The unified admin system requires:
- User must exist in `publicUsers` collection ✅ (created during login)
- User must have entry in `appPermissions` collection with:
  - `clientId: 'sso-admin-dashboard'`
  - `status: 'approved'`
  - `hasAccess: true`
  - `role: 'admin'` or `'super-admin'`

**This entry must be manually created** - there's no automatic admin permission grant!

#### 3. **Session Cookie Not Being Sent** ⚠️ (Possible)
- Browser might not be sending cookies due to SameSite/Secure attributes
- Check browser DevTools → Application → Cookies
- Verify `public-session` cookie exists with correct domain

#### 4. **Database Connection Issue** ⚠️ (Possible)
- Session might be created but not persisted to MongoDB
- `publicSessions` collection might not have the session document

## Verification Steps:

### Step 1: Check if user exists in publicUsers
```bash
cd /Users/moldovancsaba/Projects/sso
node scripts/check-user.mjs YOUR_EMAIL@example.com
```

### Step 2: Check if user has admin permission
```javascript
// In MongoDB Atlas or Compass:
db.appPermissions.find({
  clientId: 'sso-admin-dashboard',
  status: 'approved',
  hasAccess: true
})
```

### Step 3: Check browser cookies
1. Open https://sso.doneisbetter.com in browser
2. Open DevTools (F12)
3. Go to Application → Cookies → https://sso.doneisbetter.com
4. Look for `public-session` cookie
5. Verify:
   - Domain: `.doneisbetter.com`
   - Secure: ✓
   - HttpOnly: ✓
   - SameSite: Lax

### Step 4: Check session in database
```javascript
// After logging in, check if session was created:
db.publicSessions.find().sort({createdAt: -1}).limit(5)
```

## Solutions:

### Solution 1: Grant Admin Permission Manually
```javascript
// Run in MongoDB shell or create script:
const userId = '...'; // Get from publicUsers collection

db.appPermissions.insertOne({
  userId: userId,
  clientId: 'sso-admin-dashboard',
  hasAccess: true,
  role: 'super-admin', // or 'admin'
  status: 'approved',
  grantedAt: new Date().toISOString(),
  grantedBy: null, // Manual grant
  revokedAt: null,
  revokedBy: null
});
```

### Solution 2: Create Bootstrap Script
Create `scripts/grant-admin-access.mjs`:
```javascript
import { getDb } from '../lib/db.mjs'
import { findPublicUserByEmail } from '../lib/publicUsers.mjs'

const email = process.env.ADMIN_EMAIL || process.argv[2]

if (!email) {
  console.error('Usage: node scripts/grant-admin-access.mjs EMAIL')
  process.exit(1)
}

const db = await getDb()
const user = await findPublicUserByEmail(email)

if (!user) {
  console.error(`User not found: ${email}`)
  process.exit(1)
}

const result = await db.collection('appPermissions').insertOne({
  userId: user.id,
  clientId: 'sso-admin-dashboard',
  hasAccess: true,
  role: 'super-admin',
  status: 'approved',
  grantedAt: new Date().toISOString(),
  grantedBy: null,
  revokedAt: null,
  revokedBy: null
})

console.log('✅ Admin access granted:', result.insertedId)
process.exit(0)
```

Then run:
```bash
ADMIN_EMAIL="your@email.com" node scripts/grant-admin-access.mjs
```

## Next Steps:

1. **Verify the user exists** in `publicUsers` collection
2. **Check if admin permission exists** in `appPermissions` collection
3. **Grant admin access manually** if missing
4. **Test login again** after granting permission
5. **Check browser cookies** to verify session cookie is set
6. **Monitor server logs** during login attempt

## Recommended Fix:

The most likely issue is **missing admin permission in appPermissions collection**. The unified admin system requires this entry to be manually created for the first admin user.

Create a bootstrap script that:
1. Checks if any admin users exist
2. If none exist, prompts for email
3. Finds user in publicUsers (or creates one)
4. Grants super-admin permission
5. Confirms success

This mirrors the approach used in the old admin system's bootstrap script.
