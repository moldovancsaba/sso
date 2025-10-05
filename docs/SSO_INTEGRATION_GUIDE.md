# SSO Integration Guide — Cookie-Based Authentication

Version: 1.0.0  
Last updated: 2025-10-04T06:48:00.000Z

This guide shows you how to integrate any application with our SSO service using cookie-based authentication. This is the simplest and most reliable method for subdomain authentication (*.doneisbetter.com).

---

## Overview

**What this enables:**
- Users login once on sso.doneisbetter.com
- Session cookie is shared across all *.doneisbetter.com subdomains
- Your app validates sessions by calling SSO API endpoints
- No OAuth2 complexity, no client secrets to manage
- Works for both public users and admin users

**Key principle:** SSO handles all authentication. Your app just validates sessions and redirects when needed.

---

## Prerequisites

### 1. Domain Configuration
- Your app MUST be on a *.doneisbetter.com subdomain
- Example: `yourapp.doneisbetter.com`
- Why: Cookies with `Domain=.doneisbetter.com` are shared across subdomains

### 2. Required Environment Variables

**CRITICAL: No trailing newlines or extra characters!**

```bash
# SSO server URL (no trailing slash, no newline)
SSO_SERVER_URL=https://sso.doneisbetter.com

# MongoDB connection (if you want to sync users locally)
MONGODB_URI=your-mongodb-connection-string
DB_NAME=your-database-name
```

**How to verify no newlines:**
```bash
# Good way to set without newlines
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production

# Bad way (adds newline)
echo "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production
```

---

## Integration Steps

### Step 1: Create Authentication Library

Create `lib/auth.js` in your project:

```javascript
/**
 * Validate SSO session by forwarding cookies to SSO service
 * Returns: { isValid: boolean, user?: Object }
 */
export async function validateSsoSession(req) {
  try {
    // CRITICAL: Verify SSO_SERVER_URL is set and has no newlines
    if (!process.env.SSO_SERVER_URL) {
      console.error('[auth] SSO_SERVER_URL not configured');
      return { isValid: false };
    }
    
    const cookieHeader = req.headers.cookie || '';
    
    // Try public user validation first
    const publicUrl = `${process.env.SSO_SERVER_URL}/api/public/validate`;
    let resp;
    
    try {
      resp = await fetch(publicUrl, {
        method: 'GET',
        headers: {
          cookie: cookieHeader,
          accept: 'application/json',
          'user-agent': req.headers['user-agent'] || 'your-app-client',
        },
        cache: 'no-store',
      });
    } catch (fetchErr) {
      console.error('[auth] Failed to fetch from SSO:', fetchErr.message);
      return { isValid: false };
    }
    
    let data;
    try {
      data = await resp.json();
    } catch (jsonErr) {
      console.error('[auth] Failed to parse SSO response:', jsonErr.message);
      return { isValid: false };
    }
    
    // If public validation fails, try admin validation
    if (!data?.isValid) {
      const adminUrl = `${process.env.SSO_SERVER_URL}/api/sso/validate`;
      try {
        resp = await fetch(adminUrl, {
          method: 'GET',
          headers: {
            cookie: cookieHeader,
            accept: 'application/json',
            'user-agent': req.headers['user-agent'] || 'your-app-client',
          },
          cache: 'no-store',
        });
        data = await resp.json();
      } catch (adminErr) {
        console.error('[auth] Failed to fetch from admin SSO:', adminErr.message);
        return { isValid: false };
      }
    }
    
    if (data?.isValid && data?.user?.id) {
      // Optional: Sync user to local database
      // See "Optional: Local User Sync" section below
      
      return { 
        isValid: true, 
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        }
      };
    }
    
    return { isValid: false };
  } catch (err) {
    console.error('[auth] SSO validation error:', err.message);
    return { isValid: false };
  }
}
```

**Key points:**
- ✅ Multiple layers of try-catch to prevent 500 errors
- ✅ Always return `{ isValid: false }` instead of throwing
- ✅ Check both public and admin endpoints
- ✅ Forward cookies from incoming request to SSO

