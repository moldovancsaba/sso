# TASKLIST (v5.23.0)

Last updated: 2025-10-13T14:35:00.000Z

Active:
1) Refactor to DB-backed admin auth and resource passwords
   - Owner: Backend
   - Expected Delivery: 2025-09-11T13:35:02.000Z
   - Priority: P1
2) Configure Vercel env + CORS for sso.doneisbetter.com
   - Owner: DevOps
   - Expected Delivery: 2025-09-11T13:35:02.000Z
   - Priority: P1
3) Documentation alignment and version sync automation
   - Owner: Platform
   - Expected Delivery: 2025-09-11T13:35:02.000Z
   - Priority: P1
4) Verify production admin API access via cookie+curl (login, validate, list users)
   - Owner: Platform
   - Expected Delivery: 2025-09-13T18:00:00.000Z
   - Priority: P1
5) Design multi-tenant data model (organizations, orgUsers) & indexes
   - Owner: Backend
   - Expected Delivery: 2025-09-14T12:00:00.000Z
   - Priority: P1
6) Implement admin organizations endpoints (GET/POST, GET/PATCH/DELETE)
   - Owner: Backend
   - Expected Delivery: 2025-09-15T17:00:00.000Z
   - Priority: P1
7) Implement admin org-users endpoints (GET/POST, GET/PATCH/DELETE)
   - Owner: Backend
   - Expected Delivery: 2025-09-16T17:00:00.000Z
   - Priority: P1
8) RBAC extension: manage-orgs and manage-org-users
   - Owner: Platform
   - Expected Delivery: 2025-09-15T10:00:00.000Z
   - Priority: P1
9) Documentation updates (README, ARCHITECTURE, API Reference, ROADMAP)
   - Owner: Platform
   - Expected Delivery: 2025-09-16T19:00:00.000Z
   - Priority: P1
10) Backfill UUIDs for existing users in production (one-time)
   - Owner: Platform
   - Expected Delivery: 2025-09-13T18:30:00.000Z
   - Priority: P1
11) Redeploy v5.23.0 and validate admin login in production (login/validate/logout)
   - Owner: Platform
   - Expected Delivery: 2025-09-15T18:00:00.000Z
   - Priority: P1
12) Add fast-fail MongoDB client timeouts + 503 mapping; bump to v5.23.0 and redeploy
   - Owner: Platform
   - Expected Delivery: 2025-09-15T18:25:45.000Z
   - Priority: P1
13) Extend lib/appPermissions.mjs with admin helpers (upsert, update, revoke, DTO mapping)
   - Owner: AI-Backend
   - Expected Delivery: 2025-10-14T15:00:00.000Z
   - Priority: P0
14) Implement /api/admin/app-permissions/[userId] API endpoint (GET/POST/PATCH/DELETE)
   - Owner: AI-Backend
   - Expected Delivery: 2025-10-14T18:00:00.000Z
   - Priority: P0
15) Add "App Permissions" section to pages/admin/users.js user details modal
   - Owner: AI-Frontend
   - Expected Delivery: 2025-10-14T21:00:00.000Z
   - Priority: P0
16) Wire up API calls for grant/revoke/update permissions with state management
   - Owner: AI-Frontend
   - Expected Delivery: 2025-10-15T12:00:00.000Z
   - Priority: P0
17) Documentation updates (README, ARCHITECTURE, RELEASE_NOTES, LEARNINGS)
   - Owner: AI-Docs
   - Expected Delivery: 2025-10-15T16:00:00.000Z
   - Priority: P0
18) Manual verification on *.doneisbetter.com domain (preview or production)
   - Owner: AI-QA
   - Expected Delivery: 2025-10-15T18:00:00.000Z
   - Priority: P0

Completed:
- Initial planning recorded and endpoints implemented (admin + resource passwords)
