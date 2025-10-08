# ROADMAP (v5.4.0)

Last updated: 2025-01-13T23:45:00.000Z

## 🚧 IN PROGRESS: Multi-App Permission System (Q1 2025)
- Priority: **CRITICAL**
- Dependencies: SSO v5.4.0, Launchmass v1.8.0
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

### Phase 4: SSO Admin UI ⏳ IN PROGRESS
- ⏳ Enhance `/admin/users` page with app access overview
- ⏳ User details modal showing cross-app access
- ⏳ App permission editor
- ⏳ SSO superadmin toggle
- ⏳ Cross-app activity dashboard
- Target: 2025-01-14

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
