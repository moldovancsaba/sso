# Tasklist

Version: 5.29.0  
Last updated: 2026-05-11T12:00:00.000Z

## Active

- No active remediation tasks. The May 2026 security and documentation cleanup is complete.

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
