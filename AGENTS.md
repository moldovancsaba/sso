# AGENTS.md

## Repo Workflows

### Root app

- Install dependencies: `npm install`
- Bootstrap local env from the example file: `npm run setup`
- Start development server: `npm run dev` (Next.js on port `5500`)
- Build production app: `npm run build`
- Start production server: `npm run start`
- Run lint: `npm run lint`
- Run type checks: `npm run type-check`
- Run tests: `npm test`
- Validate runtime config: `npm run validate-config`
- Test MongoDB connection: `npm run test-connection`
- Sync versioned docs after a version bump: `npm run sync:version`

### Client package

Run these from [`/Users/moldovancsaba/Projects/sso/client`](/Users/moldovancsaba/Projects/sso/client):

- Build the package: `npm run build`
- Watch and rebuild during development: `npm run dev`
- Clean build output: `npm run clean`

## Verified Operational Commands

- Bootstrap the legacy admin user: `NEW_ADMIN_TOKEN=<32-hex-token> node scripts/bootstrap-admin.mjs`
- Bootstrap the internal admin OAuth client: `node scripts/bootstrap-admin-client.mjs`
- Generate an admin magic link: `NEW_MAGIC_EMAIL=<email> node scripts/generate-magic-link.mjs`
- Check a user record: `node scripts/check-user.mjs <email>`
- Grant admin dashboard access: `node scripts/grant-admin-access.mjs <email> [admin|super-admin]`
  Note: `admin` is the canonical runtime role; `super-admin` is accepted only as a legacy compatibility input.
- Alternative grant-admin invocation: `ADMIN_EMAIL=<email> node scripts/grant-admin-access.mjs`
- Grant admin dashboard permission through app permissions: `EMAIL=<email> node scripts/grant-admin-permission.mjs`
- Grant app access for a user: `node scripts/grant-app-access.mjs <userEmail> [clientId] [role]`
- Test email delivery configuration: `node scripts/test-email-config.mjs <email>`

## Notes

- Root app env defaults live in [`.env.example`](/Users/moldovancsaba/Projects/sso/.env.example).
- The repo contains many one-off scripts under [`/Users/moldovancsaba/Projects/sso/scripts`](/Users/moldovancsaba/Projects/sso/scripts); add them here only after their invocation is verified in code or docs.
