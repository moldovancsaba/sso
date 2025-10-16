# Release Notes [![Version Badge](https://img.shields.io/badge/version-5.5.0-blue)](RELEASE_NOTES.md)

## [v5.9.0] — 2025-10-12T14:07:00.000Z

### 🎯 User Account Management & Session Improvements

**MAJOR FEATURE**: Comprehensive user account management page with profile editing, password management, OAuth service revocation, and account deletion.

#### New Features

**1. User Account Dashboard** (`/account`)
- **Profile Management**: Edit name, view email (read-only)
- **Connected Services**: View all OAuth apps with access to your account
  - See grant date and scopes
  - One-click revoke access for any service
- **Security**: Change password with current password verification
- **Account Deletion**: Permanently delete account with email confirmation
  - Cascades deletion across all collections (sessions, tokens, authorizations)
  - GDPR compliant

**2. Sliding Sessions (30 Days)**
- Session duration extended from 7 to 30 days
- **Sliding expiration**: Session extends automatically on each access
- Users stay logged in as long as they're active
- Applies to both admin and public users

**3. Automatic Redirect to Account Page**
- After successful login, users are redirected to `/account` instead of homepage
- Direct access to account management features
- PIN verification also redirects to account page

#### Critical Bug Fixes

**Session Validation Fixed**
- **Issue**: Users couldn't access `/account` page after login - redirected back to login
- **Root Cause**: Sessions were created with MongoDB ObjectId (`user._id`) instead of UUID (`user.id`)
- **Fix**: Login endpoint now:
  1. Checks if user has UUID identifier
  2. Automatically adds UUID to legacy users without one
  3. Creates session with UUID instead of ObjectId
  4. Works for both PIN and non-PIN flows
- **Impact**: Account page now works correctly with server-side session validation

**Account Page Server-Side Rendering**
- Converted `/account` from client-side to server-side rendering (SSR)
- Session validated before page loads (no flickering)
- Automatic redirect to login if not authenticated
- User data pre-loaded for instant display

#### New API Endpoints

**Account Management**:
- `PATCH /api/public/profile` — Update user profile (name)
- `POST /api/public/change-password` — Change password securely
- `DELETE /api/public/account` — Delete account permanently
- `GET /api/public/authorizations` — List OAuth authorizations
- `DELETE /api/public/authorizations/[id]` — Revoke service access

**Session Management**:
- `GET /api/public/session` — Check session status

#### Technical Improvements

**UUID User Identifiers**
- All public users now use UUID as primary identifier (`user.id`)
- MongoDB `_id` retained for database compatibility
- Automatic UUID backfill for legacy users on login
- Session system uses UUID for user lookups

**Session Architecture**
- Sliding expiration updates `expiresAt` on each access
- Sessions stored in MongoDB with TTL indexes
- Cookie `maxAge` set to 30 days
- Both admin and public sessions use sliding model

**Homepage Improvements**
- "My Account" button for logged-in users
- Recognizes both admin and public sessions
- Cleaner navigation flow

#### Files Changed

**New Files**:
- `pages/account.js` — User account management dashboard
- `pages/api/public/profile.js` — Profile update endpoint  
- `pages/api/public/change-password.js` — Password change endpoint
- `pages/api/public/account.js` — Account deletion endpoint
- `pages/api/public/authorizations/index.js` — List authorizations
- `pages/api/public/authorizations/[id].js` — Revoke authorization

**Modified**:
- `pages/api/public/login.js` — UUID identifier support
- `lib/publicSessions.mjs` — Sliding session expiration
- `lib/sessions.mjs` — Admin sliding sessions
- `lib/auth.mjs` — Extended admin session to 30 days
- `pages/index.js` — Added account page link
- `pages/login.js` — Redirect to account page after login

---

## [v5.9.0] — 2025-01-13T23:45:00.000Z

### 🔐 OAuth Flow Fix: Preserve Authorization Context During Admin Login

**CRITICAL BUG FIX**: Fixed OAuth authorization flow breaking when users needed to log into SSO admin during client authorization.

#### What Was Broken

When an OAuth client initiated authorization:
1. Client redirected to `/api/oauth/authorize?client_id=...&redirect_uri=...`
2. SSO saw user wasn't authenticated
3. Redirected to `/admin?oauth_request=[base64-encoded-request]`
4. User logged into admin panel
5. **BUG**: After login, page stayed on `/admin` without `oauth_request` parameter
6. OAuth flow was lost - no way to continue authorization

#### The Fix

**Modified**: `pages/admin/index.js`
- Added `useRouter` hook to access URL query parameters
- Added `useEffect` hook that monitors both `admin` state and `oauth_request` parameter
- When user is authenticated AND `oauth_request` exists:
  - Display message: "Redirecting to complete OAuth authorization..."
  - Redirect to `/api/oauth/authorize?oauth_request=[encoded-request]`
  - Authorization endpoint reconstructs original request and continues flow

#### Technical Details

