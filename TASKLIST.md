# TASKLIST (v5.0.0)

Last updated: 2025-10-03T09:30:00.000Z

---

## Active Tasks - Phase 3: Production Deployment & Integration

### P1 - Critical (Deploy to Production)

1) **Deploy SSO v5.0.0 to Production**
   - Owner: Platform/DevOps
   - Expected Delivery: 2025-10-05T17:00:00.000Z
   - Priority: P1
   - Details:
     - Deploy to sso.doneisbetter.com via Vercel
     - Generate production RSA key pair
     - Configure production environment variables (JWT_ISSUER, JWT_KEY_ID, keys paths)
     - Verify OIDC discovery endpoint: GET /api/.well-known/openid-configuration
     - Verify JWKS endpoint: GET /api/.well-known/jwks.json
     - Test admin login in production

2) **Create OAuth Client for Narimato.com**
   - Owner: Platform
   - Expected Delivery: 2025-10-06T12:00:00.000Z
   - Priority: P1
   - Details:
     - Login to production admin panel (sso.doneisbetter.com/admin)
     - Navigate to OAuth Clients
     - Create client with:
       * Name: "Narimato Card Game"
       * Redirect URIs: https://narimato.com/auth/callback, http://localhost:3000/auth/callback
       * Allowed Scopes: openid, profile, email, read:cards, write:cards, read:rankings, offline_access
     - Document client_id and client_secret securely (1Password/secure vault)
     - Test client creation via API: GET /api/admin/oauth-clients

### P2 - High (Narimato Integration)

3) **Implement OAuth2 Client in Narimato.com**
   - Owner: Frontend/Backend (Narimato team)
   - Expected Delivery: 2025-10-08T17:00:00.000Z
   - Priority: P2
   - Details:
     - Follow OAUTH2_INTEGRATION.md guide
     - Implement PKCE generation (SHA-256)
     - Add "Login with SSO" button
     - Implement authorization flow (redirect to sso.doneisbetter.com)
     - Implement token exchange (code → tokens)
     - Store tokens securely (httpOnly cookies or secure storage)
     - Implement token refresh on expiry
     - Add logout with token revocation

4) **End-to-End OAuth Flow Testing**
   - Owner: QA/Platform
   - Expected Delivery: 2025-10-09T17:00:00.000Z
   - Priority: P2
   - Details:
     - Test complete authorization flow (login → consent → callback → tokens)
     - Test token refresh after 1 hour expiry
     - Test token revocation on logout
     - Test PKCE validation (invalid code_verifier should fail)
     - Test expired authorization code (should fail after 10 minutes)
     - Test consent persistence (second login should skip consent)
     - Test scope restrictions (tokens should only have requested scopes)

### P3 - Medium (Documentation & Security)

5) **Security Hardening Review**
   - Owner: Security/Platform
   - Expected Delivery: 2025-10-10T17:00:00.000Z
   - Priority: P3
   - Details:
     - Review and rotate all production secrets
     - Verify CORS configuration (SSO_ALLOWED_ORIGINS)
     - Enable rate limiting for OAuth endpoints
     - Set up monitoring for token usage (CloudWatch/Datadog)
     - Configure alerts for OAuth errors

6) **Production Runbook Creation**
   - Owner: Platform
   - Expected Delivery: 2025-10-10T17:00:00.000Z
   - Priority: P3
   - Details:
     - Document OAuth client creation procedure
     - Document token revocation procedure (emergency)
     - Document key rotation procedure
     - Create troubleshooting guide for common OAuth errors
     - Document monitoring dashboards and alerts

---

## Completed Tasks - Phase 2: OAuth2/OIDC Implementation

✅ **Phase 2 Complete** (2025-10-03T09:15:22.000Z)

- Design OAuth2 data model and database schema
- Install OAuth2/JWT dependencies (jsonwebtoken, bcrypt)
- Generate RSA key pair (2048-bit) for JWT signing
- Create OAuth2 client registration module (lib/oauth/clients.mjs)
- Create JWT token generation module (lib/oauth/tokens.mjs)
- Implement OIDC ID tokens with user claims
- Add scope-based access control (lib/oauth/scopes.mjs)
- Update admin UI for OAuth client management
- Implement authorization endpoint (pages/api/oauth/authorize.js)
- Create user consent flow UI (pages/oauth/consent.js)
- Implement token endpoint (pages/api/oauth/token.js)
- Implement token introspection endpoint (pages/api/oauth/introspect.js)
- Implement token revocation endpoint (pages/api/oauth/revoke.js)
- Add OIDC discovery endpoint (pages/api/.well-known/openid-configuration.js)
- Create JWKS endpoint (pages/api/.well-known/jwks.json.js)
- Document OAuth2 integration (PHASE2_PLAN.md, OAUTH2_SETUP_GUIDE.md, OAUTH2_INTEGRATION.md)
- Update version to 5.0.0 and commit to GitHub
- Update RELEASE_NOTES.md with Phase 2 summary
- Test build and verify all endpoints compile
- Verify OIDC discovery endpoint returns proper metadata
- Verify JWKS endpoint returns public key in JWK format

---

## Completed Tasks - Phase 1: Security Hardening

✅ **Phase 1 Complete** (2025-10-02T11:54:33.000Z)

- Server-side session management (lib/sessions.mjs)
- Rate limiting (lib/middleware/rateLimit.mjs)
- CSRF protection (lib/middleware/csrf.mjs)
- Structured security logging (lib/logger.mjs)
- Subdomain SSO support (Domain=.doneisbetter.com)
- Magic link authentication
- Development bypass for passwordless login
- MongoDB timeouts and 503 error mapping

---

## Completed Tasks - Foundation

✅ **Foundation Complete** (2025-09-17 and earlier)

- DB-backed admin authentication
- HttpOnly cookie session (admin-session)
- Admin endpoints (login, logout, users CRUD)
- Resource password service with admin bypass
- CORS configuration for production
- UUID identifiers for all entities
- Multi-tenant organizations and org users endpoints
- RBAC extension (super-admin, admin roles)
- Documentation alignment and version sync automation
- Backfill UUIDs for existing users
- Production deployment and validation

---

## Future Phases

### Phase 4: Additional OAuth Clients (Q4 2025 / Q1 2026)
- Register OAuth clients for cardmass.doneisbetter.com
- Register OAuth clients for playmass.doneisbetter.com
- Implement fine-grained scopes for additional resources

### Phase 5: Operational Resilience (Q1 2026)
- Audit logs for admin actions and OAuth operations
- Structured error telemetry
- Background cleanup for expired tokens
- Token usage analytics dashboard
- Security event alert system
- Performance monitoring

### Phase 6: Advanced Features (Q1 2026)
- Optional expiry policy per resourceType
- Admin UI for resource password lifecycle
- Multi-factor authentication for admin login
- OAuth2 device flow (CLI applications)
- OAuth2 client credentials flow (machine-to-machine)
