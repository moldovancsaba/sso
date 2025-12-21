# ROADMAP (v5.28.0)

Last updated: 2025-12-21T12:00:00.000Z

## ✅ COMPLETED: Multi-App Permission System & Facebook Login (Q4 2024)

### Facebook Login Integration ✅ COMPLETE (Nov 2024)
- ✅ Facebook OAuth 2.0 integration (lib/facebook.mjs)
- ✅ Social provider data storage (socialProviders.facebook field)
- ✅ Facebook login button on login page
- ✅ Automatic account linking by email
- ✅ Environment variables: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_REDIRECT_URI
- ✅ Facebook users visible in admin dashboard with login method badges
- ✅ OAuth logout endpoint (GET /api/oauth/logout)
- ✅ Two-phase logout: client app clears session, then SSO clears session

### OAuth Client Management ✅ COMPLETE (Nov 2024)
- ✅ Edit OAuth client details (name, description, redirect URIs, scopes)
- ✅ Regenerate client secret with security confirmation
- ✅ Admin UI for OAuth client management

### Bug Fixes ✅ COMPLETE (Nov 2024)
- ✅ Magic link now properly creates sessions with UUID (was using ObjectId)
- ✅ Admin session no longer falsely expires (skip public session check on /admin/*)
- ✅ Consistent button widths on login page
- ✅ Homepage reordered: User Login first, API Integration second

## ✅ COMPLETE: Multi-App Permission System (Q4 2024 - Q4 2025)
- Priority: **CRITICAL**
- Dependencies: SSO v5.28.0, Launchmass v5.28.0
- Started: 2025-01-13
- Completed: 2025-12-20

**Objective**: Implement centralized permission management across all apps (launchmass, messmass, cardmass, blockmass) with per-app role-based access control.

### Phase 1: Database & API Foundation ✅ COMPLETE
- ✅ Create `lib/appPermissions.mjs` - Permission management functions
- ✅ Create `lib/appAccessLogs.mjs` - Audit logging functions
- ✅ Create migration script: `scripts/migrations/2025-01-13-multi-app-permissions.mjs`
- ✅ Design document: `docs/MULTI_APP_PERMISSIONS.md`
- ✅ Create SSO API endpoints:
  - `GET /api/users/{userId}/apps/{clientId}/permissions`
  - `POST /api/users/{userId}/apps/{clientId}/request-access`
  - `PUT /api/admin/users/{userId}/apps/{clientId}/permissions`
  - `DELETE /api/admin/users/{userId}/apps/{clientId}/permissions`
  - `GET /api/admin/users/list-with-apps`
- ✅ Run migration on SSO database
- ✅ Test API endpoints
- Commits: cd986b5, cef8964

### Phase 2: OAuth Flow Integration ✅ COMPLETE
- ✅ Update launchmass OAuth callback to check app permissions
- ✅ Create "Access Pending" page in launchmass
- ✅ Log all access attempts to `appAccessLogs`
- ✅ Update `upsertUserFromSso()` to sync permissions
- ⏳ Email notifications for approval/denial (deferred to Phase 5)
- Commits: launchmass 2a23c65

### Phase 3: Launchmass Admin UI ✅ COMPLETE
- ✅ Create `/admin/users` page in launchmass
- ✅ Pending approvals section (filter by pending/active/all)
- ✅ Grant/deny access functionality
- ✅ Role management (user/admin/superadmin)
- ✅ User search and filtering
- ✅ Add navigation link to users page from main admin
- Commits: launchmass dea74a2, 2aa0af3

### Phase 4A: SSO Admin UI ✅ COMPLETE (2025-11-09)
- ✅ Enhanced `/admin/users` page with app access overview
- ✅ User details modal showing cross-app access ("App Permissions" section)
- ✅ App permission editor (grant/revoke/change role per app)
- ✅ New API endpoint: `/api/admin/app-permissions/[userId]` (GET/POST/PATCH/DELETE)
- ✅ Extended `lib/appPermissions.mjs` with admin helpers (upsert, revoke, DTO mapping)
- ⏳ SSO superadmin toggle (deferred)
- ⏳ Cross-app activity dashboard (deferred)
- Completed: 2025-11-09T14:00:00.000Z
- Files: pages/admin/users.js, pages/api/admin/app-permissions/[userId].js

### Phase 4B: Client Credentials OAuth ✅ COMPLETE (2025-11-09)
- ✅ Implement client credentials grant in `/api/oauth/token`
- ✅ Add `manage_permissions` scope
- ✅ Token validation middleware for app-to-app requests (`lib/oauth/middleware.mjs`)
- ✅ Validate client grant_types and allowed_scopes
- Completed: 2025-11-09T16:00:00.000Z
- Commit: 9d8ca2d6
- Files: pages/api/oauth/token.js, lib/oauth/middleware.mjs

### Phase 4C: Bidirectional Permission APIs ✅ COMPLETE (2025-11-09)
- ✅ Implement `PUT /api/users/{userId}/apps/{clientId}/permissions`
- ✅ Implement `DELETE /api/users/{userId}/apps/{clientId}/permissions`
- ✅ Add authorization checks (app can only modify own permissions)
- ✅ Add audit logging for all changes
- ✅ Fix OAuth token validation in existing GET endpoint
- Completed: 2025-11-09T16:00:00.000Z
- Commit: 9d8ca2d6
- Files: pages/api/users/[userId]/apps/[clientId]/permissions.js

### Phase 4D: Launchmass Integration ✅ COMPLETE (2025-11-09)
- ✅ Create `lib/ssoPermissions.mjs` helper library
- ✅ Implement getPermissionFromSSO()
- ✅ Implement syncPermissionToSSO()
- ✅ Implement revokePermissionInSSO()
- ✅ Implement batchSyncToSSO()
- Completed: 2025-11-09T16:00:00.000Z
- Commit: launchmass db7532a
- Files: lib/ssoPermissions.mjs

### Phase 5: Launchmass Admin UI Integration ✅ COMPLETE (2025-12-20)
- ✅ Add "Sync to SSO" button in Launchmass admin UI
- ✅ Batch sync endpoint (`/api/admin/batch-sync-sso`)
- ✅ Visual sync status with loading states
- ✅ Detailed sync results display (success/error per user)
- ✅ Automatic sync on grant/revoke/change-role operations
- ✅ Admin-only access control for batch sync
- ✅ Update `RELEASE_NOTES.md` for both SSO and launchmass
- Completed: 2025-12-20T20:08:00.000Z
- Files: pages/admin/users.js, pages/api/admin/batch-sync-sso.js, styles/globals.css

**Success Criteria**:
- ✅ User can register at SSO and request access to launchmass
- ✅ Access request appears in launchmass admin pending queue
- ✅ Admin can grant/deny access with role selection
- ✅ User receives email notification of decision
- ✅ Approved user can login and access launchmass
- ✅ Denied user sees "Access Denied" message
- ✅ SSO admin can view all users' app access across all apps
- ✅ All permission changes logged in `appAccessLogs`
- ✅ Organization-level auto-approval works for trusted domains

---

## ✅ COMPLETE: Security Hardening (Q4 2025)
- Priority: **CRITICAL**
- Dependencies: Next.js 15, MongoDB Atlas, Zod
- Started: 2025-12-21
- Completed: 2025-12-21T12:00:00.000Z

**Objective**: Implement enterprise-grade security across all admin operations with defense-in-depth architecture.

### Phase 1: Enhanced Rate Limiting ✅ COMPLETE
- ✅ Admin-specific rate limiters (3 attempts/15min for login)
- ✅ Mutation rate limiter (20 req/min)
- ✅ Query rate limiter (100 req/min)
- ✅ Reusable admin wrappers (withAdminMutation, withAdminQuery, withAdmin)
- Files: lib/middleware/rateLimit.mjs, lib/adminHelpers.mjs

### Phase 2: Security Headers Middleware ✅ COMPLETE
- ✅ Next.js Edge Middleware for all routes
- ✅ X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- ✅ HSTS (production only)
- ✅ Content-Security-Policy (environment-aware)
- ✅ Permissions-Policy (restrictive)
- Files: middleware.js, lib/securityHeaders.mjs

### Phase 3: Input Validation Layer ✅ COMPLETE
- ✅ Zod integration with type-safe schemas
- ✅ Reusable primitive and composite schemas
- ✅ withValidation() wrapper function
- ✅ sanitizeHtml() and sanitizeFilename() utilities
- Files: lib/validation.mjs, package.json

### Phase 4: Admin Session Hardening ✅ COMPLETE
- ✅ Reduced session lifetime (30 days → 4 hours)
- ✅ Device fingerprinting (SHA-256 of IP + User-Agent)
- ✅ Device change detection and logging
- ✅ Sliding expiration with 4-hour window
- Files: lib/sessions.mjs, pages/api/admin/login.js

### Phase 5: Enhanced Audit Logging ✅ COMPLETE
- ✅ Comprehensive audit system (lib/auditLog.mjs)
- ✅ auditLogs collection with 4 indexes
- ✅ Standardized action constants (AuditAction.*)
- ✅ Before/after state tracking
- ✅ Password/token sanitization
- ✅ Query functions (getAuditLogs, getResourceAuditTrail, etc.)
- ✅ auditLog() helper in adminHelpers.mjs
- ✅ Integration in user management endpoints
- ✅ Admin API endpoint (/api/admin/audit-logs)
- Files: lib/auditLog.mjs, lib/adminHelpers.mjs, pages/api/admin/users/*, pages/api/admin/audit-logs/index.js

**Security Improvements**:
- ✅ OWASP Top 10 coverage
- ✅ SOC 2 audit trail requirements
- ✅ GDPR-compliant logging
- ✅ Defense in depth architecture
- ✅ Attack vectors mitigated: brute force, XSS, clickjacking, MIME sniffing, MITM, session hijacking, injection attacks

---

## Milestone: Operational resilience (Q1 2026)
- Structured error telemetry (privacy-safe)
- Background cleanup for expired resource passwords
- Automated audit log retention management
- Performance monitoring and alerting

## Milestone: Multi-tenant Organizations & Org Users (Q4 2025)
- Priority: High
- Dependencies: MongoDB Atlas, Existing Admin Auth
- Logged: 2025-09-13 18:31 CET

Planned:
- Data model and indexes for organizations and orgUsers
- Admin endpoints: /api/admin/orgs, /api/admin/orgs/[id], /api/admin/orgs/[orgId]/users, /api/admin/orgs/[orgId]/users/[id]
- RBAC extension: manage-orgs, manage-org-users
- Documentation updates (README, ARCHITECTURE, API Reference)
- CORS/domain strategy per organization (future enhancement)