```javascript
// WHAT: Check if there's an oauth_request parameter after login
// WHY: When users are redirected to admin login during OAuth flow, 
//      we need to continue the OAuth authorization after they log in
useEffect(() => {
  const oauthRequest = router.query.oauth_request
  if (admin && oauthRequest) {
    // User is now logged in and we have an OAuth request to complete
    setMessage('Redirecting to complete OAuth authorization...')
    // Redirect back to the OAuth authorize endpoint with the original request
    window.location.href = `/api/oauth/authorize?oauth_request=${encodeURIComponent(oauthRequest)}`
  }
}, [admin, router.query.oauth_request])
```

#### Complete OAuth Flow (Now Fixed)

1. Client: `GET /api/oauth/authorize?client_id=...&redirect_uri=...&scope=...`
2. SSO: User not authenticated → `302 /admin?oauth_request=[base64]`
3. User: Logs into admin panel
4. **NEW**: Admin page detects `oauth_request` parameter
5. **NEW**: Auto-redirects to `/api/oauth/authorize?oauth_request=[base64]`
6. SSO: User now authenticated → Shows authorization consent page
7. User: Approves authorization
8. SSO: Generates authorization code → `302 [client_redirect_uri]?code=...&state=...`
9. Client: Exchanges code for tokens via `/api/oauth/token`
10. ✅ OAuth flow complete

#### Impact

- **Before**: OAuth authorization broken when admin login required
- **After**: Seamless OAuth flow even when authentication needed
- **Benefit**: External clients can now successfully integrate with SSO

#### Files Modified

- `pages/admin/index.js` (+15 lines) - OAuth redirect logic
- `package.json` - Version bump to 5.4.0

---

## [v5.9.0] — 2025-10-06T21:30:00.000Z

### 🎉 All Authentication Features Complete + PKCE Flexibility

**MAJOR FEATURE RELEASE**: Completed all three authentication features (PIN verification, Magic Links, Forgot Password) and added flexible PKCE configuration for OAuth clients.

#### Added

**Feature 1: Random PIN Verification** (COMPLETE - 100%):
- `pages/api/admin/verify-pin.js` (116 lines) - Admin PIN verification endpoint:
  - Validates 6-digit PIN sent via email
  - Creates session on successful verification
  - 3 attempts maximum before PIN expires
- `pages/api/public/verify-pin.js` (104 lines) - Public user PIN verification
- `pages/api/public/login.js` (169 lines) - Public user login with PIN integration:
  - Complete authentication flow
  - Bcrypt password verification
  - Email verification check
  - Login count tracking
  - PIN trigger logic
- Beautiful PIN verification modal UI in `pages/login.js`:
  - Full-screen overlay with clean design
  - 6-digit input with auto-validation
  - Monospace font for easy reading
  - Error handling and loading states
  - Enter key support for quick submission
  - Cancel button

**How PIN Verification Works**:
1. User enters email + password successfully
2. Login count increments (tracked in database)
3. Random trigger between 5th-10th login:
   - 30% chance on logins 5-9
   - Always on 10th login
   - Resets after 10th
4. If triggered:
   - Generate 6-digit PIN
   - Store in MongoDB (5-minute TTL)
   - Send email with `buildLoginPinEmail()`
   - Show PIN modal
5. User enters PIN
6. Verify via `/api/*/verify-pin`
7. Create session and redirect

**Feature 2: Magic Link Authentication** (COMPLETE - 100%):
- `pages/api/admin/request-magic-link.js` - Request magic link for admin
- `pages/api/admin/magic-login.js` - Verify and auto-login via magic link
- `pages/api/public/request-magic-link.js` - Request magic link for public users
- `pages/api/public/magic-login.js` - Verify and auto-login public users
- Beautiful "Login with Magic Link" buttons on both login pages
- Separate token collections: `adminMagicTokens`, `publicMagicTokens`
- HMAC-SHA256 signed tokens
- 15-minute expiration
- Single-use enforcement
- Email template: `buildMagicLinkEmail()`

**PKCE Optional Implementation** (OAuth2 Flexibility):
- Added `require_pkce` field to OAuth client schema (default: `false`):
  - Confidential clients (server-side): Can skip PKCE
  - Public clients (mobile/SPA): Require PKCE for security
- Updated `lib/oauth/clients.mjs`:
  - `require_pkce` field in client registration
  - Field can be updated via API
- Updated `lib/oauth/codes.mjs`:
  - `code_challenge` and `code_challenge_method` now optional
  - Validation only runs if PKCE provided
- Updated `pages/api/oauth/authorize.js`:
  - Checks client's `require_pkce` setting
  - Conditionally enforces PKCE parameters
- Updated `pages/api/oauth/token.js`:
  - `code_verifier` now optional
  - Validation based on authorization code's PKCE usage
- Migration script: `scripts/migrations/2025-10-06-add-require-pkce-field.mjs`
  - Updates all existing OAuth clients to `require_pkce: false`
- Comprehensive documentation:
  - `PKCE_SOLUTION.md` - Implementation summary
  - `docs/PKCE_CONFIGURATION.md` - Full configuration guide

#### Changed

- **Admin Login** (`pages/api/admin/login.js`):
  - Integrated PIN verification logic
  - Tracks login count in `users.loginCount`
  - Issues PIN when `shouldTriggerPin()` returns true
  - Returns `{requiresPin: true}` when PIN needed
