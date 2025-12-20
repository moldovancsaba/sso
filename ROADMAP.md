# ROADMAP (v5.25.0)

Last updated: 2025-11-09T16:00:00.000Z

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

## 🚧 IN PROGRESS: Multi-App Permission System (Q1 2025 - FINAL PHASE)
- Priority: **CRITICAL**
- Dependencies: SSO v5.25.0, Launchmass v5.25.0
- Started: 2025-01-13
- Target: 2025-01-20

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
- ⏳ Update launchmass admin UI to call sync functions (Phase 5)
- ⏳ Add "Sync to SSO" button in admin UI (Phase 5)
- Completed: 2025-11-09T16:00:00.000Z
- Commit: launchmass db7532a
- Files: lib/ssoPermissions.mjs

### Phase 5: Documentation & Testing
- ⏳ Update `ARCHITECTURE.md`
- ⏳ Update launchmass documentation
- ⏳ End-to-end testing:
  - New user registration
  - Access request and pending state
  - Admin approval with role selection
  - Role changes
  - Access revocation
  - Auto-approval for trusted domains
- ⏳ Security review
- ⏳ Update `RELEASE_NOTES.md` for both SSO and launchmass

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

## Milestone: Harden admin & password services (Q1 2025)
- Priority: High
- Dependencies: MongoDB Atlas, Vercel

Planned:
- Add audit logs for admin actions (create/update/delete users)
- Optional expiry policy per resourceType
- Admin UI for resource password lifecycle

## Milestone: Operational resilience (Q4 2025)
- Add rate limiting on sensitive endpoints
- Structured error telemetry (privacy-safe)
- Background cleanup for expired resource passwords

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
