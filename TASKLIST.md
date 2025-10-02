# TASKLIST (v5.0.0)

Last updated: 2025-09-17T11:43:02.000Z

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
11) Redeploy v5.0.0 and validate admin login in production (login/validate/logout)
   - Owner: Platform
   - Expected Delivery: 2025-09-15T18:00:00.000Z
   - Priority: P1
12) Add fast-fail MongoDB client timeouts + 503 mapping; bump to v5.0.0 and redeploy
   - Owner: Platform
   - Expected Delivery: 2025-09-15T18:25:45.000Z
   - Priority: P1

Completed:
- Initial planning recorded and endpoints implemented (admin + resource passwords)
