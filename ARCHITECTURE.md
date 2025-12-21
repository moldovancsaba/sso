# Architecture — SSO (v5.29.0)

Last updated: 2025-12-21T14:00:00.000Z

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

## Security Layers (v5.29.0 Hardening)

### Layer 1: Rate Limiting
**Location**: `lib/middleware/rateLimit.mjs`

**What**: Request rate limiting with admin-specific restrictions

**Implementation**:
- Public endpoints: 5 attempts per 15 minutes
- Admin login: 3 attempts per 15 minutes
- Admin mutations (create/update/delete): 20 requests per minute
- Admin queries: 100 requests per minute

**Enforcement**: Via wrapper functions in `lib/adminHelpers.mjs`
- `withAdminMutation()` - Applies admin mutation rate limiter
- `withAdminQuery()` - Applies admin query rate limiter
- `withAdmin()` - Base admin auth + custom rate limiter

**Attack Mitigation**: Brute force attacks, credential stuffing, API abuse

---

### Layer 2: Security Headers
**Location**: `middleware.js` (Next.js Edge Middleware)

**What**: HTTP security headers applied to all routes

**Headers**:
```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains (production only)
Content-Security-Policy: [environment-specific]
Permissions-Policy: [restrictive - disables camera, mic, geolocation, etc.]
```

**CSP Policies**:
- Development: Allows 'unsafe-eval' for Next.js HMR
- Production: Strict policy with 'self' and trusted CDNs only

**Attack Mitigation**: Clickjacking, XSS, MIME sniffing, man-in-the-middle

---

### Layer 3: Input Validation
**Location**: `lib/validation.mjs`

**What**: Type-safe input validation using Zod schemas

**Schemas**:
- Primitive: email, UUID, password, name, role, status
- Composite: adminLoginSchema, createAdminUserSchema, updateAdminUserSchema, createOrganizationSchema, etc.

**Integration**: Via `withValidation()` wrapper or direct schema validation

**Utilities**:
- `sanitizeHtml()` - Removes dangerous HTML tags
- `sanitizeFilename()` - Prevents path traversal attacks

**Attack Mitigation**: SQL/NoSQL injection, XSS, path traversal, malformed input

---

### Layer 4: Session Security
**Location**: `lib/sessions.mjs`, `pages/api/admin/login.js`

**What**: Enhanced session management with device fingerprinting

**Features**:
- **Short Lifetime**: 4 hours (reduced from 30 days)
- **Device Fingerprinting**: SHA-256 hash of IP + User-Agent
  - Stored in session document
  - Validated on every request
  - Logged when device changes detected
- **Sliding Expiration**: Extends session on activity
- **Secure Cookies**: HttpOnly, SameSite=Lax, Secure (production)

**Functions**:
- `generateDeviceFingerprint(req)` - Creates device identifier
- `checkDeviceChange(session, req)` - Detects suspicious activity
- `createAdminSession()` - Creates session with fingerprint
- `validateSession()` - Validates session and device

**Attack Mitigation**: Session hijacking, credential theft, unauthorized access

---

### Layer 5: Audit Logging
**Location**: `lib/auditLog.mjs`

**What**: Comprehensive audit trail for all admin actions

**Collection**: `auditLogs`
```javascript
{
  _id: ObjectId,
  action: string,           // Standardized action constant (AuditAction.*)
  actorUserId: string,      // UUID of admin who performed action
  actorEmail: string,       // Email of admin
  actorRole: string,        // Role at time of action
  resource: string,         // Resource type (user, organization, oauthClient, etc.)
  resourceId: string,       // UUID of affected resource
  beforeState: object,      // State before action (sanitized)
  afterState: object,       // State after action (sanitized)
  status: string,           // success | failure
  metadata: {               // Context data
    ip: string,
    userAgent: string,
    // ... additional context
  },
  timestamp: string         // ISO 8601 UTC with milliseconds
}
```

**Indexes**:
1. `{ actorUserId: 1, timestamp: -1 }` - User activity queries
2. `{ resource: 1, resourceId: 1, timestamp: -1 }` - Resource history
3. `{ action: 1, timestamp: -1 }` - Action filtering
4. `{ status: 1, timestamp: -1 }` - Failed action detection

**Action Types** (AuditAction constants):
- User operations: USER_CREATED, USER_UPDATED, USER_DELETED, USER_LOGIN_SUCCESS, USER_LOGIN_FAILED, etc.
- Permission operations: PERMISSION_GRANTED, PERMISSION_REVOKED, PERMISSION_ROLE_CHANGED
- OAuth operations: OAUTH_CLIENT_CREATED, OAUTH_CLIENT_SECRET_REGENERATED, etc.

**Query Functions**:
- `getAuditLogs(filter, limit, skip)` - Paginated log retrieval
- `getResourceAuditTrail(resource, resourceId)` - Complete history of a resource
- `getUserAuditTrail(userId)` - All actions by a user
- `getFailedActions(filter)` - Failed operations only
- `getAuditStats(filter)` - Aggregated statistics
- `cleanupOldAuditLogs(retentionDays)` - Retention management

