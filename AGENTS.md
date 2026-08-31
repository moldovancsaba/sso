# AGENTS.md

Operating rules for AI coding assistants working in this repo live in
[`CLAUDE.md`](CLAUDE.md) (branding policy, quality gate, pre-authorized operations,
environment quirks). This file is the command reference; keep it in sync with
`CLAUDE.md` Section 8 and with the real `package.json` scripts.

## Repo Workflows

### Root app

**Requires Node 24.x.** `engines.node` is `24.x` with `engine-strict=true`, so on any
other major version every command below fails at install time with `EBADENGINE`.
`.nvmrc` pins the version; see `CLAUDE.md` Section 7.1 for why 24.x and for the Vercel
deprecation dates behind it.

- Install dependencies: `npm install`
- Bootstrap local env from the example file: `npm run setup`
- Start development server: `npm run dev` (Next.js on port `5500`)
- Build production app: `npm run build`
- Start production server: `npm run start`
- Run lint: `npm run lint`
- Run type checks: `npm run type-check`
- Run tests: `npm test`
- Run repository guardrails: `npm run guard:repo`
- Run documentation maintenance checks: `npm run check:docs`
- Run the full pre-push/pre-merge gate (lint + type-check + test + build + guardrails + docs + GDS manifest/compliance): `npm run verify`
- Test MongoDB connection: `npm run test-connection`
- Sync versioned docs after a version bump: `npm run sync:version`

## Verified Operational Commands

- Bootstrap the legacy admin user: `NEW_ADMIN_TOKEN=<32-hex-token> node scripts/bootstrap-admin.mjs`
- Bootstrap the internal admin OAuth client: `node scripts/bootstrap-admin-client.mjs`
- Migrate legacy admin users into the unified permission system: `node scripts/migrate-admins-to-unified-system.mjs`
- Generate an admin magic link: `NEW_MAGIC_EMAIL=<email> node scripts/generate-magic-link.mjs`
- Check a user record: `node scripts/check-user.mjs <email>`
- Grant admin dashboard access: `node scripts/grant-admin-access.mjs <email> [admin|super-admin]`
  Note: `admin` is the canonical runtime role; `super-admin` is accepted only as a legacy compatibility input.
- Alternative grant-admin invocation: `ADMIN_EMAIL=<email> node scripts/grant-admin-access.mjs`
- Grant admin dashboard permission through app permissions: `EMAIL=<email> node scripts/grant-admin-permission.mjs`
- Grant app access for a user: `node scripts/grant-app-access.mjs <userEmail> [clientId] [role]`
- Verify an OAuth client configuration: `node scripts/verify-oauth-client.mjs <client_id>`
- Verify a stored OAuth client secret against a plaintext secret: `node scripts/verify-client-secret.mjs <client_id> <plaintext_secret>`
- Preview machine-to-machine enablement across OAuth clients: `node scripts/enable-m2m-clients.mjs`
- Apply it: `DRY_RUN=false node scripts/enable-m2m-clients.mjs` (add `M2M_CLIENTS=name1,name2` to narrow it).
- Strip machine access from a client: `REVOKE_M2M="name-a,name-b" DRY_RUN=false node scripts/enable-m2m-clients.mjs`.
- Register the try-on machine client: `node scripts/register-try-on-client.mjs`. Refuses if the client already exists, and writes the secret to a mode-600 file rather than stdout so it never reaches terminal history or CI logs.
  Revocation wins over the eligibility pass, so a named client is never re-granted in the same run.
  Previews by default, unlike the older scripts here, because it writes production auth
  config. Never grants `client_credentials` to a public client, and refuses to run on a
  checkout where `manage_permissions` is not a registered scope.
- Register the management staff agent: `node scripts/register-management-staff-agent-client.mjs`.
  Requires `MONGODB_URI`. Grants `client_credentials` and `management:staff` and nothing
  else, refuses if the client already exists, and refuses to run on a checkout where
  `management:staff` is not a registered scope — `allowed_scopes` is not validated at
  registration time, so without that guard it would create a client that looks correct but
  can never obtain a token. Writes the secret to a mode-600 file (override with
  `SECRET_OUT`) rather than stdout, so it never reaches terminal history or CI logs.
- Preview duplicate public-account merges by email: `DRY_RUN=true node scripts/merge-duplicate-accounts.mjs`
- Apply duplicate public-account merges by email: `node scripts/merge-duplicate-accounts.mjs`
- Test email delivery configuration: `node scripts/test-email-config.mjs <email>`

## Notes

- Root app env defaults live in [`.env.example`](.env.example).
- The repo contains many one-off scripts under [`scripts/`](scripts); add them here only after their invocation is verified in code or docs.
- Authoritative Design/UI/UX SSOT lives in [general-design-system](https://github.com/sovereignsquad/general-design-system).  
- `docs/DESIGN_SYSTEM.md` tracks this repo’s local adapter state, migration progress, and local implementation notes, and is not the canonical rule source.