- **Public Login Page** (`pages/login.js`):
  - Added PIN modal UI (160+ lines)
  - Added magic link button and handler
  - Handle `requiresPin` response from login API
  - PIN verification flow with `/api/public/verify-pin`
- **Admin Login Page** (`pages/admin/index.js`):
  - Added magic link button
  - Magic link request handler
  - Success message display
- **Email Templates** (`lib/emailTemplates.mjs`):
  - Added `buildMagicLinkEmail()` - Magic link email template
  - Login PIN email already added in v5.9.0

#### Database Schema

**New Fields**:
```javascript
// users collection (admin)
{
  loginCount: Number,      // Tracks login count for PIN trigger
  lastLoginAt: String      // ISO timestamp of last login
}

// publicUsers collection
{
  loginCount: Number,      // Tracks login count for PIN trigger
  lastLoginAt: String      // ISO timestamp of last login
}

// oauthClients collection
{
  require_pkce: Boolean    // Whether PKCE is required (default: false)
}
```

**New Collections**:
- `loginPins` - Active PINs with TTL:
  - pin, userId, email, userType, verified, attempts
  - TTL index on `expiresAt` (5 minutes)
  - Lookup index on `{userId, userType, verified}`
- `adminMagicTokens` - Admin magic link tokens:
  - jti, email, createdAt, exp, usedAt
  - TTL index for automatic cleanup
- `publicMagicTokens` - Public user magic link tokens:
  - Same structure as adminMagicTokens

#### Security Features

- ✅ **PIN Security**:
  - 5-minute TTL (expires quickly)
  - 3 attempts maximum
  - Single-use enforcement
  - MongoDB TTL automatic cleanup
  - Cryptographically secure random generation
- ✅ **Magic Link Security**:
  - HMAC-SHA256 signed tokens
  - 15-minute expiration
  - Single-use enforcement (marked as used)
  - Email verification check for public users
- ✅ **PKCE Flexibility**:
  - Server-side clients don't need PKCE overhead
  - Public clients still protected with PKCE
  - Per-client configuration
  - Backward compatible (existing clients work)

#### User Experience

**PIN Verification Flow**:
1. Login normally with password
2. On random trigger (5th-10th login):
   - "Check your email" message
   - Beautiful modal appears
3. Enter 6-digit PIN from email
4. Instant verification
5. Auto-redirect to dashboard

**Magic Link Flow**:
1. Click "Login with Magic Link" button
2. Enter email
3. Check email for magic link
4. Click link
5. Instantly logged in and redirected

**PKCE Configuration**:
- Confidential clients: No code changes needed
- Public clients: Implement PKCE for security
- Easy API update to change `require_pkce` setting

#### Files Summary

**Created** (13 files):
- 4 API endpoints for PIN verification
- 4 API endpoints for magic links
- 1 migration script
- 2 documentation files
- 2 solution summaries

**Modified** (7 files):
- 3 login-related files
- 4 OAuth/PKCE files

**Total**: 1,400+ lines of new code

---

## [v5.9.0] — 2025-10-06T11:22:25.000Z

### 🎉 New Authentication Features: Forgot Password + Email System

**FEATURE RELEASE**: Major enhancement to authentication system with email-based password recovery and foundation for additional auth methods.

#### Added

**Email Infrastructure** (3 library modules):
- `lib/email.mjs` (323 lines) - Dual email provider system:
  - Primary: Nodemailer (Google Workspace SMTP)
  - Fallback: Resend
  - Automatic retry and failover
  - Comprehensive logging
  - Email verification
- `lib/emailTemplates.mjs` (300+ lines) - Email template system:
  - Password reset emails
  - Email verification
  - **Forgot password emails** (NEW)
  - Login PIN emails (foundation)
  - Magic link emails (coming soon)
  - Consistent formatting and security warnings
- `lib/passwordGenerator.mjs` (71 lines) - Secure password generation:
  - Admin: 32-hex tokens (crypto.randomBytes)
  - Public/Org: 16-char strong passwords (mixed characters)
  - Cryptographically secure random generation

**Forgot Password Feature** (COMPLETE):
- `pages/api/admin/forgot-password.js` - Admin forgot password endpoint:
  - Generates new 32-hex password
  - Updates database
  - Sends password via email
  - Security: Always returns success (prevents email enumeration)
- `pages/api/public/forgot-password.js` - Public forgot password endpoint:
  - Generates new strong password
  - Uses bcrypt for hashing
  - Sends password via email
  - Same security measures as admin
- `pages/admin/forgot-password.js` - Admin forgot password UI:
  - Clean dark theme matching admin panel
  - Email input with validation
  - Success confirmation
  - Security notes and warnings
- `pages/forgot-password.js` - Public forgot password UI:
  - Beautiful gradient design
  - User-friendly messaging
  - Clear instructions
  - What happens next explanation
- `lib/publicUsers.mjs` - Added `updatePublicUserPassword()` function

