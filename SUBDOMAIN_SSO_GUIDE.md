# Subdomain SSO Integration Guide (v5.0.0)

**Last Updated**: 2025-10-03T09:45:00.000Z

---

## Overview

This guide explains how to integrate subdomain applications (e.g., `launchmass.doneisbetter.com`, `cardmass.doneisbetter.com`) with the SSO service using **session cookies** instead of OAuth2.

**When to use Subdomain SSO**:
- ✅ Your application is on `*.doneisbetter.com` subdomain
- ✅ You want simple cookie-based authentication
- ✅ You don't need external domain support

**When to use OAuth2/OIDC** (see `OAUTH2_INTEGRATION.md`):
- ✅ Your application is on a different domain (e.g., `narimato.com`)
- ✅ You need JWT tokens
- ✅ You need fine-grained scopes

---

## How It Works

### Flow Diagram

```
1. User visits launchmass.doneisbetter.com/admin
2. App checks for SSO session (cookie)
3. No session? → Redirect to sso.doneisbetter.com?redirect=<return_url>
4. User logs in at SSO
5. SSO sets session cookie (Domain=.doneisbetter.com)
6. SSO redirects back to launchmass.doneisbetter.com/admin
7. App validates session via GET /api/sso/validate
8. ✅ User is authenticated!
```

### Key Concepts

**Session Cookie**:
- Name: `admin-session` (configurable)
- Domain: `.doneisbetter.com` (shared across all subdomains)
- HttpOnly: Yes (not accessible via JavaScript)
- Secure: Yes (HTTPS only in production)
- SameSite: `Lax` (allows navigation)

---

## Integration Steps

### Step 1: Check for Existing Session

In your application, check if the user has an active SSO session:

```javascript
// Example: Check SSO session on page load
async function checkSSOSession() {
  try {
    const response = await fetch('https://sso.doneisbetter.com/api/sso/validate', {
      method: 'GET',
      credentials: 'include', // CRITICAL: Include cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isValid) {
        // User is authenticated
        console.log('Logged in as:', data.user.email);
        return data.user;
      }
    }
    
    // No valid session
    return null;
  } catch (error) {
    console.error('SSO validation error:', error);
    return null;
  }
}
```

**Response Format** (200 OK):
```json
{
  "isValid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin" | "super-admin",
    "permissions": []
  }
}
```

**Response Format** (401 Unauthorized):
```json
{
  "isValid": false,
  "message": "No active admin session found"
}
```

---

### Step 2: Redirect to SSO for Login

If no session is found, redirect the user to SSO with a return URL:

```javascript
// Example: Redirect to SSO login
function redirectToSSO() {
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `https://sso.doneisbetter.com/?redirect=${returnUrl}`;
}

