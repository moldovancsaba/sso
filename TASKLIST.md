# TASKLIST (v5.27.0)

Last updated: 2025-11-09T16:00:00.000Z

Active:
(No active tasks)

Pending (Future):
1) Add Google Login (similar to Facebook integration)
   - Owner: Backend
   - Expected Delivery: TBD
   - Priority: P2
2) Add Apple Login (required for iOS apps)
   - Owner: Backend
   - Expected Delivery: TBD
   - Priority: P2
3) Email notifications for app access approval/denial
   - Owner: Backend
   - Expected Delivery: TBD
   - Priority: P2
4) Cross-app activity dashboard for admins
   - Owner: Frontend
   - Expected Delivery: TBD
   - Priority: P3

Completed (v5.27.0 - November 2024):
- Initial planning recorded and endpoints implemented (admin + resource passwords)
- DB-backed admin auth and resource passwords refactor
- Vercel env + CORS configuration for sso.doneisbetter.com
- Documentation alignment and version sync automation
- Production admin API access verified
- Multi-tenant data model designed and implemented (organizations, orgUsers)
- Admin organizations endpoints (GET/POST, GET/PATCH/DELETE)
- Admin org-users endpoints (GET/POST, GET/PATCH/DELETE)
- RBAC extension: manage-orgs and manage-org-users
- UUID backfill for existing users in production
- MongoDB client timeouts + 503 mapping
- App permissions system (lib/appPermissions.mjs)
- Admin UI for app permissions management
- OAuth client management UI (edit, regenerate secret, delete)
- Facebook Login integration (OAuth 2.0)
- Social provider data storage (publicUsers.socialProviders)
- Facebook users visible in admin dashboard
- OAuth logout endpoint (GET /api/oauth/logout)
- Magic link session creation bug fix (UUID vs ObjectId)
- Admin session false expiration fix (_app.js skip admin pages)
- Consistent button widths on login page
- Homepage content reordering (User Login first)
- All documentation updates (README, ARCHITECTURE, RELEASE_NOTES, LEARNINGS, ROADMAP, TASKLIST)
- Phase 4B: Client credentials OAuth grant implementation
- Phase 4B: OAuth token validation middleware (lib/oauth/middleware.mjs)
- Phase 4C: Bidirectional permission APIs (PUT/DELETE methods)
- Phase 4C: Fixed OAuth token validation in GET endpoint
- Phase 4D: Launchmass SSO permissions helper library (lib/ssoPermissions.mjs)
- PIN verification modal UX enhancements
- OAuth admin session isolation fix
- Camera app role authorization fix
- Phase 5: Launchmass Admin UI Integration
  - Batch sync endpoint for manual SSO reconciliation
  - "Sync to SSO" button with loading states and detailed results
  - Automatic sync on all permission operations (grant/revoke/change-role)
  - Admin-only access control