**UI/UX Improvements**:
- Added "Forgot password?" link to admin login page
- Added "Forgot password?" link to public login page
- Links only show when not in dev bypass mode
- Consistent styling across all forgot password flows

**PIN Verification Foundation** (40% complete):
- `lib/loginPin.mjs` (171 lines) - PIN generation and validation:
  - 6-digit random PINs
  - 5-minute TTL
  - 3 attempts maximum
  - Random trigger logic (5th-10th login)
  - MongoDB TTL indexes
- PIN email template in `lib/emailTemplates.mjs`

**Public User Authentication** (from v5.9.0 merge):
- `lib/publicUsers.mjs` - Public user management
- `lib/publicSessions.mjs` - Public user sessions
- `pages/login.js` - Public login page
- `pages/register.js` - Public registration page
- `pages/demo.js` - Demo/dashboard page

**MongoDB Collections** (new):
- `publicUsers` - Public user accounts:
  - Email, passwordHash (bcrypt), name, role, status
  - UUID identifiers
  - emailVerified, lastLoginAt timestamps
- `publicSessions` - Public user sessions:
  - Session tokens, user references
  - TTL indexes for auto-cleanup
- `loginPins` - PIN verification (foundation):
  - PIN, userId, userType, verified, attempts
  - TTL index for 5-minute expiry

#### Changed
- Updated `pages/admin/index.js`:
  - Fixed dev bypass validation (only requires email)
  - Added "Forgot password?" link
- Updated `pages/login.js`:
  - Added "Forgot password?" link
  - Improved form handling

#### Environment Variables (New)
```bash
# Email Configuration
EMAIL_PROVIDER=nodemailer              # nodemailer | resend
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=your-app-password
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=notifications@yourdomain.com
EMAIL_FROM_NAME=SSO Service

# Token Lifetimes
PASSWORD_RESET_TOKEN_TTL=900          # 15 minutes
EMAIL_VERIFICATION_TOKEN_TTL=86400     # 24 hours
```

#### Dependencies Added
- `nodemailer@7.0.6` - Email sending (Google Workspace)
- `resend@6.1.2` - Alternative email provider
- `winston@3.18.3` - Structured logging

#### Security Features
- ✅ **Email Enumeration Protection**: Always returns success for forgot password
- ✅ **Secure Password Generation**: Cryptographically secure random passwords
- ✅ **Comprehensive Logging**: All auth events logged with timestamps
- ✅ **Bcrypt Hashing**: Public user passwords hashed with 12 rounds
- ✅ **Email Verification**: Foundation for email ownership verification

#### User Experience
- **Forgot Password Flow**:
  1. User clicks "Forgot password?" link
  2. Enters email address
  3. Receives auto-generated secure password via email
  4. Can log in immediately
  5. Encouraged to change password after login
- Clear security warnings in UI
- Professional email templates
- Consistent branding across all pages

#### What's Next (In Progress)
- **Feature 2**: Magic link authentication for all user types (~60% complete)
- **Feature 1**: PIN verification with random 2FA (~40% complete)
- Email verification complete flow
- Password change UI

---

## [v5.9.0] — 2025-10-03T09:15:22.000Z

### 🚀 Phase 2: Complete OAuth2/OIDC Authorization Server Implementation

**BREAKING CHANGE**: Major OAuth2/OIDC authorization server implementation for external domain SSO.

#### Added

**OAuth2 Core Infrastructure** (5 library modules):
- `lib/oauth/clients.mjs` (393 lines) - OAuth client registration and management:
  - CRUD operations for OAuth clients (client_id, hashed client_secret)
  - Client validation, activation/suspension
  - Redirect URI and allowed scope management
  - Bcrypt-hashed client secrets (salt rounds: 12)
- `lib/oauth/codes.mjs` (388 lines) - Authorization code handling:
  - Short-lived codes (10 minutes) with PKCE support
  - Code generation, validation, single-use consumption
  - TTL index for automatic cleanup
  - State parameter storage (CSRF protection)
- `lib/oauth/tokens.mjs` (591 lines) - JWT and refresh token management:
  - RS256 JWT access token generation (1 hour lifetime)
  - OIDC ID token generation with user claims
  - Refresh token generation with SHA-256 hashing (30 days)
  - Automatic token rotation on refresh
  - Token revocation support
- `lib/oauth/scopes.mjs` (412 lines) - Scope definitions and validation:
  - Standard OIDC scopes: `openid`, `profile`, `email`, `offline_access`
  - App-specific scopes: Narimato (`read:cards`, `write:cards`, `read:rankings`)
  - App-specific scopes: CardMass (`read:decks`, `write:decks`)
  - App-specific scopes: PlayMass (`read:games`, `write:games`)
  - Scope validation, filtering, and description helpers
- `lib/oauth/jwks.mjs` (57 lines) - JWK conversion utility:
  - RSA PEM to JWK format conversion
  - Public key distribution for JWT signature verification

**OAuth2 API Endpoints** (10 routes):
- `GET /api/oauth/authorize` - Authorization endpoint:
  - PKCE validation (code_challenge, code_challenge_method: S256/plain)
  - State parameter validation (CSRF protection)
  - Client validation and status checking
  - Redirect URI exact match validation
  - Scope validation against client allowed_scopes
  - User authentication check (redirect to /admin if needed)
  - Consent checking (redirect to /oauth/consent if needed)
  - Authorization code generation and callback redirect
