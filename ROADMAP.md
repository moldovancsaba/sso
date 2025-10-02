# ROADMAP (v4.8.0)

Last updated: 2025-09-17T11:43:02.000Z

## Milestone: Harden admin & password services (Q4 2025)
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
