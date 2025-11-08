# LEARNINGS (v5.23.0)

Last updated: 2025-11-05T15:00:00.000Z

Backend:
- MessMass cookie session pattern adapts cleanly to Pages Router with minimal dependencies
- Implementing cookie parse/serialize inline avoids extra deps (keeps ESM simple)
- ISO 8601 UTC timestamps with milliseconds across DB/doc flows improves traceability

Process:
- Version bump + docs sync should be automated to prevent drift
- Removing legacy endpoints sharply reduces ambiguity for integrators

Security:
- Strict CORS per domain is essential for public SSO services
- Avoid embedding secrets in source (deprecated duplicate routes were neutralized)
- Admin-bypass for resource passwords must be server-side only
- Cookie-based SSO across subdomains requires Domain=.example.com and SameSite=None; Secure in production
- Server-side session storage with token hashing (SHA-256) is mandatory to enable revocation and limit blast radius
- Rate limiting on auth endpoints is critical; 5 attempts per 15 minutes is a good default
- CSRF protection via double-submit cookie + HMAC is effective without server sessions
- Always log security events with ISO 8601 UTC timestamps for auditability

Backend (Stability):
- Avoid import-time DB client instantiation in serverless environments; lazily create the Mongo client inside getDb() to prevent function cold-start crashes and "Empty reply from server".

Session Management (Critical):
- Cookie-only validation is insufficient for proper session management; always validate against database to enable revocation
- Session validation must check BOTH cookie expiration AND database state (expired, revoked, etc.)
- Sliding session expiration should be updated on EVERY validation, not just at login
- Without database validation, sessions cannot be revoked and expired database sessions remain valid until cookie expires
- This caused the "20-30 second logout" bug where cookie was valid but database session had different state

Settings Management:
- System-wide settings should be stored in database (not just environment variables) to allow runtime toggling
- Environment variables should override database settings for hard-disable scenarios (e.g., development)
- Use a single `systemSettings` document with `_id: 'system'` for centralized configuration
- Making async functions (like shouldTriggerPin) requires updating all callers to await them

User Experience:
- Features like PIN verification that depend on external services (email) should be easy to disable without redeployment
- Admin UI toggles are more user-friendly than editing environment variables or database directly
- Always provide clear feedback when settings change (success messages, state indicators)