- `POST /api/oauth/token` - Token endpoint:
  - Grant types: `authorization_code`, `refresh_token`
  - Authorization code validation with PKCE verification (code_verifier)
  - Client authentication via client_secret
  - JWT access token generation (RS256, 1 hour)
  - OIDC ID token generation with user claims
  - Refresh token generation (SHA-256 hashed, 30 days)
  - Automatic refresh token rotation
  - Comprehensive error handling per OAuth2 spec
- `POST /api/oauth/revoke` - Token revocation endpoint:
  - Revokes access tokens and refresh tokens
  - Always returns 200 OK per RFC 7009
  - Client authentication required
- `POST /api/oauth/introspect` - Token introspection endpoint:
  - Validates access tokens and returns metadata
  - Returns `active`, `scope`, `client_id`, `token_type`, `exp`, `iat`
  - Client authentication required
- `GET /api/oauth/consent` - Consent page data endpoint
- `POST /api/oauth/authorize/approve` - Consent approval handler:
  - Stores user consent decision
  - Generates authorization code
  - Redirects to client callback with code and state

**OIDC Discovery and JWKS** (2 endpoints):
- `GET /.well-known/openid-configuration` - OIDC discovery document:
  - Complete metadata: endpoints, grant types, scopes, response types
  - Signing algorithms: RS256
  - PKCE methods: S256, plain
  - Claims supported: `sub`, `name`, `email`, `email_verified`, `updated_at`
  - Cache-Control: 24 hours
- `GET /.well-known/jwks.json` - Public key distribution:
  - RSA public key in JWK format
  - Clients use this to verify JWT signatures
  - Cache-Control: 24 hours

**Admin OAuth Client Management** (3 UI + 2 API routes):
- `GET /api/admin/oauth-clients` - List all OAuth clients
- `POST /api/admin/oauth-clients` - Create new client (super-admin only)
- `GET /api/admin/oauth-clients/[clientId]` - Get client details
- `PATCH /api/admin/oauth-clients/[clientId]` - Update client
- `DELETE /api/admin/oauth-clients/[clientId]` - Delete client
- `pages/admin/oauth-clients.js` (392 lines) - Admin UI:
  - Client creation form with name, redirect URIs, allowed scopes
  - Client secret display (shown once after creation)
  - Client listing with status badges
  - Suspend/activate functionality
  - Delete with confirmation modal
  - Copy client_id to clipboard
  - Super-admin only for create/delete operations

**User Consent Flow** (2 UI pages):
- `pages/oauth/consent.js` (295 lines) - Beautiful consent UI:
  - Client name and logo display
  - Scope details grouped by category (Identity, Email, Offline Access, App-Specific)
  - Approve/Deny buttons
  - User session validation
  - Redirect back to authorization flow

**MongoDB Collections** (4 new):
- `oauthClients` - OAuth client registrations:
  - Fields: `clientId`, `clientSecret` (bcrypt), `name`, `redirectUris`, `allowedScopes`, `status`, `createdAt`, `updatedAt`
  - Unique index: `clientId`
- `authorizationCodes` - Short-lived authorization codes:
  - Fields: `code`, `clientId`, `userId`, `redirectUri`, `scope`, `codeChallenge`, `codeChallengeMethod`, `state`, `expiresAt`, `consumed`, `createdAt`
  - Unique index: `code`
  - TTL index: `expiresAt` (auto-delete after 10 minutes)
- `refreshTokens` - Long-lived refresh tokens:
  - Fields: `token` (SHA-256), `clientId`, `userId`, `scope`, `expiresAt`, `revoked`, `rotationChain` (parent token tracking), `createdAt`, `lastUsedAt`
  - Unique index: `token`
  - TTL index: `expiresAt` (auto-delete after 30 days)
- `userConsents` - User consent decisions:
  - Fields: `userId`, `clientId`, `scope`, `granted`, `expiresAt`, `createdAt`, `updatedAt`
  - Composite unique index: `userId + clientId`
  - TTL index: `expiresAt` (optional expiration)

**Cryptographic Infrastructure**:
- RSA key pair generated (2048-bit) in `keys/` directory:
  - `keys/private.pem` - Private key for JWT signing (git-ignored)
  - `keys/public.pem` - Public key for JWT verification (git-ignored)
- Added `keys/` to `.gitignore`

**Documentation** (3 comprehensive guides):
- `PHASE2_PLAN.md` (444 lines) - Complete architecture and implementation plan:
  - System overview and data model
  - OAuth2 flow diagrams
  - Security considerations
  - Implementation checklist
- `OAUTH2_SETUP_GUIDE.md` (451 lines) - Setup and testing guide:
  - Database schema definitions
  - Environment variable configuration
  - Key generation instructions
  - Manual testing procedures
  - Troubleshooting guide