**Integration**:
- Helper function: `auditLog(req, action, resource, resourceId, beforeState, afterState)`
- Used in: User management, organization management, OAuth client management
- Admin API: `GET /api/admin/audit-logs` with filtering and pagination

**Data Sanitization**: Passwords, tokens, and secrets automatically removed from logged state

**Compliance**: SOC 2, GDPR, OWASP audit requirements

**Attack Mitigation**: Enables detection, investigation, and response to security incidents

---

## Security Architecture Diagram

```
Client Request
     │
     ├─> [Layer 1: Rate Limiting] ────────> 429 Too Many Requests (if exceeded)
     │
     ├─> [Layer 2: Security Headers] ─────> Headers applied to response
     │
     ├─> [Layer 3: Input Validation] ─────> 400 Bad Request (if invalid)
     │
     ├─> [Layer 4: Session Security] ─────> 401 Unauthorized (if invalid/hijacked)
     │
     └─> [Business Logic]
             │
             └─> [Layer 5: Audit Logging] ─> Log written to auditLogs collection
                     │
                     └─> Response to Client
```

## Defense in Depth Strategy

Each security layer addresses different attack vectors:
1. **Rate Limiting**: Prevents automated attacks (brute force, DDoS)
2. **Security Headers**: Browser-level protection (XSS, clickjacking, MIME sniffing)
3. **Input Validation**: Application-level protection (injection attacks)
4. **Session Security**: Identity protection (session hijacking, credential theft)
5. **Audit Logging**: Detection and response (compliance, forensics, anomaly detection)

No single layer is sufficient alone. Multiple layers provide redundancy and catch different types of attacks.

---

## Account Linking and Unlinking (v5.29.0)

### Overview
**Principle**: One person, one email = one account

Users can login with multiple authentication methods (Email+Password, Facebook, Google, Magic Link) while maintaining a single account per email address.

### Core Library
**Location**: `lib/accountLinking.mjs`

**Functions**:
- `findUserByEmail(email)` - Find user regardless of login method
- `getUserLoginMethods(user)` - Get list of linked methods (computed, not stored)
- `canLoginWithPassword(user)` - Check if user has password
- `addPasswordToAccount(userId, password)` - Add password to social-only account
- `linkLoginMethod(user, provider, providerData)` - Link social provider
- `getAccountLinkingSummary(email)` - Comprehensive account status
- `validateUnlinking(user, provider)` - Safety check before unlinking (requires at least 2 methods)
- `unlinkLoginMethod(userId, provider, initiatedBy)` - Remove social login method
- `removePassword(userId, initiatedBy)` - Remove email+password login

### Automatic Linking
**Implementation**: All authentication flows automatically link accounts by email

**Registration Flow** (`POST /api/public/register`):
1. Check if email exists
2. If user has password → Return 409 error
3. If user has social-only → Add password to existing account
4. If no user → Create new account
5. Return `isAccountLinking: true` flag when linking occurs

**Login Flow** (`POST /api/public/login`):
1. Find user by email
2. Check if password exists
3. If social-only → Return helpful error with available methods
4. If password exists → Validate and login

**Social Login Flow** (Facebook/Google):
1. OAuth callback receives provider profile
2. Find user by email
3. If user exists → Link provider to existing account
4. If no user → Create new account with provider
5. Update `socialProviders.{provider}` with profile data

### Manual Linking (Admin)
**Endpoint**: `POST /api/admin/public-users/[id]/link`

**Use Case**: Admin manually links social provider to user account (e.g., fixing account issues)

**Body**:
```json
{
  "provider": "facebook" | "google",
  "providerId": "string",
  "email": "string",
  "name": "string",
  "picture": "string" (optional)
}
```

**Validation**:
- Email must match user's email (prevents linking wrong person's account)
- Provider cannot already be linked
- Comprehensive audit logging with `ACCOUNT_LINK_MANUAL` event

**UI**: Link Social Provider section in admin user modal
- Provider selection buttons (Facebook/Google)
- Form with fields for provider data
- Success/error messages

### Account Unlinking
**Principle**: Safety-first approach prevents account lockout

**Safety Validation** (`validateUnlinking()`):
1. Check user has at least 2 login methods
2. If only 1 method → Return error
3. If 2+ methods → Allow unlinking

**User-Initiated Unlinking**:
- Endpoint: `DELETE /api/public/account/unlink/[provider]`
- UI: Unlink buttons on each login method badge in account dashboard
- Buttons disabled when last method (opacity 0.5 + tooltip)
- Confirmation dialog before unlinking
- Auto-refresh after successful unlink

**Admin-Initiated Unlinking**:
- Endpoint: `DELETE /api/admin/public-users/[id]/unlink/[provider]`
- UI: Unlink buttons in Login Methods section of user modal
- Same safety validation as user-initiated
- Audit logging with admin actor information

**Supported Providers**: `password`, `facebook`, `google`

### Multi-Layer Safety
**Layer 1 (UI)**: Buttons disabled when last method, tooltip explains why
**Layer 2 (API)**: Endpoint validates before unlinking, returns 400 if last method
**Layer 3 (DB)**: `validateUnlinking()` re-checks in transaction, prevents race conditions

