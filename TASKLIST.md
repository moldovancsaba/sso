# TASKLIST (v5.29.0)

Last updated: 2025-12-21T09:00:00.000Z

Active:
(No active tasks)

Pending (Future):
1) Add Apple Login (required for iOS apps)
   - Owner: Backend
   - Expected Delivery: TBD
   - Priority: P2
2) Email notifications for app access approval/denial
   - Owner: Backend
   - Expected Delivery: TBD
   - Priority: P2
3) Cross-app activity dashboard for admins
   - Owner: Frontend
   - Expected Delivery: TBD
   - Priority: P3
4) Manual account linking UI (link social providers from dashboard)
   - Owner: Frontend + Backend
   - Expected Delivery: TBD
   - Priority: P3
5) Account unlinking feature (remove linked methods)
   - Owner: Frontend + Backend
   - Expected Delivery: TBD
   - Priority: P3

Completed (v5.29.0 - December 2025):
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
- Google Login integration (v5.29.0)
  - OAuth 2.0 flow with Google Cloud Console
  - Automatic account linking by email
  - Google profile pictures in admin dashboard
  - Comprehensive setup documentation
- Enterprise Security Hardening (v5.29.0)
  - 5-phase implementation complete
  - Enhanced rate limiting for admin endpoints
  - Security headers via Next.js Edge Middleware
  - Input validation with Zod
  - Session hardening (4-hour timeout, device fingerprinting)
  - Enhanced audit logging with MongoDB collection
- Next.js CVE-2025-66478 security fix (v5.27.x)
  - Updated Next.js from 15.5.3 to 15.5.9
  - React2Shell vulnerability patched
- Unified Account Linking System (v5.29.0)
  - One person, one email = one account
  - Automatic linking across Email+Password, Facebook, Google, Magic Link
  - Smart registration (adds password to social-only accounts)
  - Helpful login error messages
  - Account dashboard with login methods display
  - Migration tool for merging duplicate accounts
  - Comprehensive documentation (docs/ACCOUNT_LINKING.md)
