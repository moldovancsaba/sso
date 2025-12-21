# Facebook Login Setup Guide

Version: 5.26.0
Last Updated: 2025-12-21

This guide explains how to configure Facebook Login for your SSO service.

## Overview

Facebook Login allows users to authenticate using their Facebook accounts. The implementation follows the OAuth 2.0 authorization code flow and automatically links or creates user accounts based on email addresses.

## Prerequisites

- Facebook account
- Access to Facebook Developer Console
- SSO service deployed and accessible via HTTPS

## Step 1: Create Facebook App

1. Go to [Facebook Developer Console](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Consumer** as app type
4. Click **Next**

### Fill in app details:
- **App name**: `Your SSO Service Name`
- **App contact email**: Your email address
- **Business Account**: (Optional) Select if you have one
5. Click **Create App**

## Step 2: Configure Facebook Login Product

1. In your app dashboard, find **Facebook Login** product
2. Click **Set Up**
3. Select **Web** as platform
4. Enter your Site URL: `https://sso.doneisbetter.com`
5. Click **Save** → **Continue**

## Step 3: Configure OAuth Redirect URIs

1. In left sidebar, go to **Facebook Login** → **Settings**
2. Find **Valid OAuth Redirect URIs**
3. Add these URIs:
   - `https://sso.doneisbetter.com/api/auth/facebook/callback`
   - `http://localhost:3000/api/auth/facebook/callback` (for development)
4. Click **Save Changes**

## Step 4: Configure App Settings

1. Go to **Settings** → **Basic** in left sidebar
2. Note your **App ID** and **App Secret** (click Show to reveal)
3. Scroll down to **App Domains**
4. Add: `doneisbetter.com`
5. Add **Privacy Policy URL**: `https://sso.doneisbetter.com/privacy`
6. Add **Terms of Service URL**: `https://sso.doneisbetter.com/terms`
7. Select **Category**: Choose appropriate category (e.g., "Business")
8. Click **Save Changes**

## Step 5: Configure Data Access Permissions

### User Data Permissions:

1. In left sidebar, go to **App Review** → **Permissions and Features**
2. Request these permissions (if not already approved):
   - `email` - **Required** for account linking
   - `public_profile` - Basic profile information (name, picture)

**Note**: `email` and `public_profile` are approved by default for development. For production, you may need to submit for App Review.

## Step 6: App Mode Settings

### Development Mode (Testing):
- App is automatically in **Development Mode** when created
- Only developers, testers, and admins can authenticate
- Add test users in **Roles** → **Test Users** if needed

### Production Mode (Go Live):
1. Complete all required setup in **App Review** → **Requests**
2. Provide required information:
   - Privacy Policy URL
   - Terms of Service URL
   - App Icon (1024x1024px)
   - Business verification (if required)
3. Switch to **Live Mode** in **Settings** → **Basic**

## Step 7: Get App Credentials

1. Go to **Settings** → **Basic**
2. Copy **App ID**
3. Click **Show** next to **App Secret** and copy it
4. **IMPORTANT**: Keep App Secret secure - never commit to Git

## Step 8: Configure Environment Variables

Add these to your `.env` file or Vercel environment variables:

```bash
# Facebook OAuth Configuration
FACEBOOK_APP_ID=your-app-id-here
FACEBOOK_APP_SECRET=your-app-secret-here
FACEBOOK_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/facebook/callback
```

**Development Environment:**
```bash
FACEBOOK_APP_ID=your-app-id-here
FACEBOOK_APP_SECRET=your-app-secret-here
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback
```

## Step 9: Deploy Configuration

### Local Development:
1. Update `.env` file with Facebook credentials
2. Restart dev server: `npm run dev`
3. Navigate to login page and test "Continue with Facebook" button

### Production (Vercel):
1. Go to Vercel Project Settings → Environment Variables
2. Add the three Facebook OAuth variables
3. Redeploy your application

## Step 10: Test Facebook Login

1. Navigate to login page: `https://sso.doneisbetter.com/login`
2. Click "Continue with Facebook" button
3. Login with Facebook account (if not already logged in)
4. Review and accept permissions
5. You should be redirected back and logged in

## How It Works

### User Flow:
1. User clicks "Continue with Facebook" button on login page
2. User is redirected to Facebook's authorization page
3. User logs in (if needed) and grants permissions
4. Facebook redirects back to `/api/auth/facebook/callback` with authorization code
5. SSO exchanges code for access token
6. SSO fetches user profile from Facebook Graph API
7. SSO checks if user exists by email:
   - **Existing user**: Links Facebook account to existing user
   - **New user**: Creates new user with Facebook profile data
8. SSO creates session and redirects to home page or OAuth flow

### Data Stored:

User document with Facebook social provider data:
```javascript
{
  id: "uuid-here",
  email: "user@email.com",
  name: "John Doe",
  emailVerified: true,
  socialProviders: {
    facebook: {
      id: "facebook-user-id",
      email: "user@email.com",
      name: "John Doe",
      picture: "https://graph.facebook.com/v18.0/facebook-user-id/picture",
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
- **OAuth Flow Context**: Preserves OAuth authorization flow when user logs in via Facebook during client app authorization
- **Email Verification**: Facebook-verified emails are marked as verified
- **Account Linking**: Automatically links Facebook account to existing user with same email
- **Session Security**: HttpOnly cookies with Domain attribute for subdomain SSO
- **App Secret Security**: Never expose App Secret in client-side code

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: The redirect URI in your request doesn't match any authorized redirect URIs in Facebook App settings.

**Fix**:
1. Check the exact redirect URI in browser URL when error occurs
2. Go to Facebook Developer Console → Your App → Facebook Login → Settings
3. Add the exact redirect URI to **Valid OAuth Redirect URIs**
4. Click **Save Changes** and wait a few minutes

### Error: "access_denied" or user canceled
**Cause**: User clicked "Cancel" or declined permissions on Facebook consent screen.

**Fix**: User needs to try again and grant permissions. If they previously declined, they may need to remove the app from their Facebook settings first.

### Error: "invalid_client" or "invalid_app_id"
**Cause**: App ID or App Secret is incorrect.

**Fix**:
1. Verify `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in environment variables
2. Check App ID and Secret in Facebook Developer Console → Settings → Basic
3. Regenerate App Secret if needed (requires re-deployment)

### Error: "(#200) Requires extended permission: email"
**Cause**: Email permission not granted or user's Facebook account doesn't have email.

**Fix**:
1. Ensure email permission is requested in OAuth URL
2. User must have verified email address on Facebook account
3. If App Review is pending, email permission may be restricted

### Facebook profile missing email
**Cause**: User's Facebook account doesn't have a verified email, or email permission not granted.

**Fix**:
1. Ensure `email` permission is included in OAuth request
2. User must have verified email address on Facebook account
3. Some Facebook accounts (created via phone) may not have email - handle gracefully

### Users not seeing Facebook button
**Cause**: Missing environment variables or dev server needs restart.

**Fix**:
1. Verify all three Facebook OAuth environment variables are set
2. Restart development server: `npm run dev`
3. Clear browser cache and reload page
4. Check browser console for JavaScript errors

### Error: "App Not Setup: This app is still in development mode"
**Cause**: App is in Development Mode and current user is not a developer/tester/admin.

**Fix**:
1. Add user as Test User in Facebook Developer Console → Roles → Test Users
2. OR switch app to Live Mode (requires App Review completion)

### Graph API version errors
**Cause**: Using outdated or deprecated Graph API version.

**Fix**:
1. Current implementation uses Graph API v18.0
2. Update API version in `pages/api/auth/facebook/callback.js` if needed
3. Check [Facebook Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog) for breaking changes

## Admin Dashboard

Facebook login users appear in the admin dashboard (`/admin/users`) with a "Facebook" badge next to their email. You can:
- View Facebook account linkage
- See last login time via Facebook
- Manage app permissions for Facebook users
- All standard user management features apply

## OAuth Client Apps

When Facebook users authenticate via OAuth client applications:
1. User logs in with Facebook
2. Facebook profile is linked/created
3. OAuth flow continues automatically
4. Client app receives authorization code
5. User is logged into both SSO and client app

## Rate Limiting

Facebook login endpoints are subject to the same rate limiting as other login methods:
- Public endpoints: 5 attempts per 15 minutes
- IP-based tracking
- Automatic brute force protection

## Facebook Graph API

The implementation uses Facebook Graph API to fetch user profile:

**Endpoint**: `https://graph.facebook.com/v18.0/me`

**Fields requested**: 
- `id` - Facebook user ID
- `email` - User's email address
- `name` - User's full name
- `picture` - Profile picture URL

**Token exchange endpoint**: `https://graph.facebook.com/v18.0/oauth/access_token`

## Compliance

Facebook Login implementation:
- ✅ Follows OAuth 2.0 specifications
- ✅ Complies with Facebook Platform Policy
- ✅ Respects user privacy (minimal data collection)
- ✅ GDPR compliant (user consent required)
- ✅ Audit logging for all Facebook login events
- ✅ Session security with device fingerprinting

## Facebook Platform Policy Compliance

Ensure your app complies with [Facebook Platform Policy](https://developers.facebook.com/policy/):
- Only request permissions you actually use
- Respect user privacy and data
- Don't sell or transfer user data
- Provide clear privacy policy and terms of service
- Handle user data securely
- Respond to user data deletion requests

## Data Deletion Callback (Optional)

Facebook requires apps to provide a data deletion callback URL or instructions:

1. Go to **App Review** → **Data Deletion Instructions URL**
2. Option A: Provide callback URL: `https://sso.doneisbetter.com/api/facebook/data-deletion`
3. Option B: Provide instructions on how users can request data deletion
4. Implement data deletion endpoint if using callback URL (not included in base implementation)

## Next Steps

After setting up Facebook Login:
1. Test thoroughly in development environment with test users
2. Complete App Review if email permission not yet approved
3. Switch to Live Mode when ready for production
4. Monitor audit logs for Facebook login events
5. Keep Facebook Graph API version updated
6. Update privacy policy to mention Facebook Login

## Support

For Facebook OAuth issues:
- Facebook Login Documentation: https://developers.facebook.com/docs/facebook-login
- Facebook Graph API Documentation: https://developers.facebook.com/docs/graph-api
- Facebook Developer Support: https://developers.facebook.com/support
- SSO Service Issues: Check audit logs at `/api/admin/audit-logs`

For SSO-specific questions, refer to:
- `README.md` - Main documentation
- `ARCHITECTURE.md` - System architecture
- `docs/THIRD_PARTY_INTEGRATION_GUIDE.md` - OAuth integration guide
- `docs/GOOGLE_LOGIN_SETUP.md` - Similar setup for Google Sign-In
