# Google Sign-In Setup Guide

Version: 5.26.0
Last Updated: 2025-12-21

This guide explains how to configure Google Sign-In for your SSO service.

## Overview

Google Sign-In allows users to authenticate using their Google accounts. The implementation follows the OAuth 2.0 authorization code flow and automatically links or creates user accounts based on email addresses.

## Prerequisites

- Google Cloud Platform account
- Access to Google Cloud Console
- SSO service deployed and accessible via HTTPS

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "SSO Service")
4. Click "Create"

## Step 2: Enable Google+ API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and click **Enable**
4. Also enable **Google People API** for better profile data access

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have Google Workspace)
3. Click **Create**

### Fill in required fields:

**App Information:**
- App name: `Your SSO Service Name`
- User support email: Your email address
- App logo: (Optional) Upload your logo

**App domain:**
- Application home page: `https://sso.doneisbetter.com`
- Application privacy policy link: `https://sso.doneisbetter.com/privacy`
- Application terms of service link: `https://sso.doneisbetter.com/terms`

**Authorized domains:**
- Add: `doneisbetter.com`

**Developer contact information:**
- Add your email address

4. Click **Save and Continue**

### Scopes:

1. Click **Add or Remove Scopes**
2. Add these scopes:
   - `openid`
   - `email`
   - `profile`
3. Click **Update** → **Save and Continue**

### Test users (Optional):

If your app is in testing mode, add test user emails here.

4. Click **Save and Continue** → **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Web application**

### Configure:

**Name:** `SSO Web Client`

**Authorized JavaScript origins:**
- `https://sso.doneisbetter.com`
- `http://localhost:3000` (for development)

**Authorized redirect URIs:**
- `https://sso.doneisbetter.com/api/auth/google/callback`
- `http://localhost:3000/api/auth/google/callback` (for development)

4. Click **Create**
5. **IMPORTANT**: Copy the Client ID and Client Secret - you'll need these for environment variables

## Step 5: Configure Environment Variables

Add these to your `.env` file or Vercel environment variables:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/google/callback
```

**Development Environment:**
```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Step 6: Deploy Configuration

### Local Development:
1. Update `.env` file with Google credentials
2. Restart dev server: `npm run dev`
3. Navigate to login page and test "Continue with Google" button

### Production (Vercel):
1. Go to Vercel Project Settings → Environment Variables
2. Add the three Google OAuth variables
3. Redeploy your application

## Step 7: Test Google Login

1. Navigate to login page: `https://sso.doneisbetter.com/login`
2. Click "Continue with Google" button
3. Select/login with Google account
4. Grant permissions when prompted
5. You should be redirected back and logged in

## How It Works

### User Flow:
1. User clicks "Continue with Google" button on login page
2. User is redirected to Google's authorization page
3. User selects Google account and grants permissions
4. Google redirects back to `/api/auth/google/callback` with authorization code
5. SSO exchanges code for access token
6. SSO fetches user profile from Google API
7. SSO checks if user exists by email:
   - **Existing user**: Links Google account to existing user
   - **New user**: Creates new user with Google profile data
8. SSO creates session and redirects to home page or OAuth flow

### Data Stored:

User document with Google social provider data:
```javascript
{
  id: "uuid-here",
  email: "user@gmail.com",
  name: "John Doe",
  emailVerified: true,
  socialProviders: {
    google: {
      id: "google-user-id",
      email: "user@gmail.com",
      name: "John Doe",
      picture: "https://lh3.googleusercontent.com/...",
      emailVerified: true,
      linkedAt: "2025-12-21T12:00:00.000Z",
      lastLoginAt: "2025-12-21T12:30:00.000Z"
    }
  },
  createdAt: "2025-12-21T12:00:00.000Z",
  updatedAt: "2025-12-21T12:00:00.000Z",
  lastLoginAt: "2025-12-21T12:30:00.000Z"
}
```

## Security Features

- **CSRF Protection**: State parameter with random token
- **OAuth Flow Context**: Preserves OAuth authorization flow when user logs in via Google during client app authorization
- **Email Verification**: Google-verified emails are marked as verified
- **Account Linking**: Automatically links Google account to existing user with same email
- **Session Security**: HttpOnly cookies with Domain attribute for subdomain SSO

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: The redirect URI in your request doesn't match any authorized redirect URIs in Google Cloud Console.

**Fix**:
1. Check the exact redirect URI in browser URL when error occurs
2. Go to Google Cloud Console → Credentials → Your OAuth Client
3. Add the exact redirect URI (including protocol, domain, and path)
4. Wait 5 minutes for changes to propagate

### Error: "access_denied" or user canceled
**Cause**: User clicked "Cancel" or denied permissions on Google consent screen.

**Fix**: User needs to try again and grant permissions.

### Error: "invalid_client"
**Cause**: Client ID or Client Secret is incorrect.

**Fix**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in environment variables
2. Regenerate credentials in Google Cloud Console if needed
3. Redeploy with updated credentials

### Google profile missing email
**Cause**: User's Google account doesn't have a verified email, or email scope not granted.

**Fix**:
1. Ensure email scope is included in OAuth consent screen configuration
2. User must have verified email address on Google account

### Users not seeing Google button
**Cause**: Missing environment variables or dev server needs restart.

**Fix**:
1. Verify all three Google OAuth environment variables are set
2. Restart development server: `npm run dev`
3. Clear browser cache and reload page

## Admin Dashboard

Google login users appear in the admin dashboard (`/admin/users`) with a "Google" badge next to their email. You can:
- View Google account linkage
- See last login time via Google
- Manage app permissions for Google users
- All standard user management features apply

## OAuth Client Apps

When Google users authenticate via OAuth client applications:
1. User logs in with Google
2. Google profile is linked/created
3. OAuth flow continues automatically
4. Client app receives authorization code
5. User is logged into both SSO and client app

## Rate Limiting

Google login endpoints are subject to the same rate limiting as other login methods:
- Public endpoints: 5 attempts per 15 minutes
- IP-based tracking
- Automatic brute force protection

## Compliance

Google Sign-In implementation:
- ✅ Follows OAuth 2.0 specifications
- ✅ Uses OIDC scopes (openid, email, profile)
- ✅ Respects user privacy (minimal data collection)
- ✅ GDPR compliant (user consent required)
- ✅ Audit logging for all Google login events
- ✅ Session security with device fingerprinting

## Next Steps

After setting up Google Sign-In:
1. Test thoroughly in development environment
2. Deploy to production with production credentials
3. Monitor audit logs for Google login events
4. Consider adding additional social providers (Apple, GitHub, etc.)
5. Update privacy policy to mention Google Sign-In

## Support

For Google OAuth issues:
- Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
- Google Cloud Support: https://cloud.google.com/support
- SSO Service Issues: Check audit logs at `/api/admin/audit-logs`

For SSO-specific questions, refer to:
- `README.md` - Main documentation
- `ARCHITECTURE.md` - System architecture
- `docs/THIRD_PARTY_INTEGRATION_GUIDE.md` - OAuth integration guide
