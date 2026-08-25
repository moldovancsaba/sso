# Roadmap

Version: 5.37.0  
Last updated: 2026-08-21T00:00:00.000Z

## Recently Delivered

### GDS 6.0.0 migration completed in August 2026
- Migrated the design-system dependency from the abandoned `@doneisbetter/gds-*@3.0.0` npm mirror directly to `@sovereignsquad/gds-*@6.0.0`, the current release line published by the upstream `sovereignsquad/general-design-system` repo on GitHub Packages
- Migrated `lib/theme/mantineTheme.js` from `extendGdsTheme` to `createPublicBrandTheme`, following upstream's governance change making `extendGdsTheme` a consumer-prohibited pattern as of this release line
- Replaced the hand-rolled Google/Facebook login buttons on `pages/login.js` with the canonical `ProviderIdentityButtonGroup`, closing SSO's oldest tracked GDS exception
- Confirmed via a full upstream changelog review that neither breaking change shipped between `4.1.3` and `6.0.0` (a component relocation, a brand-palette re-base) affects any component SSO actually uses

### Security remediation slice completed in July 2026
- Fixed admin session identity resolution to use the database-verified session record instead of an unsigned cookie field
- Closed an OAuth consent-approval gap that allowed authorization codes to be issued without server-side request validation
- Enforced CSRF protection (Origin/Referer allowlist) on all state-changing admin and public-session endpoints
- Migrated admin password storage to bcrypt with transparent legacy-format migration
- Wired up rate limiting across public auth, magic-link/PIN, and OAuth endpoints, and fixed a hang bug in the rate-limit helper
- Closed a protocol-relative open-redirect gap
- Fixed three admin login flows that issued unparseable session cookies
- Replaced generic "Internal server error" responses with actionable detail across authenticated admin/API routes
- Delivered Phase 1 (documentation and operator alignment): reconciled core markdown docs and `pages/docs` surfaces with the shipped runtime contract, see `docs/CHANGELOG.md` [5.31.0]

### Multi-app authorization foundation
- Central `appPermissions` model
- OAuth client authorization checks
- Admin permission management paths
- App-to-app permission synchronization paths

### Security remediation slice completed in May 2026
- Removed duplicate and credential-bearing active routes
- Added shared callback-state parsing for social login flows
- Enforced callback CSRF validation in Google and Facebook login
- Enforced real bearer-token validation in access-request flows
- Unified public session cookie behavior across login paths
- Normalized permission roles and statuses at runtime
- Normalized legacy admin roles to `admin`
- Hardened redirect handling in magic-link flows
- Tightened high-risk admin mutations so fresh-auth checks also require a bound unified public session
- Restored organization CRUD and org-user CRUD admin APIs
- Added enterprise connection inventory groundwork for future OIDC, SAML, and SCIM rollout

## Next Roadmap Phases

### Phase 2: Apple Sign In
- Add Apple login provider
- Reuse the current callback-state and CSRF model
- Document first-login-only profile data handling and private relay email behavior
- Apple sends the user's name payload **only on first authorization**, so account linking must never depend on it being available again; the email claim is the durable identity signal
- Requires Apple Developer configuration: Service ID, team ID, key ID, and private key
- Apple is stricter than Google/Facebook about exact redirect-URI alignment and callback mode

### Phase 3: Passkeys and stronger session assurance
- Design passkey enrollment and recovery flows
- Decide whether passkeys are a primary login method, a step-up factor, or both
- Define re-auth requirements for sensitive admin actions

### Phase 4: Provider expansion
- Microsoft and GitHub before lower-value providers
- LinkedIn or Discord only if product demand justifies them
- Any new provider must reuse the hardened callback-state, CSRF, and public-session seams rather than introducing a parallel path

### Phase 5: Enterprise federation runtime
- Turn enterprise connection inventory into live enterprise OIDC connections
- Add SAML runtime once the contract is frozen
- Define and implement scoped SCIM provisioning
- Keep enterprise federation concerns separate from public social login concerns

### Phase 6: Deeper zero-trust hardening
- Decide whether additional step-up factors should be passkeys, PIN, or both
- Shorten high-risk session lifetimes further where the operator cost is justified
- Expand continuous verification beyond the current admin-mutation assurance gate if production signals justify it

## Board Note

This file is the single source of truth for roadmap phases and is version-enforced by
`npm run check:docs`. Issues #37–#41 previously restated these same phases on the GitHub
board without being enforced anywhere; their content is absorbed here and they are closed.
Schedule a phase by opening a real implementation issue at that time.

## Explicitly Not Yet Delivered

- Apple Sign In
- Passkeys
- Live SAML federation
- Live SCIM provisioning
- End-to-end zero-trust session architecture
