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
- Account Management System (v5.29.0)
  - Cross-app activity dashboard for admins (Phase 4)
    - MongoDB aggregation with user/app name enrichment
    - Filterable by time range (24h/7d/30d/all) and event type
    - Real-time activity feed with expandable log details
  - Admin manual account linking (Phase 5)
    - Link Social Provider section in admin user modal
    - Email consistency validation (prevents security issues)
    - Support for Facebook and Google providers
  - Account unlinking system (Phases 3, 6, 7)
    - User-initiated unlinking from account dashboard
    - Admin-initiated unlinking from admin user modal
    - Multi-layer safety validation (prevents account lockout)
    - Confirmation dialogs for all destructive operations
  - Safety-first architecture
    - Always require at least 1 login method
    - UI disabled + API validation + DB re-check
    - Clear error messages and guidance
  - Comprehensive audit logging
    - All linking/unlinking operations tracked
    - Before/after state tracking
    - Admin and user action differentiation
- Critical Bug Fixes (v5.29.0)
  - Session timeout bug fix (premature logout after <10 minutes)
    - Fixed /api/users/session-status to use cookie-based validation
    - Was checking req.session (undefined) causing false expiration
    - Sessions now properly extend on activity (sliding window)
