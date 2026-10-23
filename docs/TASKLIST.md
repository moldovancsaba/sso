# Tasklist

Version: 5.43.2  
Last updated: 2026-10-23T00:00:00.000Z

## Active

- Cross-product privacy erasure initiative (#135–#143; Camera #509 blocks backup erasure proof): SSO #135 ledger and #143 subject-proof contract are implemented. The Camera resolver, Facebook callback, product deletion adapters, coordinator, accessible request and admin surfaces, evidence PDF, and end-to-end production gate remain sequenced work. Do not claim the workflow is production-ready until required issues and the backup prerequisite are complete.

- OAuth client branding initiative — open issues (the data model and write-time validation, #97/#98, shipped in 5.41.0; see `docs/ROADMAP.md`):
  - #99 Logo asset ingestion pipeline
  - #100 Branding audit trail and rollback
  - #101 OAuth client branding editor (color tokens, welcome text)
  - #102 Logo upload widget
  - #103 Custom CSS editor with live validation diagnostics
  - #104 Branding history console
  - #105 Login and register branding rendering
  - #106 Canonical scope metadata for consent (remove the duplicate hardcoded scope map)
  - #107 Client theming architecture docs and GDS exception record
  - #108 Client theming release gate
  - #109 RFC: client-scoped branding self-service access model
- Untracked gap: the desktop OAuth clients table (`pages/admin/oauth-clients.js`) has no redirect URIs column — only the mobile card layout shows them. Named in `docs/CHANGELOG.md` [5.39.5]; #96 (5.40.1) added the Client ID column but not this one.

## Next Implementation Priorities

1. Apple Sign In
   - Add Apple provider support to the social login surface
   - Follow the same callback-state and CSRF contract as Google and Facebook

2. Passkey design and implementation plan
   - Define whether passkeys will be primary login, step-up auth, or both
   - Document storage, recovery, and device-loss flows before coding

3. Provider expansion strategy
   - Prioritize Microsoft, Apple, and GitHub before lower-value providers
   - Avoid adding more providers until docs and operator guidance are aligned

4. Enterprise federation runtime
   - Turn the new org and enterprise-connection groundwork into live OIDC / SAML federation
   - Define and implement SCIM provisioning boundaries separately from social login
