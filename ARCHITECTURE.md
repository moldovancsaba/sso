# Architecture — SSO (v5.13.0)

Last updated: 2025-09-17T11:43:02.000Z

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

5) Validation
- GET /api/sso/validate — validates admin cookie session and returns sanitized user info

## Design Choices
- Plaintext-like random tokens (32-hex) per team convention (not password hashes)
- ISO 8601 UTC timestamps with milliseconds across DB and docs
- No breadcrumbs (Navigation Design Policy)

## Security
- All admin routes require a valid admin-session cookie
- CORS controlled by SSO_ALLOWED_ORIGINS
- Duplicate/insecure endpoints removed; legacy username flows deprecated
