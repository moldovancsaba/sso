# Architecture — SSO (v5.25.0)

Last updated: 2025-11-09T12:16:00.000Z

## Stack
- Next.js (Pages Router)
- Node.js >= 18, ESM modules
- MongoDB Atlas

## Components
1) Admin Authentication (DB-backed)
- Collection: users { id: uuid, email, name, role: 'admin'|'super-admin', password, createdAt, updatedAt }  // id is a UUID; legacy Mongo _id retained internally
- Session: HttpOnly cookie 'admin-session' (base64 JSON: token, expiresAt, userId, role) // userId is UUID
- Endpoints:
  - POST /api/admin/login — login with email + 32-hex token (MD5-style)
  - DELETE /api/admin/login — logout (clear cookie)
  - GET/POST /api/admin/users — list/create users (super-admin to create)
  - GET/PATCH/DELETE /api/admin/users/[id] — manage user (update name/role/password, delete)

2) Resource Passwords (page-specific analogue)
- Collection: resourcePasswords { resourceId, resourceType, password, createdAt, expiresAt?, usageCount, lastUsedAt? }
- Endpoints:
  - POST /api/resource-passwords — generate/retrieve password + shareable link
  - PUT /api/resource-passwords — validate password (admin-session bypass)

3) Organizations (multi-tenant)
- Collection: organizations { id: uuid, name, slug (unique), domains: string[] (unique), status: 'active'|'suspended', plan?, createdAt, updatedAt }
- Endpoints:
  - GET/POST /api/admin/orgs
  - GET/PATCH/DELETE /api/admin/orgs/[id]

4) Organization Users (tenant users)
- Collection: orgUsers { id: uuid, orgId: uuid, email (unique within org), name?, role: 'org-admin'|'member', password?, status: 'active'|'invited'|'disabled', createdAt, updatedAt }
- Endpoints:
  - GET/POST /api/admin/orgs/[orgId]/users
  - GET/PATCH/DELETE /api/admin/orgs/[orgId]/users/[id]

5) Public Users (End-User Authentication)
- Collection: publicUsers { id: uuid, email, name, password?, status: 'active'|'disabled', emailVerified: boolean, socialProviders?: { facebook?: {...}, google?: {...} }, createdAt, updatedAt, lastLoginAt }
- Session: HttpOnly cookie 'public-session' (SHA-256 hashed token stored in publicSessions collection)
- Authentication Methods:
  - Email + Password
  - Magic Link (passwordless)
  - Facebook Login (OAuth 2.0)
- Endpoints:
  - POST /api/public/login — email/password login
  - POST /api/public/register — create account
  - POST /api/public/request-magic-link — request passwordless login link
  - GET /api/public/magic-login?token=... — consume magic link and login
  - GET /api/auth/facebook/login — initiate Facebook OAuth
  - GET /api/auth/facebook/callback — Facebook OAuth callback
  - POST /api/public/logout — logout and clear session

6) OAuth2 Server (Third-Party App Integration)
- Collection: oauthClients { client_id: uuid, client_secret: bcrypt-hash, name, redirect_uris, allowed_scopes, status, require_pkce, created_at, updated_at }
- Collection: appPermissions { userId: uuid, clientId: uuid, hasAccess: boolean, role, status, grantedAt, grantedBy }
- Endpoints:
  - GET /api/oauth/authorize — authorization endpoint (OAuth 2.0 flow start)
  - POST /api/oauth/token — token endpoint (exchange code for access token)
  - GET /api/oauth/logout?post_logout_redirect_uri=... — logout from SSO
  - POST /api/oauth/revoke — revoke refresh tokens
  - GET /api/admin/oauth-clients — list OAuth clients (admin)
  - POST /api/admin/oauth-clients — create OAuth client (super-admin)
  - PATCH /api/admin/oauth-clients/[clientId] — update client (super-admin)
  - POST /api/admin/oauth-clients/[clientId]/regenerate-secret — regenerate client secret
  - DELETE /api/admin/oauth-clients/[clientId] — delete client (super-admin)

7) Validation
- GET /api/sso/validate — validates admin OR public cookie session and returns sanitized user info

## Design Choices
- Plaintext-like random tokens (32-hex) per team convention (not password hashes)
- ISO 8601 UTC timestamps with milliseconds across DB and docs
- No breadcrumbs (Navigation Design Policy)

## Security
- All admin routes require a valid admin-session cookie
- CORS controlled by SSO_ALLOWED_ORIGINS
- Duplicate/insecure endpoints removed; legacy username flows deprecated