// Usage
async function protectRoute() {
  const user = await checkSSOSession();
  if (!user) {
    redirectToSSO();
  }
}
```

**Important**: Always encode the redirect URL to prevent URL parsing issues.

---

### Step 3: Handle Return from SSO

After successful login, SSO will redirect back to your application with the session cookie set. Simply validate the session again:

```javascript
// Example: React component with SSO protection
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function validateSession() {
      const response = await fetch('https://sso.doneisbetter.com/api/sso/validate', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isValid) {
          setUser(data.user);
          setLoading(false);
          return;
        }
      }

      // No valid session - redirect to SSO
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `https://sso.doneisbetter.com/?redirect=${returnUrl}`;
    }

    validateSession();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Welcome, {user.email}!</p>
    </div>
  );
}
```

---

### Step 4: Logout

To log out, simply delete the session cookie by calling the SSO logout endpoint:

```javascript
// Example: Logout function
async function logout() {
  try {
    const response = await fetch('https://sso.doneisbetter.com/api/admin/login', {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      console.log('Logged out successfully');
      // Redirect to login page or home
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}
```

---

## Complete Example (Next.js)

### pages/admin.js

```javascript
import { useEffect, useState } from 'react';

const SSO_BASE_URL = 'https://sso.doneisbetter.com';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // WHAT: Validate SSO session on component mount
  useEffect(() => {
    async function validateSession() {
      try {
        const response = await fetch(`${SSO_BASE_URL}/api/sso/validate`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isValid) {
            setUser(data.user);
            setLoading(false);
            return;
          }
        }

        // No valid session - redirect to SSO with return URL
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${SSO_BASE_URL}/?redirect=${returnUrl}`;
      } catch (error) {
        console.error('SSO validation error:', error);
        setLoading(false);
      }
    }

    validateSession();
  }, []);

  // WHAT: Logout handler
  async function handleLogout() {
    try {
      const response = await fetch(`${SSO_BASE_URL}/api/admin/login`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Admin Panel</h1>
        <p>Welcome, <strong>{user.email}</strong> ({user.role})</p>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
          Logout
        </button>
      </header>

      <main>
        <h2>Your Admin Content Here</h2>
        {/* Your admin interface */}
      </main>
    </div>
  );
}
```

---

## CORS Configuration

**Important**: Make sure your application's domain is allowed in the SSO CORS configuration.

### SSO Environment Variable

```bash
SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com,https://launchmass.doneisbetter.com,https://cardmass.doneisbetter.com,https://playmass.doneisbetter.com
```

### Your Application's Fetch Options

Always include `credentials: 'include'` to send cookies:

```javascript
fetch('https://sso.doneisbetter.com/api/sso/validate', {
  method: 'GET',
  credentials: 'include', // CRITICAL!
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## Security Considerations

### 1. Redirect URL Validation

The SSO service validates redirect URLs to prevent **open redirect attacks**:

**Allowed domains**:
- `*.doneisbetter.com` (all subdomains)
- `doneisbetter.com` (root domain)
- `localhost` and `127.0.0.1` (development only)

**Example**:
- ✅ `https://launchmass.doneisbetter.com/admin`
- ✅ `https://cardmass.doneisbetter.com/dashboard`
- ✅ `http://localhost:3000/admin` (dev)
- ❌ `https://evil.com/phishing` (blocked)

### 2. Session Cookie Security

The session cookie is:
- ✅ **HttpOnly**: Cannot be accessed via JavaScript (XSS protection)
- ✅ **Secure**: Only sent over HTTPS in production
- ✅ **SameSite=Lax**: Allows navigation but prevents CSRF
- ✅ **Domain=.doneisbetter.com**: Shared across all subdomains

### 3. HTTPS Required

**Production**: Always use HTTPS for both SSO and your application.  
**Development**: HTTP is allowed on `localhost` only.

### 4. Session Expiration

Admin sessions expire after **7 days** (configurable). After expiration, users must log in again.

---

## Troubleshooting

### Issue: "No active admin session found"

**Cause**: Session cookie is not being sent or has expired.

**Solutions**:
1. Make sure `credentials: 'include'` is in your fetch options
2. Check browser console for CORS errors
3. Verify cookie domain is `.doneisbetter.com`
4. Try logging in again

### Issue: "Redirect not working after login"

**Cause**: Invalid or malformed redirect URL.

**Solutions**:
1. Make sure redirect URL is properly encoded: `encodeURIComponent(url)`
2. Verify domain is `*.doneisbetter.com`
3. Check browser console for errors
4. Test redirect URL format: `https://sso.doneisbetter.com/?redirect=https%3A%2F%2Flaunchmass.doneisbetter.com%2Fadmin`

### Issue: CORS errors

**Cause**: Your application's domain is not in SSO_ALLOWED_ORIGINS.

**Solutions**:
1. Add your domain to `SSO_ALLOWED_ORIGINS` environment variable
2. Redeploy SSO service
3. Clear browser cache and try again

### Issue: "Session works on SSO but not on my app"

**Cause**: Cookie domain mismatch or HTTPS issue.

**Solutions**:
1. Verify SSO_COOKIE_DOMAIN is set to `.doneisbetter.com`
2. Make sure both SSO and your app use HTTPS in production
3. Check browser DevTools → Application → Cookies
4. Look for `admin-session` cookie with domain `.doneisbetter.com`

---

## Testing

### Manual Testing

1. **Clear cookies** in your browser
2. **Visit your app**: `https://launchmass.doneisbetter.com/admin`
3. **Expected**: Redirect to `https://sso.doneisbetter.com/?redirect=...`
4. **Login** with admin credentials
5. **Expected**: Redirect back to `https://launchmass.doneisbetter.com/admin`
6. **Expected**: You are now logged in (session validated)

### Development Testing

```bash
# Terminal 1: Start SSO server
cd /path/to/sso
npm run dev # Runs on port 3001

# Terminal 2: Start your app
cd /path/to/launchmass
npm run dev # Runs on port 3000
```

Then test the flow locally:
1. Visit `http://localhost:3000/admin`
2. Should redirect to `http://localhost:3001/?redirect=http%3A%2F%2Flocalhost%3A3000%2Fadmin`
3. Login
4. Should redirect back to `http://localhost:3000/admin`

---

## API Reference

### GET /api/sso/validate

**Purpose**: Validate admin session cookie

**Headers**:
```
Content-Type: application/json
Cookie: admin-session=<session_token>
```

**Response** (200 OK):
```json
{
  "isValid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin",
    "permissions": []
  }
}
```

**Response** (401 Unauthorized):
```json
{
  "isValid": false,
  "message": "No active admin session found"
}
```

---

### DELETE /api/admin/login

**Purpose**: Logout (clear session cookie)

**Headers**:
```
Cookie: admin-session=<session_token>
```

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

## Environment Variables

### SSO Service (.env)

```bash
# Session cookie name
ADMIN_SESSION_COOKIE=admin-session

# Cookie domain for subdomain sharing
SSO_COOKIE_DOMAIN=.doneisbetter.com

# CORS allowed origins (add your app's domain)
SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://launchmass.doneisbetter.com,https://cardmass.doneisbetter.com

# Base URL for SSO service
SSO_BASE_URL=https://sso.doneisbetter.com

# Session secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-session-secret-here

# MongoDB connection
MONGODB_URI=mongodb+srv://...
MONGODB_DB=sso_database
```

### Your Application (.env)

```bash
# SSO base URL
NEXT_PUBLIC_SSO_BASE_URL=https://sso.doneisbetter.com

# Your application URL
NEXT_PUBLIC_APP_URL=https://launchmass.doneisbetter.com
```

---

## Migration from External Auth

If you're migrating from an external auth system:

1. **Keep existing auth** for now
2. **Add SSO check** as a fallback
3. **Test thoroughly** with a small group
4. **Gradually migrate users** to SSO
5. **Remove old auth** once everyone is migrated

---

## Production Checklist

- [ ] `SSO_COOKIE_DOMAIN` is set to `.doneisbetter.com`
- [ ] `SSO_ALLOWED_ORIGINS` includes your app's domain
- [ ] HTTPS is enabled for both SSO and your app
- [ ] Session cookie is HttpOnly and Secure
- [ ] Redirect URLs are validated server-side
- [ ] CORS is properly configured
- [ ] Testing completed in staging environment
- [ ] Monitoring and alerts configured
- [ ] Documentation updated with your app's specifics

---

## Next Steps

1. **Implement SSO check** in your application
2. **Test locally** with `npm run dev`
3. **Deploy to staging** and test end-to-end
4. **Deploy to production** after successful staging test
5. **Monitor for issues** in the first 24-48 hours

---

## Support

- **Integration Guide**: This document
- **OAuth2 Guide**: `OAUTH2_INTEGRATION.md` (for external domains)
- **Architecture**: `ARCHITECTURE.md`
- **Troubleshooting**: See "Troubleshooting" section above

---

**Version**: 5.0.0  
**Last Updated**: 2025-10-03T09:45:00.000Z