- `OAUTH2_INTEGRATION.md` (676 lines) - Client integration guide:
  - Complete OAuth2 flow examples
  - PKCE generation code (Node.js, JavaScript)
  - Full Express.js integration example
  - Token management (refresh, revocation, introspection)
  - Security best practices
  - API reference for all endpoints
  - Troubleshooting common issues

#### Changed
- Updated `pages/admin/index.js` to add "OAuth Clients" navigation link
- Updated `.env.example` with OAuth2 configuration variables
- Updated `WARP.md` with OAuth2 commands and architecture

#### Environment Variables (New)
```bash
# OAuth2/OIDC Configuration
JWT_ISSUER=https://sso.doneisbetter.com
JWT_KEY_ID=sso-2025
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# OAuth2 Token Lifetimes (in seconds)
OAUTH2_AUTHORIZATION_CODE_LIFETIME=600      # 10 minutes
OAUTH2_ACCESS_TOKEN_LIFETIME=3600           # 1 hour
OAUTH2_REFRESH_TOKEN_LIFETIME=2592000       # 30 days
OAUTH2_CONSENT_TTL=31536000                 # 1 year
```

#### Dependencies Added
- `jsonwebtoken@^9.0.0` - JWT generation and verification
- `bcrypt@^5.1.0` - Client secret hashing

#### Security Improvements
- ✅ **PKCE Required**: SHA-256 code_challenge mandatory for authorization code flow
- ✅ **State Parameter**: CSRF protection for OAuth2 flow
- ✅ **Client Secret Hashing**: Bcrypt-hashed client secrets (never stored in plaintext)
- ✅ **Refresh Token Hashing**: SHA-256 hashed refresh tokens in database
- ✅ **RS256 JWT Signatures**: Asymmetric cryptography for token signing
- ✅ **Single-Use Codes**: Authorization codes can only be consumed once
- ✅ **Automatic Token Rotation**: Refresh tokens rotated on each use
- ✅ **Token Revocation**: Revoke access and refresh tokens server-side
- ✅ **Redirect URI Validation**: Exact match validation (no wildcards)
- ✅ **Scope-Based Access Control**: Fine-grained permissions per client

#### OAuth2 Flow Architecture
```
1. External App → GET /api/oauth/authorize (with PKCE params)
2. SSO checks authentication → redirect to /admin if needed
3. SSO checks consent → redirect to /oauth/consent if needed
4. User approves → POST /api/oauth/authorize/approve
5. SSO generates authorization code → redirect to app with code + state
6. App → POST /api/oauth/token (with code + code_verifier)
7. SSO validates PKCE → returns access_token, id_token, refresh_token
8. App uses Bearer token for API calls (Authorization: Bearer <token>)
9. App refreshes → POST /api/oauth/token (refresh_token grant)
10. App revokes on logout → POST /api/oauth/revoke
```

#### Production Readiness
- Security Score: **75% → 95%**
- Subdomain SSO: ✅ Working (cardmass.doneisbetter.com, playmass.doneisbetter.com)
- External Domain SSO: ✅ Working (narimato.com via OAuth2/OIDC)
- OIDC Compliant: ✅ Full OIDC discovery and ID token support
- Build Status: ✅ All builds passing

#### Supported Applications
- **cardmass.doneisbetter.com** - Subdomain SSO via session cookies
- **playmass.doneisbetter.com** - Subdomain SSO via session cookies
- **narimato.com** - External domain SSO via OAuth2/OIDC

#### Migration Notes
1. Generate RSA key pair (see OAUTH2_SETUP_GUIDE.md)
2. Set OAuth2 environment variables (JWT_ISSUER, JWT_KEY_ID, etc.)
3. Create OAuth client for each external application via admin UI
4. Integrate external apps using OAUTH2_INTEGRATION.md guide
5. Test complete OAuth2 flow before production deployment
6. Verify OIDC discovery endpoint: `GET /.well-known/openid-configuration`

#### Files Created
- 25 files created (~5,000 lines of code)
- Core libraries: 5 modules
- API endpoints: 10 routes
- UI pages: 3 pages
- Documentation: 3 comprehensive guides
- Cryptographic keys: 2 files (git-ignored)

---

## [v5.9.0] — 2025-10-02T11:54:33.000Z

### 🔒 Phase 1: Critical Security Hardening

#### Added
- **Server-Side Session Management** (`lib/sessions.mjs`):
  - MongoDB-backed session storage in `adminSessions` collection
  - Session token hashing with SHA-256 (no raw tokens in database)
  - Server-side session validation and revocation
  - Session tracking with IP addresses and user agents
  - TTL index for automatic session expiration
  - Functions: `createSession()`, `validateSession()`, `revokeSession()`, `revokeUserSessions()`

- **Rate Limiting** (`lib/middleware/rateLimit.mjs`):
  - Login endpoint: 5 attempts per 15 minutes (brute force protection)
  - Strict rate limiter: 3 attempts per 15 minutes (magic links, sensitive operations)
  - API rate limiter: 100 requests per 15 minutes
  - Validate rate limiter: 60 requests per minute
  - Per-IP tracking with X-Forwarded-For support (Vercel/Cloudflare compatible)
  - Security event logging on rate limit exceeded

