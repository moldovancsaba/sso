[2025-09-11T13:35:02.000Z] Plan: Refactor SSO to DB-backed admin auth + resource passwords. Owner: Backend/Platform. Source: AI
- Hosting: Vercel; DB: MongoDB Atlas
- CORS: SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com
- Admin alias email: sso@doneisbetter.com
- Legacy username endpoints removed
[2025-09-13T17:31:37.000Z] Plan: Proceed on production admin API via cookie+curl; next: scope multi-tenant orgs + org users CRUD (RBAC, docs). Timestamps: ISO globally; ROADMAP uses CET per project rule. Source: AI
[2025-09-14T08:25:57.000Z] Update: Implemented UUIDs for users (backfill done), added organizations & org-users endpoints (UUID), removed .mjs duplicates, preparing version bump and docs updates. Source: AI
[2025-09-15T17:36:07.000Z] Plan: Bump to v4.8.0, sync docs, push to main, trigger Vercel deploy, then validate admin login via curl (login/validate/logout). Ensure MONGODB_URI is set in Vercel env if needed. Source: AI
[2025-09-15T18:25:45.000Z] Plan: Add fast-fail Mongo client timeouts and explicit 503 mapping for DB issues; bump to v4.8.0; redeploy and re-validate production admin login. Source: AI
[2025-09-16T18:14:33.000Z] Plan: Implement secure one-time admin magic link endpoint and generator; bump to v4.8.0; deploy and provide master URL to access /admin. Source: AI
[2025-09-17T11:43:02.000Z] Plan: Add development-only passwordless admin login (gated by env, disabled in production), update UI and docs, bump to v4.8.0. Source: AI

