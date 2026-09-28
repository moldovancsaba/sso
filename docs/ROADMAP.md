# Roadmap

Version: 5.41.0  
Last updated: 2026-09-28T00:00:00.000Z

## In Progress

### OAuth client branding (#97–#109)
- #97 and #98 are closed by #110 and #111 (the `branding` data model, its versioned write path, and write-time custom-CSS and contrast validation — released in 5.41.0)
- Open: #99 logo asset ingestion, #100 branding audit trail and rollback, #101 branding editor UI, #102 logo upload widget, #103 custom CSS editor with live diagnostics, #104 branding history console, #105 login/register branding rendering, #106 canonical scope metadata for consent, #107 theming docs and GDS exception record, #108 theming release gate, #109 self-service branding access RFC
- No page renders the `branding` sub-document yet; #105 is the first user-visible piece

## Recently Delivered

### September 2026 (5.40.1–5.41.0)
- The desktop OAuth clients table shows each client's `client_id` with a copy control (#96, 5.40.1)
- OAuth client branding contract: a `branding` sub-document on `oauthClients` with a single versioned write path and optimistic concurrency (#110, closes #97)
- Write-time custom-CSS validation through GDS `validateCreatorCss` and 3.0:1 WCAG contrast enforcement for brand colors (#111, closes #98)
- `GET /api/apps/{clientId}/users`: a client lists its own users for its rights management (#115)

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
- Client branding on the login, register, and consent pages (#105)