- **CSRF Protection** (`lib/middleware/csrf.mjs`):
  - Double-submit cookie pattern with HMAC signing
  - Constant-time comparison (timing attack protection)
  - 24-hour CSRF token lifetime
  - Middleware: `ensureCsrfToken()`, `validateCsrf()`, `getCsrfToken()`

- **Structured Security Logging** (`lib/logger.mjs`):
  - Winston-based logging with JSON output (production) and colored console (development)
  - Security event logging: login attempts, session creation/revocation, rate limit events
  - ISO 8601 UTC timestamps with milliseconds on all logs
  - Configurable log level via `LOG_LEVEL` environment variable

- **Documentation**:
  - `SSO_AUDIT_REPORT.md` - Complete security audit with gap analysis
  - `PHASE1_SUMMARY.md` - Implementation details and testing checklist
  - `WARP.md` - Updated operational guide

#### Changed
- **Subdomain SSO Support** (`lib/auth.mjs`):
  - Added `Domain=.doneisbetter.com` attribute to session cookies
  - Changed `SameSite=Lax` → `SameSite=None` in production
  - Added `Secure` flag in production
  - **Breaking**: Requires `SSO_COOKIE_DOMAIN` environment variable for subdomain SSO

- **Enhanced Login Endpoint** (`pages/api/admin/login.js`):
  - Integrated rate limiting middleware
  - Server-side session creation in MongoDB
  - CSRF token issuance on login
  - Comprehensive audit logging with IP and user-agent
  - Session revocation on logout
  - Returns CSRF token to client for subsequent requests

#### Security Improvements
- ✅ **Cookie Domain**: Now supports `*.doneisbetter.com` subdomain SSO
- ✅ **Session Revocation**: Stolen tokens can be invalidated server-side
- ✅ **Brute Force Protection**: Rate limiting blocks attacks at network layer
- ✅ **CSRF Protection**: Double-submit pattern prevents cross-site attacks
- ✅ **Audit Logging**: Full audit trail with structured logs
- ✅ **Session Storage**: MongoDB-backed with metadata tracking

#### Environment Variables (New)
```bash
# Required for subdomain SSO
SSO_COOKIE_DOMAIN=.doneisbetter.com

# Rate limiting (optional, defaults provided)
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=900000

# Logging (optional)
LOG_LEVEL=info
LOG_FILE_PATH=

# CSRF (optional, falls back to SESSION_SECRET)
CSRF_SECRET=<generate with: openssl rand -base64 32>
```

#### Dependencies Added
- `express-rate-limit@^7.0.0` - Rate limiting middleware
- `winston@^3.x` - Structured logging

#### Production Readiness
- Security Score: **30% → 75%**
- Subdomain SSO: ✅ Working (cardmass, playmass, etc.)
- External Domain SSO: ❌ Requires Phase 2 (OAuth2)

#### Migration Notes
1. Set `SSO_COOKIE_DOMAIN=.doneisbetter.com` in environment variables
2. Generate and set `CSRF_SECRET` (or it will use `SESSION_SECRET`)
3. Configure rate limiting if defaults don't suit your needs
4. Test login/logout flow after deployment
5. Verify cookies include correct `Domain` attribute in browser dev tools

---

## [v5.9.0] — 2025-09-17T11:43:02.000Z

### Added
- Development-only passwordless admin login:
  - NEXT_PUBLIC_ADMIN_DEV_BYPASS (client) + ADMIN_DEV_BYPASS (server) gates
  - POST/DELETE /api/admin/dev-login creates/clears session without password when enabled (non-production only)
- UI shows email-only form and warning banner when dev bypass is active

### Security
- Dev bypass is blocked in production regardless of flags; route returns 403

---

## [v5.9.0] — 2025-09-16T18:14:33.000Z

### Added
- Secure, single-use, time-limited admin magic link flow:
  - GET /api/admin/magic-link?t=... consumes a signed token, sets session cookie, redirects to /admin
  - scripts/generate-magic-link.mjs to generate one-time URLs
  - ADMIN_MAGIC_SECRET signing key; optional ADMIN_MAGIC_ALLOWED_EMAILS allowlist

### Changed
- Documentation updated with Magic Link usage

---

## [v5.9.0] — 2025-09-15T18:25:45.000Z

### Changed
- MongoDB client now uses fast-fail timeouts (serverSelection/connect/socket) to surface 503 quickly when DB is unreachable.
- Admin login and session validation now map DB config/availability issues to 503 with clear messages.

### Documentation
- Version sync across README, ARCHITECTURE, ROADMAP, TASKLIST, LEARNINGS.

---

## [v5.9.0] — 2025-09-15T17:36:07.000Z

### Changed
- MongoDB client initialization is now lazy in serverless functions to prevent import-time crashes (avoids “Empty reply from server”).
- Admin login/validate endpoints return stable HTTP errors if database env is missing.

### Documentation
- Synchronized versions across README, ARCHITECTURE, ROADMAP, TASKLIST, LEARNINGS.

---

## [v5.9.0] — 2025-09-14T08:25:57.000Z

