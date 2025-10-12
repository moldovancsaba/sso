# OAuth Token Exchange Failure - Root Cause & Fix

**Date**: 2025-10-12T19:33:21Z  
**Issue**: LaunchMass showing `token_exchange_failed` error  
**Status**: ROOT CAUSE IDENTIFIED ✅

---

## 🔍 Problem Diagnosis

### Symptoms
- LaunchMass redirects to SSO OAuth authorize endpoint
- User logs in successfully
- LaunchMass receives error: `https://launchmass.doneisbetter.com/?error=token_exchange_failed`

### Investigation Steps

1. **Checked OAuth endpoints** - All OAuth endpoints (authorize, consent, approve, token) were correctly implemented with unified authentication support

2. **Ran diagnostic script** - Created `scripts/check-launchmass-oauth.mjs` to inspect LaunchMass OAuth configuration

3. **Found critical issue**:
   ```
   ID: undefined  ← PROBLEM!
   Name: launchmass
   Status: active
   Redirect URIs: ['https://launchmass.doneisbetter.com/api/oauth/callback']
   ```

### Root Cause

**The LaunchMass OAuth client was missing a UUID identifier.**

- Client had only MongoDB `_id` (ObjectId)
- Client had no `id` field (UUID)
- OAuth flow uses `client.id` for authorization codes, tokens, and consents
- When `client.id` was `undefined`, authorization codes couldn't be properly created or validated
- This caused the token exchange to fail

---

## ✅ Fix Applied

### 1. Created UUID Fix Script
**File**: `scripts/fix-oauth-client-ids.mjs`

This script:
- Finds OAuth clients without UUID `id` field
- Generates a new UUID for each
- Updates the client document in MongoDB

### 2. Ran the Fix

```bash
node scripts/fix-oauth-client-ids.mjs
```

Result:
```
✅ Updated client: launchmass
   Old ID: undefined
   New UUID: df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f
```

---

## ⚠️ REQUIRED ACTION: Update LaunchMass Configuration

**The LaunchMass application MUST be updated to use the new client ID.**

### Old Configuration (WRONG)
```javascript
client_id: "68e4d9864278b483d746bfc4"  // MongoDB ObjectId
```

### New Configuration (CORRECT)
```javascript
client_id: "df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f"  // UUID
```

### Where to Update

Check LaunchMass application for OAuth configuration:
- Environment variables (`.env` or `.env.local`)
- Configuration files (`config.js`, `oauth.config.js`, etc.)
- Database settings
- Any hardcoded OAuth settings

Look for variables like:
- `SSO_CLIENT_ID`
- `OAUTH_CLIENT_ID`
- Similar naming variations

### Verification Steps

After updating LaunchMass with the new client ID:

1. Clear any cached OAuth tokens/sessions in LaunchMass
2. Try the OAuth login flow again
3. The flow should complete successfully without `token_exchange_failed`

---

## 🧪 Testing the Fix

### Run Diagnostic Script
```bash
# Load environment variables and run diagnostic
(set -a; source .env.local; set +a; node scripts/check-launchmass-oauth.mjs)
```

Expected output:
```
✅ Found LaunchMass client:
   ID: df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f
   Name: launchmass
   Status: active
```

### End-to-End OAuth Flow Test

1. Go to LaunchMass admin page
2. Click "Login with SSO" (or equivalent OAuth trigger)
3. Should redirect to SSO login page
4. Enter credentials and login
5. Should see consent page (first time) or automatic redirect
6. Should redirect back to LaunchMass with success
7. Should NOT see `token_exchange_failed` error

---

## 📝 Technical Details

### Why This Happened

- OAuth clients were likely created before UUID migration
- Legacy clients used MongoDB ObjectId as identifier
- System was updated to use UUIDs for all entities
- OAuth client migration was missed
- Authorization code generation uses `client.id`, causing undefined behavior

### What Was Fixed

1. **Created `lib/unifiedAuth.mjs`** - Centralized authentication helper
2. **Updated OAuth endpoints** - All use unified auth now (authorize, consent, approve, validate)
3. **Fixed OAuth client IDs** - All clients now have UUID identifiers
4. **Created diagnostic tools** - Scripts to check OAuth configuration and fix issues

### Related Files

- `/lib/unifiedAuth.mjs` - Unified authentication helper
- `/scripts/check-launchmass-oauth.mjs` - OAuth diagnostic tool
- `/scripts/fix-oauth-client-ids.mjs` - UUID migration tool
- `/pages/api/oauth/*` - OAuth endpoints (updated)

---

## 🚀 Next Steps

1. ✅ **DONE**: Fixed SSO OAuth client UUID issue
2. ⏳ **TODO**: Update LaunchMass with new client ID
3. ⏳ **TODO**: Test complete OAuth flow end-to-end
4. ⏳ **TODO**: Verify other OAuth clients have UUIDs (run diagnostic)

---

## 📞 Support

If the issue persists after updating LaunchMass:

1. Check LaunchMass server logs for detailed error messages
2. Run the diagnostic script: `node scripts/check-launchmass-oauth.mjs`
3. Check for authorization codes being created during OAuth flow
4. Verify LaunchMass is using correct redirect URI
5. Check LaunchMass is sending correct OAuth parameters

---

**Status**: Waiting for LaunchMass configuration update to complete fix
