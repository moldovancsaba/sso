# Roadmap

Version: 5.29.0  
Last updated: 2026-05-10T00:00:00.000Z

## Recently Delivered

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

## Next Roadmap Phases

### Phase 1: Documentation and operator alignment
- Reconcile core markdown docs
- Reconcile `pages/docs` surfaces with the shipped runtime contract
- Update issue and board states to reflect completed remediation work

### Phase 2: Apple Sign In
- Add Apple login provider
- Reuse the current callback-state and CSRF model
- Document first-login-only profile data handling and private relay email behavior

### Phase 3: Passkeys and stronger session assurance
- Design passkey enrollment and recovery flows
- Decide whether passkeys are a primary login method, a step-up factor, or both
- Define re-auth requirements for sensitive admin actions

### Phase 4: Provider expansion
- Microsoft login
- GitHub login
- LinkedIn or Discord only if product demand justifies them

### Phase 5: Enterprise federation
- Evaluate OIDC enterprise connections
- Evaluate SAML support
- Define SCIM provisioning scope
- Separate enterprise federation concerns from public social login concerns

### Phase 6: Zero-trust-oriented hardening
- Shorter-lived high-risk sessions
- Step-up authentication for sensitive workflows
- Stronger token binding and continuous session verification where justified

## Explicitly Not Yet Delivered

- Apple Sign In
- Passkeys
- SAML
- SCIM
- Zero-trust session architecture