### Added
- UUIDs as the primary identifier for admin users (with backfill for legacy users)
- Sparse-unique index on users.id for fast UUID lookups
- Organizations (UUID) admin endpoints:
  - GET/POST /api/admin/orgs
  - GET/PATCH/DELETE /api/admin/orgs/[id]
- Organization Users (UUID) admin endpoints:
  - GET/POST /api/admin/orgs/[orgId]/users
  - GET/PATCH/DELETE /api/admin/orgs/[orgId]/users/[id]
- tools/backfill-user-uuids.mjs utility

### Changed
- Admin session tokens now carry userId as UUID
- Admin users CRUD responses prefer UUID id (fallback to legacy _id only if needed)
- RBAC clarified: super-admin full access; admin read-only for org/org-user routes unless permissioned

---

## [v5.9.0] — 2025-09-11T14:28:29.000Z

### Added
- Admin login UI at /admin (email + 32‑hex token) with session display and logout
- Homepage updated to link to Admin Login and show current admin session state

### Changed
- Removed legacy username sign-in UI from homepage

---

## [v5.9.0] — 2025-09-11T13:57:38.000Z

### Changed
- Version bump to align with commit protocol; no functional changes since v5.9.0

## [v5.9.0] — 2025-09-11T13:35:02.000Z

### Added
- DB-backed admin authentication with HttpOnly cookie session (admin-session)
- New admin endpoints:
  - POST /api/admin/login (email + token)
  - DELETE /api/admin/login (logout)
  - GET/POST /api/admin/users (list/create)
  - GET/PATCH/DELETE /api/admin/users/[id] (manage)
- Resource password service with admin-session bypass and usage tracking:
  - POST /api/resource-passwords (generate/retrieve + shareable link)
  - PUT /api/resource-passwords (validate password)
- CORS helper and deployment guidance for sso.doneisbetter.com

### Changed
- /api/sso/validate now validates admin cookie sessions
- Secured /api/users to admin-only

### Removed
- Deprecated username-based endpoints: /api/auth/login, /api/auth/logout, /api/users/register, /api/users/logout, /api/users/[userId]
- Duplicate/insecure routes removed or deprecated with 410 Gone

---

## [v5.9.0] — 2025-07-23T10:00:00.000Z

### Removed
- Removed nested client package (@doneisbetter/sso-client)
- Removed client-related documentation and examples
- Simplified project structure

### Modified
- Updated documentation to focus on server-side implementation
- Streamlined API documentation
- Simplified configuration options
## [v5.9.0] — 2025-07-22T08:03:17Z

### Updated Dependencies
- Upgraded Next.js to ^15.4.2
- Upgraded React to ^19.1.0
- Upgraded MongoDB to ^6.3.0
- Added TypeScript >= 4.5.0 requirement
- Updated Node.js requirement to >= 14.0.0
- Updated all client dependencies:
  - axios ^1.6.0
  - jsonwebtoken ^9.0.0

### Technical Updates
- Enhanced build system stability
- Improved development environment setup
- Updated package overrides for better dependency management
- Optimized session handling and validation

## [v5.9.0]

### Major Changes
- Upgraded all dependencies to their latest stable versions
- Fixed deprecated package warnings
- Removed legacy dependencies
- Improved build system configuration

### Technical Updates
- Added lru-cache for better memory management
- Updated glob to version 10
- Updated rimraf to version 5
- Updated eslint to version 9
- Added package overrides for transitive dependencies
- Optimized Next.js configuration for Pages Router
- Added .npmrc for better dependency management

### Removed
- Deprecated inflight package
- Legacy glob versions
- Outdated eslint configuration

### Technical Details
- Configured proper versioning for all dependencies
- Enhanced build system stability
- Improved development environment setup
- Better memory management with lru-cache
- Stricter npm configuration

## [v5.9.0] — 2025-07-21T13:12:00.000Z

### Added
- User management features:
  - Rename users functionality
  - Toggle admin rights
  - Delete users capability
- Enhanced admin dashboard
- Real-time user list updates
- Improved error handling
- User manual documentation

### Modified
- Updated frontend interface
- Enhanced permission system
- Improved activity logging
- Updated all documentation

### Technical Updates
- React hooks for state management
- MongoDB integration
- Next.js API routes
- Session management

### Major Changes
- Migrated to Next.js framework
- Implemented serverless API routes
- Added MongoDB integration
- Created user management system
- Added session management
- Implemented activity logging
- Added admin dashboard
- Created permission system

### Removed
- Express server implementation
- Static file serving through Express
- Server-side session management
- Express routes

### Technical Details
- Updated to Next.js 15.4.2
- Updated to React 19.1.0
- Added MongoDB integration
- Implemented user authentication
- Added admin user management
- Created API routes for user operations

## [v5.9.0] — 2024-04-13T12:00:00.000Z

### Added
- Initial project setup
- Basic Express.js server configuration
- Static file serving
- SPA routing support
- Basic HTML structure
- CSS styling foundation
- Client-side JavaScript initialization

### Technical Details
- Express.js server implementation
- SPA structure with HTML5 history API support
- Static file middleware configuration
- Basic responsive styling
