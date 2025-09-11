# Architecture — SSO (v4.2.0)

Last updated: 2025-09-11T14:28:29.000Z

## Stack
- Next.js (Pages Router)
- Node.js >= 18, ESM modules
- MongoDB Atlas

## Components
1) Admin Authentication (DB-backed)
- Collection: users { email, name, role: 'admin'|'super-admin', password, createdAt, updatedAt }
- Session: HttpOnly cookie 'admin-session' (base64 JSON: token, expiresAt, userId, role)
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

3) Validation
- GET /api/sso/validate — validates admin cookie session and returns sanitized user info

## Design Choices
- Plaintext-like random tokens (32-hex) per team convention (not password hashes)
- ISO 8601 UTC timestamps with milliseconds across DB and docs
- No breadcrumbs (Navigation Design Policy)

## Security
- All admin routes require a valid admin-session cookie
- CORS controlled by SSO_ALLOWED_ORIGINS
- Duplicate/insecure endpoints removed; legacy username flows deprecated