**Error Messages**:
- Clear explanation of why operation failed
- Guidance on how to proceed (e.g., "Add another login method first")

### Cross-App Activity Dashboard
**Endpoint**: `GET /api/admin/activity`

**Purpose**: Comprehensive audit log for account management operations

**Query Params**:
- `timeRange`: `24h` | `7d` | `30d` | `all` (default: `7d`)
- `eventType`: `access` | `permission` | `login` | (empty for all)

**Implementation**:
- MongoDB aggregation pipeline with `$lookup` joins
- Enriches logs with user names from `publicUsers` collection
- Enriches logs with app names from `oauthClients` collection
- Efficient indexing for time-range queries

**UI**: `pages/admin/activity.js`
- Timeline view with expandable entries
- Filters for time range and event type
- Auto-refresh button for real-time monitoring
- Shows full log details (before/after state, metadata)

### Audit Events (v5.29.0)
**New Audit Action Constants** (`lib/auditLog.mjs`):
- `ACCOUNT_LINK_MANUAL` - Admin manually linked social provider
- `ACCOUNT_UNLINK` - Login method unlinked (user or admin)
- `PASSWORD_REMOVED` - Email+password login removed

**Log Format**:
```javascript
{
  action: 'ACCOUNT_LINK_MANUAL',
  actorUserId: 'admin-uuid',
  actorEmail: 'admin@example.com',
  actorRole: 'super-admin',
  resource: 'publicUser',
  resourceId: 'user-uuid',
  beforeState: { loginMethods: ['password'] },
  afterState: { loginMethods: ['password', 'facebook'] },
  status: 'success',
  metadata: {
    provider: 'facebook',
    ip: '1.2.3.4',
    userAgent: '...'
  },
  timestamp: '2025-12-21T14:00:00.000Z'
}
```

### Data Model Changes
**publicUsers Collection** (computed fields):
```javascript
{
  id: "uuid",
  email: "user@example.com",
  name: "User Name",
  
  // Optional - only if email+password used
  passwordHash: "...",
  emailVerified: true,
  
  // Social providers
  socialProviders: {
    facebook: { id, email, name, picture, linkedAt, lastLoginAt },
    google: { id, email, name, picture, emailVerified, linkedAt, lastLoginAt }
  },
  
  // Computed (not stored) - calculated by getUserLoginMethods()
  loginMethods: ["password", "facebook", "google"]
}
```

**Login Methods Computation**:
```javascript
function getUserLoginMethods(user) {
  const methods = []
  if (user.passwordHash) methods.push('password')
  if (user.socialProviders?.facebook) methods.push('facebook')
  if (user.socialProviders?.google) methods.push('google')
  return methods
}
```

### Migration Tool
**Script**: `scripts/merge-duplicate-accounts.mjs`

**Purpose**: Merge duplicate accounts with same email (one-time migration)

**Process**:
1. Find all emails with multiple accounts
2. For each duplicate set:
   - Keep oldest account as primary
   - Merge all social providers
   - Transfer passwordHash if needed
   - Transfer sessions, OAuth tokens, permissions
   - Delete duplicate accounts
3. Log all merges for audit trail

**Usage**:
```bash
DRY_RUN=true node scripts/merge-duplicate-accounts.mjs  # Preview changes
node scripts/merge-duplicate-accounts.mjs                # Apply changes
```

### User Experience
**Scenario 1**: Social → Email+Password
1. User creates account with Facebook
2. Later registers with email+password (same email)
3. System adds password to existing Facebook account
4. User can now login with either method

**Scenario 2**: Email+Password → Social
1. User registers with email+password
2. Later logs in with Google (same email)
3. System automatically links Google to existing account
4. User can now login with either method

**Scenario 3**: Unlinking
1. User has password + Facebook linked
2. User clicks "Unlink" on Facebook badge
3. System confirms user has 2 methods, allows unlinking
4. Facebook removed, user can still login with password

**Scenario 4**: Prevented Lockout
1. User has only password method
2. User clicks "Unlink" on password badge
3. Button is disabled (opacity 0.5)
4. Tooltip says "Cannot unlink - last method"
5. System prevents account lockout

### Security Considerations
- **Email Verification**: Inherited from any verified method
- **Password Security**: bcrypt (12 rounds), minimum 8 characters
- **Session Management**: All sessions remain valid after linking
- **OAuth Security**: State parameter CSRF protection
- **Audit Logging**: All linking/unlinking operations logged
- **Email Consistency**: Manual linking validates email matches user's email
- **Race Conditions**: Multi-layer validation prevents concurrent unlinking of last method

### Compliance
- ✅ GDPR compliant (user consent, data portability)
- ✅ SOC 2 compliant (audit trail, access control)
- ✅ OWASP compliant (input validation, secure session management)

### Monitoring
- Activity dashboard shows real-time account management operations
- Audit logs provide full traceability
- Failed unlink attempts logged for security review
- Email consistency violations logged as security events
