# ROADMAP (v4.2.0)

Last updated: 2025-09-11T14:28:29.000Z

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
