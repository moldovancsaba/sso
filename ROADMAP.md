# ROADMAP (v5.0.0)

Last updated: 2025-10-03T09:30:00.000Z

---

## ✅ COMPLETED: Phase 2 - OAuth2/OIDC Implementation (Q4 2025)

**Status**: Complete (2025-10-03)
**Security Score**: 75% → 95%

### Delivered:
- ✅ Complete OAuth2 Authorization Code Flow with PKCE (S256/plain)
- ✅ OIDC-compliant ID tokens with user claims
- ✅ JWT access tokens (RS256, 1 hour lifetime)
- ✅ Refresh token rotation (SHA-256, 30 days lifetime)
- ✅ Token introspection and revocation endpoints
- ✅ OIDC discovery (/.well-known/openid-configuration)
- ✅ JWKS endpoint (/.well-known/jwks.json)
- ✅ User consent flow with UI
- ✅ Admin UI for OAuth client management
- ✅ Scope-based access control (OIDC + app-specific)
- ✅ 4 MongoDB collections (oauthClients, authorizationCodes, refreshTokens, userConsents)
- ✅ Complete documentation (PHASE2_PLAN.md, OAUTH2_SETUP_GUIDE.md, OAUTH2_INTEGRATION.md)

### Impact:
- External domain SSO now working for narimato.com
- Subdomain SSO continues working for cardmass.doneisbetter.com and playmass.doneisbetter.com
- Production-ready authorization server

---

## Milestone: Phase 3 - Production Deployment & Integration (Q4 2025)

**Priority**: High
**Dependencies**: Phase 2 Complete, MongoDB Atlas, Vercel, Domain DNS
**Target**: 2025-10-10

### Planned:
1. **Production Deployment**:
   - Deploy SSO service to production (sso.doneisbetter.com)
   - Verify RSA keys in production environment (secure storage)
   - Configure production environment variables
   - Test OIDC discovery and JWKS endpoints in production

2. **OAuth Client Registration**:
   - Create OAuth client for narimato.com via admin UI
   - Configure redirect URIs (production + development)
   - Set allowed scopes: openid, profile, email, read:cards, write:cards, read:rankings
   - Document client_id and client_secret (secure storage)

3. **Narimato.com Integration**:
   - Implement OAuth2 client in narimato.com codebase
   - Add PKCE generation (S256)
   - Implement authorization flow (redirect to SSO)
   - Implement token exchange and storage
   - Implement refresh token rotation
   - Add logout with token revocation
   - Test complete flow end-to-end

4. **Security Hardening**:
   - Review and rotate all secrets (SESSION_SECRET, CSRF_SECRET, etc.)
   - Enable production security headers
   - Configure rate limiting for OAuth endpoints
   - Set up monitoring for token usage and errors

5. **Documentation**:
   - Update deployment guide with production steps
   - Document OAuth client management procedures
   - Create runbook for common OAuth issues
   - Update architecture diagrams with OAuth flow

---

## Milestone: Phase 4 - Additional OAuth Clients (Q4 2025 / Q1 2026)

**Priority**: Medium
**Dependencies**: Phase 3 Complete

### Planned:
1. Register OAuth clients for additional applications:
   - cardmass.doneisbetter.com (if needed for API access)
   - playmass.doneisbetter.com (if needed for API access)
   - Any future external domain applications

2. Implement OAuth2 scopes for additional resources:
   - Fine-grained permissions per application
   - Resource-specific scopes

---

## Milestone: Operational Resilience & Monitoring (Q1 2026)

**Priority**: Medium
**Dependencies**: Production deployment stable

### Planned:
- Add audit logs for admin actions (create/update/delete users, OAuth clients)
- Structured error telemetry (privacy-safe)
- Background cleanup for expired authorization codes and refresh tokens
- Token usage analytics dashboard
- Alert system for security events
- Performance monitoring for token generation

---

## Milestone: Advanced Features (Q1 2026)

**Priority**: Low
**Dependencies**: Phase 4 Complete

### Planned:
- Optional expiry policy per resourceType
- Admin UI for resource password lifecycle
- CORS/domain strategy per organization (future enhancement)
- Multi-factor authentication for admin login
- OAuth2 device flow (for CLI applications)
- OAuth2 client credentials flow (for machine-to-machine)

---

## Notes

### Deployment Prerequisites
1. MongoDB Atlas connection string configured
2. RSA key pair generated and securely stored
3. Environment variables configured (see OAUTH2_SETUP_GUIDE.md)
4. DNS configured for sso.doneisbetter.com
5. SSL certificates configured (handled by Vercel)

### Integration Prerequisites (per client application)
1. OAuth client registered in SSO admin UI
2. Client_id and client_secret documented securely
3. Redirect URIs configured (production + development)
4. Scopes selected based on application needs
5. Integration code implemented (see OAUTH2_INTEGRATION.md)