---

### Step 2: Protect Your Pages with Server-Side Validation

In your protected pages (e.g., `pages/admin/index.js`):

```javascript
import { validateSsoSession } from '../../lib/auth';

export async function getServerSideProps(context) {
  try {
    const { req, resolvedUrl } = context;
    
    // Validate session
    const { isValid, user } = await validateSsoSession(req);
    
    if (!isValid) {
      // Redirect to SSO login with return URL
      const ssoUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
      const returnUrl = `https://yourapp.doneisbetter.com${resolvedUrl}`;
      const loginUrl = `${ssoUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
      
      return {
        redirect: {
          destination: loginUrl,
          permanent: false,
        },
      };
    }
    
    // Pass user data to page component
    return {
      props: {
        user: {
          email: user.email || '',
          name: user.name || user.email || '',
          id: user.id || '',
          role: user.role || '',
        },
      },
    };
  } catch (err) {
    // CRITICAL: Catch ALL errors and redirect gracefully
    console.error('[page] getServerSideProps error:', err.message);
    
    const ssoUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
    const returnUrl = `https://yourapp.doneisbetter.com${context.resolvedUrl || '/'}`;
    const loginUrl = `${ssoUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
    
    return {
      redirect: {
        destination: loginUrl,
        permanent: false,
      },
    };
  }
}

export default function YourPage({ user }) {
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

**Key points:**
- ✅ Wrap everything in try-catch
- ✅ Always redirect on error (never throw 500)
- ✅ Include `?redirect=` parameter for return URL
- ✅ Use full absolute URLs for redirects

---

### Step 3: Add Logout Support

Create a logout page at `pages/logout.js`:

```javascript
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Logout() {
  const router = useRouter();
  
  useEffect(() => {
    async function logout() {
      try {
        // Call SSO logout (clears both public and admin cookies)
        await fetch('https://sso.doneisbetter.com/api/public/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
      
      // Redirect to SSO login
      window.location.href = 'https://sso.doneisbetter.com/login';
    }
    
    logout();
  }, []);
  
  return (
    <div style={{ textAlign: 'center', padding: '100px' }}>
      <h1>Logging out...</h1>
    </div>
  );
}
```

---

## Optional: Local User Sync

If you want to track users in your local database (recommended for audit logs):

### Create `lib/users.js`:

```javascript
import clientPromise from './db.js';

export async function upsertUserFromSso(ssoUser) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'yourapp');
    const col = db.collection('users');
    
    const now = new Date().toISOString();
    
    await col.updateOne(
      { ssoUserId: ssoUser.id },
      {
        $setOnInsert: {
          ssoUserId: ssoUser.id,
          createdAt: now,
        },
        $set: {
          email: ssoUser.email,
          name: ssoUser.name,
          ssoRole: ssoUser.role,
          lastLoginAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
    
    return await col.findOne({ ssoUserId: ssoUser.id });
  } catch (dbErr) {
    // CRITICAL: Don't block auth if database fails
    console.error('[users] Failed to sync user:', dbErr.message);
    
    // Return fallback user data from SSO
    return {
      ssoUserId: ssoUser.id,
      email: ssoUser.email,
      name: ssoUser.name,
      ssoRole: ssoUser.role,
    };
  }
}
```

Then in your `validateSsoSession` function:

```javascript
if (data?.isValid && data?.user?.id) {
  let localUser;
  try {
    localUser = await upsertUserFromSso(data.user);
  } catch (dbErr) {
    console.error('[auth] Failed to sync user:', dbErr.message);
    localUser = {
      ssoUserId: data.user.id,
      email: data.user.email,
      name: data.user.name,
      ssoRole: data.user.role,
    };
  }
  
  return { isValid: true, user: localUser };
}
```

**Key points:**
- ✅ Database operations must never block authentication
- ✅ Always have fallback to SSO user data
- ✅ Wrap database calls in try-catch

---

## Deployment Checklist

### Before Deploying:

1. **Verify Environment Variables:**
```bash
# Check for newlines (should output clean URL)
vercel env pull .env.production
cat .env.production | grep SSO_SERVER_URL

# If you see newlines, remove and re-add:
vercel env rm SSO_SERVER_URL production
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production
```

2. **Test Locally:**
```bash
# Set env var without newline
export SSO_SERVER_URL="https://sso.doneisbetter.com"
npm run dev
```

3. **Deploy:**
```bash
git add -A
git commit -m "feat: Add SSO integration"
git push origin main
```

### After Deploying:

1. **Test the flow:**
   - Visit: `https://yourapp.doneisbetter.com/admin` (or your protected page)
   - Should redirect to: `https://sso.doneisbetter.com/login?redirect=...`
   - Login with test account
   - Should redirect back to your app

2. **Verify no 500 errors:**
   - Open incognito window
   - Visit your protected page
   - Should redirect to SSO login (not show 500 error)

3. **Check logs:**
```bash
vercel logs --follow
```

Look for:
- ✅ `[auth] SSO_SERVER_URL: SET`
- ❌ `[auth] SSO_SERVER_URL not configured`
- ❌ `[auth] Failed to fetch from SSO`

---

## Common Issues and Solutions

### Issue 1: 500 Internal Server Error on Protected Pages

**Symptom:** Page shows 500 error instead of redirecting to SSO login

**Causes:**
1. Environment variable has trailing newline
2. Database connection failing and blocking auth
3. Error thrown instead of graceful redirect

**Solution:**
```bash
# Fix environment variable
vercel env rm SSO_SERVER_URL production
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production

# Trigger redeploy
git commit --allow-empty -m "fix: Redeploy with clean SSO_SERVER_URL"
git push origin main
```

**Prevention:**
- ✅ Always use `printf` instead of `echo` for env vars
- ✅ Wrap ALL code in try-catch with graceful redirects
- ✅ Make database operations non-blocking

---

### Issue 2: "TypeError: Load failed" on Login Form

**Symptom:** Login/register form shows "Load failed" error on submit

**Causes:**
1. Using `<form onSubmit>` wrapper
2. Browser form validation interfering with fetch

**Solution:**
- ❌ Don't use: `<form onSubmit={handleSubmit}>`
- ✅ Use: `<div>` with `<button type="button" onClick={handleSubmit}>`

**Example:**
```javascript
// BAD
<form onSubmit={handleSubmit}>
  <button type="submit">Login</button>
</form>

// GOOD
<div>
  <button type="button" onClick={handleSubmit}>Login</button>
</div>
```

---

### Issue 3: Infinite Page Refresh

**Symptom:** Login page refreshes continuously every second

**Causes:**
1. React useEffect with incorrect dependencies
2. Router not ready during SSR/hydration
3. Session check running during render

**Solution:**
```javascript
// BAD
useEffect(() => {
  checkSession();
}, [redirect, router]); // Causes infinite loop

// GOOD
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

useEffect(() => {
  if (!mounted || !router.isReady) return;
  checkSession();
}, [mounted, router.isReady]);
```

**Or better:** Remove automatic session checks from login page entirely.

---

### Issue 4: Redirect Parameter Lost

**Symptom:** After registration, user not redirected back to origin app

**Causes:**
1. Links between login/register don't preserve `?redirect=` param

**Solution:**
```javascript
// Preserve redirect parameter in all navigation
<Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}>
  Create account
</Link>
```

---

### Issue 5: CORS Errors

**Symptom:** Fetch calls to SSO fail with CORS error

**Causes:**
1. Your app domain not allowed in SSO CORS configuration

**Solution:**
- SSO already allows all `*.doneisbetter.com` subdomains
- Ensure your app is on a subdomain (not external domain)
- For external domains, use OAuth2 (Phase 2)

---

## Testing Guide

### Manual Testing Checklist:

**1. Unauthenticated Access:**
- [ ] Visit protected page in incognito window
- [ ] Should redirect to SSO login (not 500 error)
- [ ] URL should include `?redirect=` parameter

**2. Registration Flow:**
- [ ] Click "Create account" on login page
- [ ] Fill in email, password, name
- [ ] Submit form
- [ ] Should redirect back to origin app

**3. Login Flow:**
- [ ] Enter email and password
- [ ] Click "Sign In"
- [ ] Should redirect back to origin app
- [ ] Should see user name/email in app

**4. Authenticated Access:**
- [ ] Close and reopen browser
- [ ] Visit protected page directly
- [ ] Should show page immediately (no redirect)

**5. Logout:**
- [ ] Click logout in your app
- [ ] Should clear session
- [ ] Visiting protected page should redirect to SSO login

**6. Cross-App Sessions:**
- [ ] Login to App A
- [ ] Visit App B
- [ ] Should already be logged in (shared cookie)

---

## Debug Endpoints

### Test SSO Connection:

Create `pages/api/debug/sso-test.js`:

```javascript
export default async function handler(req, res) {
  try {
    const ssoUrl = process.env.SSO_SERVER_URL;
    
    if (!ssoUrl) {
      return res.status(500).json({ error: 'SSO_SERVER_URL not set' });
    }
    
    // Check for newlines
    const hasNewline = ssoUrl.includes('\n');
    
    const resp = await fetch(`${ssoUrl}/api/public/validate`, {
      method: 'GET',
      headers: {
        cookie: req.headers.cookie || '',
        accept: 'application/json',
      },
    });
    
    const data = await resp.json();
    
    return res.json({
      ssoUrl,
      hasNewline,
      status: resp.status,
      isValid: data?.isValid || false,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

Visit: `https://yourapp.doneisbetter.com/api/debug/sso-test`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│  Cookie: user-session=xxx; Domain=.doneisbetter.com         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────────────┐
                            │                         │
                            ▼                         ▼
               ┌────────────────────┐    ┌────────────────────┐
               │   Your App         │    │   SSO Service      │
               │   (yourapp.        │    │   (sso.            │
               │   doneisbetter.    │    │   doneisbetter.    │
               │   com)             │    │   com)             │
               └────────────────────┘    └────────────────────┘
                         │                         │
                         │ 1. Forward cookies      │
                         │───────────────────────>│
                         │                         │
                         │ 2. Return user data     │
                         │<───────────────────────│
                         │                         │
                         ▼                         ▼
               ┌────────────────────┐    ┌────────────────────┐
               │   Your MongoDB     │    │   SSO MongoDB      │
               │   (Optional)       │    │   (Sessions)       │
               └────────────────────┘    └────────────────────┘
```

**Flow:**
1. User visits your protected page
2. Your app checks for session cookie
3. If cookie exists, forward to SSO for validation
4. SSO checks session in its MongoDB
5. SSO returns user data if valid
6. Your app optionally syncs user to local DB
7. Your app shows protected page

---

## Summary: Key Rules

✅ **DO:**
- Use `printf` instead of `echo` for environment variables
- Wrap all auth code in try-catch
- Always redirect on error (never throw 500)
- Make database operations non-blocking with fallbacks
- Test with both public and admin users
- Verify environment variables have no newlines
- Use button onClick instead of form onSubmit for login forms

❌ **DON'T:**
- Add trailing newlines to environment variables
- Block authentication on database failures
- Throw errors in getServerSideProps
- Use `<form>` wrapper for login/register forms
- Forget to preserve `?redirect=` parameter
- Assume SSO_SERVER_URL is set without checking

---

## Next Steps

1. Copy the authentication library code to your project
2. Add environment variables (verify no newlines!)
3. Protect your pages with getServerSideProps
4. Test the complete flow
5. Deploy and verify

For questions or issues, check the "Common Issues" section above.

---

**Version History:**
- 1.0.0 (2025-10-04): Initial version with lessons from launchmass integration
