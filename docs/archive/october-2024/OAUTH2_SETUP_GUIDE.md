# OAuth2/OIDC Setup & Testing Guide

**Document Version**: Phase 2 - Initial Implementation  
**Last Updated**: 2025-10-02T12:57:38.000Z  
**Status**: Foundation Complete - Testing Mode  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What's Been Implemented](#whats-been-implemented)
3. [Setup Instructions](#setup-instructions)
4. [Testing OAuth Client Management](#testing-oauth-client-management)
5. [Database Collections](#database-collections)
6. [Scope Definitions](#scope-definitions)
7. [Next Steps](#next-steps)

---

## Overview

This guide helps you set up and test the OAuth2/OIDC foundation that has been implemented in Phase 2. The goal is to enable external applications (like narimato.com) to authenticate users via our SSO service.

**Current Phase**: Infrastructure and Admin Management  
**Next Phase**: OAuth flow endpoints (authorize, token, consent)

---

## What's Been Implemented

### ✅ Core Infrastructure (Completed)

1. **OAuth2 Client Management** (`lib/oauth/clients.mjs`)
   - Client registration with bcrypt-hashed secrets
   - Full CRUD operations (Create, Read, Update, Delete)
   - Redirect URI validation (HTTPS required in production)
   - Scope validation and filtering
   - Status management (active/suspended)

2. **Authorization Codes** (`lib/oauth/codes.mjs`)
   - PKCE support (SHA-256 code challenge verification)
   - Single-use codes with automatic expiration (10 minutes)
   - MongoDB TTL index for automatic cleanup
   - Atomic consumption to prevent race conditions

3. **JWT Token Generation** (`lib/oauth/tokens.mjs`)
   - RS256-signed access tokens (1 hour lifetime)
   - OIDC ID tokens with user claims
   - Refresh tokens with SHA-256 hashing (30 days lifetime)
   - Token rotation support
   - Revocation tracking

4. **Scope Management** (`lib/oauth/scopes.mjs`)
   - Standard OIDC scopes (openid, profile, email, offline_access)
   - App-specific scopes for narimato, cardmass, playmass
   - Scope validation and filtering
   - Consent tracking helpers

5. **Admin UI** (`pages/admin/oauth-clients.js`)
   - Create new OAuth clients (super-admin only)
   - View all registered clients
   - Edit client settings
   - Suspend/activate clients
   - Delete clients (with confirmation)
   - Copy client IDs to clipboard
   - Display client secret once at creation

6. **API Endpoints**
   - `GET /api/admin/oauth-clients` - List all clients
   - `POST /api/admin/oauth-clients` - Register new client
   - `GET /api/admin/oauth-clients/[clientId]` - Get client details
   - `PATCH /api/admin/oauth-clients/[clientId]` - Update client
   - `DELETE /api/admin/oauth-clients/[clientId]` - Delete client

### ⏳ Pending Implementation

- Authorization endpoint (`/api/oauth/authorize`)
- Token endpoint (`/api/oauth/token`)
- User consent UI (`/oauth/consent`)
- Token introspection endpoint (`/api/oauth/introspect`)
- Token revocation endpoint (`/api/oauth/revoke`)
- OIDC discovery endpoint (`/.well-known/openid-configuration`)
- JWKS endpoint (`/.well-known/jwks.json`)

---

## Setup Instructions

### 1. Environment Configuration

Update your `.env` file with OAuth2 configuration:

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

### 2. RSA Keys

RSA keys have already been generated in `keys/`:
- `keys/private.pem` - Private key for signing JWTs (2048-bit)
- `keys/public.pem` - Public key for JWT verification

**⚠️ IMPORTANT**: These keys are git-ignored. Never commit them to version control!

For production deployment, you'll need to:
1. Generate new keys on the production server
2. Store them securely (or use environment variables for key content)
3. Ensure they're not in git/public directories

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

---

## Testing OAuth Client Management

### Step 1: Login as Admin

1. Navigate to `http://localhost:3000/admin`
2. Login with your super-admin credentials:
   - Email: `sso@doneisbetter.com`
   - Password: Your 32-hex admin token

### Step 2: Access OAuth Clients Management

Once logged in, click the **"OAuth Clients"** button in the admin panel.

You should see the OAuth clients management page at `http://localhost:3000/admin/oauth-clients`

### Step 3: Create a Test Client

Click **"+ New Client"** and fill in the form:

#### Example: Narimato OAuth Client

```
Client Name: Narimato
Description: Card ranking and management platform
Redirect URIs:
  http://localhost:3001/auth/callback
  http://localhost:3001/api/oauth/callback
  https://narimato.com/auth/callback
Allowed Scopes: openid profile email offline_access read:cards write:cards read:rankings
Homepage URL: https://narimato.com
```

Click **"Create Client"** and you'll see:
- ✅ Success message
- ⚠️ **Client Secret Display** (SAVE THIS NOW - it's only shown once!)
- New client appears in the list below

**Example Client Secret Output:**
```
Client ID: 550e8400-e29b-41d4-a716-446655440000
Client Secret: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Step 4: Verify Client Creation

In the clients list, you should see:
- Client name and description
- Status badge (active/suspended)
- Client ID with copy button
- Redirect URIs list
- Allowed scopes as badges
- Created/Updated timestamps
- Actions (Suspend/Activate, Delete) for super-admins

### Step 5: Test Client Management

Try the following operations:

**View Client Details:**
- Click on any client to expand its details
- Copy the client_id using the "Copy" button

**Suspend/Activate Client:**
- Click "Suspend" to disable the client
- Status badge changes to yellow "suspended"
- Click "Activate" to re-enable it
- Status badge returns to green "active"

**Delete Client:**
- Click "Delete" button
- Confirm the deletion in the popup
- Client is removed from the list
- ⚠️ This will invalidate all tokens for that client

---

## Database Collections

### oauthClients

MongoDB collection storing registered OAuth2 clients.

**Schema:**
```javascript
{
  client_id: string,              // UUID
  client_secret: string,          // bcrypt hash
  name: string,                   // "Narimato"
  description: string,
  redirect_uris: string[],        // ["https://narimato.com/callback"]
  allowed_scopes: string[],       // ["openid", "profile", "email", ...]
  grant_types: string[],          // ["authorization_code", "refresh_token"]
  token_endpoint_auth_method: string, // "client_secret_post"
  status: string,                 // "active" | "suspended"
  owner_user_id: string,          // Admin who created it
  logo_uri: string,               // Optional
  homepage_uri: string,           // Optional
  created_at: string,             // ISO 8601 UTC
  updated_at: string              // ISO 8601 UTC
}
```

**Indexes:**
- `client_id` (unique)

**Query Examples:**
```javascript
// Get all active clients
db.oauthClients.find({ status: 'active' })

// Get client by ID
db.oauthClients.findOne({ client_id: '550e8400-...' })

// Get clients by owner
db.oauthClients.find({ owner_user_id: 'admin-uuid' })
```

### authorizationCodes

Short-lived authorization codes for OAuth2 flow.

**Schema:**
```javascript
{
  code: string,                   // 64-char hex
  client_id: string,
  user_id: string,
  redirect_uri: string,
  scope: string,                  // Space-separated
  code_challenge: string,         // PKCE
  code_challenge_method: string,  // "S256" | "plain"
  expires_at: string,             // ISO 8601 UTC
  used_at: string | null,
  created_at: string
}
```

**Indexes:**
- `code` (unique)
- `expires_at` (TTL index - auto-deletes expired codes)

### refreshTokens

Long-lived tokens for obtaining new access tokens.

**Schema:**
```javascript
{
  token: string,                  // SHA-256 hash
  client_id: string,
  user_id: string,
  scope: string,
  access_token_jti: string,
  expires_at: string,             // ISO 8601 UTC
  revoked_at: string | null,
  revoke_reason: string | null,
  parent_token: string | null,    // For rotation tracking
  created_at: string,
  last_used_at: string | null
}
```

**Indexes:**
- `token` (unique)
- `user_id`
- `client_id`
- `expires_at` (TTL index)

---

## Scope Definitions

### Standard OIDC Scopes

| Scope | Description | Claims Included |
|-------|-------------|-----------------|
| `openid` | Required for OIDC | sub (user ID) |
| `profile` | User profile | name, picture, updated_at |
| `email` | Email address | email, email_verified |
| `offline_access` | Refresh token | - |

### Application-Specific Scopes

#### Narimato (Card Platform)
| Scope | Description |
|-------|-------------|
| `read:cards` | View card collection and rankings |
| `write:cards` | Create, update, delete cards |
| `read:rankings` | View global and personal rankings |

#### CardMass
| Scope | Description |
|-------|-------------|
| `read:decks` | View card decks |
| `write:decks` | Manage card decks |

#### PlayMass
| Scope | Description |
|-------|-------------|
| `read:games` | View game history |
| `write:games` | Create/update games |

---

## Next Steps

### Phase 2 - Remaining Tasks

1. **Authorization Endpoint** (`/api/oauth/authorize`)
   - User authentication check
   - Client validation
   - Scope validation
   - PKCE parameters validation
   - Redirect to consent UI

2. **Token Endpoint** (`/api/oauth/token`)
   - Authorization code exchange
   - Client authentication
   - PKCE verification
   - JWT access token generation
   - ID token generation
   - Refresh token issuance

3. **Consent UI** (`/oauth/consent`)
   - Display app name and logo
   - List requested scopes with descriptions
   - Approve/Deny buttons
   - Store user consent

4. **Token Introspection** (`/api/oauth/introspect`)
   - Validate access tokens
   - Return token metadata

5. **Token Revocation** (`/api/oauth/revoke`)
   - Revoke access/refresh tokens
   - Support for client-initiated revocation

6. **OIDC Discovery** (`/.well-known/openid-configuration`)
   - Metadata endpoint
   - List supported features
   - Endpoint URLs

7. **JWKS Endpoint** (`/.well-known/jwks.json`)
   - Expose public key for JWT verification
   - JWK format with modulus and exponent

### Testing Strategy

Once OAuth flow endpoints are implemented:

1. **Local Testing**:
   - Use Postman or curl to test authorization flow
   - Use PKCE playground to generate challenge/verifier pairs
   - Test token exchange and refresh

2. **Integration Testing**:
   - Set up test client in narimato (localhost:3001)
   - Test full OAuth flow from client perspective
   - Verify tokens and claims

3. **Security Testing**:
   - Test PKCE validation
   - Test expired code handling
   - Test token rotation
   - Test revocation

---

## Troubleshooting

### Client Secret Not Showing

**Problem**: Client secret is not displayed after creation.

**Solution**: The secret is only shown once immediately after creation. If you miss it:
1. Delete the client
2. Create a new one
3. Save the secret immediately

### Build Errors

**Problem**: Import errors during build.

**Solution**: 
- Check that logger is imported as `import logger from '../logger.mjs'`
- Check that CORS is imported as `import { runCors } from '../cors.mjs'`

### MongoDB Connection Issues

**Problem**: "Cannot connect to MongoDB" error.

**Solution**:
- Verify `MONGODB_URI` in `.env`
- Check MongoDB Atlas network allowlist
- Ensure database name is correct

### RSA Keys Missing

**Problem**: "Failed to load RSA keys" error.

**Solution**:
```bash
cd /path/to/sso
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

---

## Support & Resources

- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749
- **PKCE RFC**: https://tools.ietf.org/html/rfc7636
- **OIDC Core**: https://openid.net/specs/openid-connect-core-1_0.html
- **JWT RFC**: https://tools.ietf.org/html/rfc7519

---

**End of OAuth2 Setup Guide**  
**Next Document**: OAUTH2_INTEGRATION.md (coming after flow implementation)
