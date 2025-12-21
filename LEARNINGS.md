# LEARNINGS (v5.29.0)

Last updated: 2025-12-21T14:00:00.000Z

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
- Button widths should be consistent across login forms (use CSS classes, not inline styles)
- Content ordering matters: put User Login first (primary action), API docs second (developer resources)

Authentication (OAuth & Social Login):
- Facebook Login integration requires proper app domain configuration in Facebook Developer Console
- Always use UUID (user.id) not MongoDB ObjectId (user._id) when creating sessions
- Session creation must include metadata (IP, user agent) for audit logging
- Use helper functions (setPublicSessionCookie) instead of manual cookie serialization for consistency
- Social provider data should be stored in socialProviders.{provider} field on user document
- Email verification not required for social logins (provider already verified)
- Magic link tokens must be validated AND consumed in same operation to prevent replay
- Magic link session creation MUST use user.id (UUID), not user._id (ObjectId) - this caused the "token consumed but not logged in" bug

Admin UX:
- Public user list must show login methods (email, Facebook, Google) for visibility
- Login method badges help admins understand how users authenticate
- Add Facebook users to admin dashboard so they can be approved for OAuth client apps
- Session check on _app.js should skip admin pages (/admin/*) to prevent false "session expired" alerts
- Admin pages use admin-session cookie, public pages use public-session cookie - don't mix them

Logout Flow:
- OAuth logout requires TWO steps: (1) client app clears local session, (2) SSO clears SSO session
- Client apps must call their own /api/auth/logout first, THEN redirect to SSO /api/oauth/logout
- SSO /api/oauth/logout validates post_logout_redirect_uri against registered client redirect URIs
- Both cookies must be cleared: client's session cookie AND SSO's public-session cookie

OAuth Security (Re-Authentication):
- OIDC prompt parameter is critical for secure logout/login flow
- Without prompt=login, users are auto-logged back in after logout (security issue)
- prompt=login forces credential entry even if SSO session cookie exists
- prompt=consent forces consent screen even if already granted
- Always document prompt parameter usage in integration guides
- Third-party apps should use prompt=login after logout to require re-authentication

OIDC Compliance:
- MUST implement advertised endpoints in discovery document
- Missing /api/oauth/userinfo caused 404 errors for OAuth clients
- UserInfo endpoint returns user claims based on granted scopes (profile, email)
- Always validate access token before returning user information
- Include social login data (profile picture) in UserInfo response

Multi-App Permission Management (Phase 4A):
- SSO must be the single source of truth for user permissions across all OAuth apps
- Admin UI should show ALL apps (even those user doesn't have access to) for complete visibility
- Merge pattern: fetch all OAuth clients + user permissions separately, then merge with O(1) Map lookup
- Role vs Status distinction: role = user/admin/none, status = approved/pending/revoked
- Use optimistic UI updates with per-app loading states (don't block entire modal)
- Confirmation dialogs required for destructive actions (revoke access)
- Modal state cleanup: always clear app permissions state when modal closes to prevent cross-user data leakage
- useEffect dependencies must include selectedUser?.id to trigger permission fetch on user change
- API validation: userId and clientId must be valid UUIDs, role must be enum, status must be enum
- Audit trail: track grantedBy/revokedBy (admin UUID) and timestamps for all permission changes
- Status mapping: users with no permission record default to role='none', status='revoked'
- Role selector defaults: for revoked/pending states, default to 'user' role for grant actions
- Database upsert pattern handles both create and update in single operation (race condition safe)
- ISO 8601 timestamps with milliseconds throughout (createdAt, updatedAt, grantedAt, revokedAt)
- Helper functions: mapPermissionToDTO removes MongoDB _id and ensures consistent field names
- Admin authentication via requireAdmin() helper (HttpOnly cookie validation)

Bidirectional Permission Sync (Phase 4D/5):
- Client credentials OAuth flow enables app-to-app authentication without user context
- Token caching essential for performance (reuse until 5 min before expiration)
- Automatic sync on permission changes prevents drift between systems
- Manual batch sync provides reconciliation capability for initial migration or error recovery
- Graceful degradation: continue local operations even if SSO sync fails (don't block admin workflow)
- Detailed error reporting helps admins understand sync failures per user
- Admin-only batch sync prevents unauthorized mass permission changes
- Visual feedback (loading states, spinners) critical for long-running operations
- Confirmation dialogs required for destructive/bulk operations

Security Hardening (v5.29.0 - 5-Phase Implementation):

Rate Limiting:
- Admin endpoints need stricter rate limits than public endpoints (3 vs 5 login attempts)
- Mutation operations (create/update/delete) should have tighter limits than queries (20 vs 100 req/min)
- Reusable wrapper functions (withAdminMutation, withAdminQuery) enforce consistent rate limiting
- Rate limiters must be applied at the endpoint level, not globally, for granular control

Security Headers:
- Next.js Edge Middleware is the correct place for security headers (applies to all routes)
- Environment-aware CSP policies essential: development needs 'unsafe-eval' for HMR, production doesn't
- X-Frame-Options DENY prevents clickjacking attacks
- Permissions-Policy should disable unused browser features (camera, mic, geolocation, etc.)
- HSTS should only be enabled in production to avoid HTTPS requirement in dev
- CSP script-src 'self' 'unsafe-inline' required for Next.js inline scripts

Input Validation:
- Zod provides type-safe validation with excellent TypeScript integration
- Pre-built composite schemas reduce duplication and ensure consistency
- Validation should happen at API boundary before any business logic
- HTML sanitization required for user-generated content to prevent XSS
- Filename sanitization prevents path traversal attacks
- UUID validation prevents injection attacks via ID parameters
- Email validation should use standard RFC 5322 patterns

Session Security:
- 4-hour session timeout balances security and UX for admin sessions
- Device fingerprinting (SHA-256 of IP + User-Agent) detects suspicious session usage
- Device changes should be logged for security audit trail
- Sliding expiration extends session on activity (prevents mid-work timeouts)
- Session data must include device fingerprint for validation on each request
- HttpOnly cookies prevent XSS-based session theft
- SameSite=Lax prevents CSRF while allowing normal navigation

Audit Logging:
- Comprehensive audit logging is essential for compliance (SOC 2, GDPR)
- All admin actions should be logged with before/after state for change tracking
- Sensitive data (passwords, tokens) must be sanitized from audit logs
- Standardized action constants prevent typos and enable filtering
- Audit logs need efficient indexes: (actorUserId, timestamp), (resource, resourceId), (action, status)
- Metadata (IP, user agent) provides context for security investigations
- Failed actions should be logged separately for anomaly detection
- Audit log retention policies required for storage management
- Helper functions (auditLog) simplify integration and ensure consistency
- Audit API endpoint with pagination essential for admin visibility

Defense in Depth:
- Multiple security layers provide redundancy (rate limiting + validation + audit logging)
- No single security measure is sufficient alone
- Each layer addresses different attack vectors
- Security headers protect at browser level
- Validation protects at application level
- Audit logging enables detection and response
- Short session timeouts limit damage from compromised credentials

Compliance:
- OWASP Top 10 coverage requires addressing multiple categories simultaneously
- Audit trails must be immutable and timestamped (ISO 8601 UTC with milliseconds)
- GDPR requires ability to trace all actions affecting user data
- SOC 2 requires comprehensive logging and access controls
- Separation of concerns: security middleware should be independent of business logic

Account Linking and Unlinking (v5.29.0 - Safety-First Implementation):

Core Principle:
- One person, one email = one account (prevents duplicate accounts and data fragmentation)
- Multi-layer safety validation prevents account lockout (always require at least 1 login method)
- Clear error messages guide users to correct actions ("Add another login method first")

Automatic Linking:
- All authentication flows should automatically link accounts by email address
- Registration with existing social-only account should add password (don't reject)
- Social login with existing password account should link provider (seamless UX)
- Return `isAccountLinking: true` flag so clients know account was linked (not created)
- Helpful error messages when password login attempted on social-only account

Manual Linking (Admin):
- Email consistency validation is critical (prevents linking wrong person's social account)
- Email in link request MUST match user's email (security validation layer)
- Provider cannot already be linked (prevents duplicate provider entries)
- Comprehensive audit logging with `ACCOUNT_LINK_MANUAL` action (traceability)
- Form validation client-side + server-side (defense in depth)

Account Unlinking Safety (Critical):
- NEVER allow unlinking last login method (creates orphaned account)
- Multi-layer validation essential: UI disables → API validates → DB logic re-checks
- Layer 1 (UI): Disable unlink buttons when last method (opacity 0.5 + tooltip)
- Layer 2 (API): Endpoint validates before unlinking, returns 400 if last method
- Layer 3 (DB): validateUnlinking() re-checks in transaction (prevents race conditions)
- Confirmation dialogs required for all destructive operations (users understand impact)
- Auto-refresh after successful unlink (immediate feedback, prevents stale UI)

Error Handling:
- Clear error messages explain WHY operation failed ("Cannot unlink - last method")
- Provide guidance on HOW to proceed ("Add another login method first")
- Don't use generic errors for safety violations (be specific)
- Include available login methods in error response (helps users choose alternative)

Audit Logging:
- Log ALL linking/unlinking operations with before/after state (full traceability)
- Include initiator information (userId, email, role) for accountability
- Log both successful and failed attempts (detect security incidents)
- New audit action constants: ACCOUNT_LINK_MANUAL, ACCOUNT_UNLINK, PASSWORD_REMOVED
- Activity dashboard aggregates logs with user/app names (MongoDB $lookup joins)

Data Model:
- Login methods computed from data, not stored (single source of truth)
- `getUserLoginMethods(user)` computes from passwordHash + socialProviders
- Prevents data inconsistency (stored loginMethods could drift from actual state)
- socialProviders.{provider} stores provider-specific data (id, email, name, picture)
- Timestamps for linkedAt and lastLoginAt track provider usage (audit trail)

Cross-App Activity Dashboard:
- MongoDB aggregation with $lookup joins for human-readable logs (enriches with names)
- Efficient indexing for time-range queries (timestamp descending)
- Filterable by time range (24h/7d/30d/all) and event type (access/permission/login)
- Expandable entries show full log details (before/after state, metadata)
- Auto-refresh button for real-time monitoring (manual trigger, not auto-polling)

Migration Strategy:
- Dry-run mode essential for preview before applying changes (DRY_RUN=true)
- Idempotent scripts safe to run multiple times (no double-merge)
- Keep oldest account as primary (preserves account history and relationships)
- Transfer all data: sessions, OAuth tokens, permissions (complete migration)
- Log all merges for audit trail (compliance requirement)

User Experience:
- Account dashboard shows all linked login methods with badges (visual clarity)
- Color-coded badges for different methods (Email=purple, Facebook=blue, Google=red)
- Unlink buttons directly on badges (minimal clicks for common action)
- Disabled state clearly visible (opacity 0.5 + tooltip on hover)
- Success/error messages positioned near action buttons (immediate feedback)

Admin UI:
- Login Methods section shows user's authentication options (admin visibility)
- Link Social Provider section allows manual linking (support use cases)
- Provider selection buttons appear only for unlinked providers (prevent duplicates)
- Form fields validate email matches user's email (prevent security issues)
- Success/error messages in-context (don't use global alerts for form feedback)

Security Considerations:
- Email verification inherited from any verified method (don't require re-verification)
- Password security: bcrypt (12 rounds), minimum 8 characters (industry standard)
- Session management: all sessions remain valid after linking (no forced logout)
- OAuth security: state parameter CSRF protection (prevents authorization interception)
- Email consistency: manual linking validates email matches (prevents account hijacking)
- Race conditions: validateUnlinking() in transaction prevents concurrent last-method unlinking

Performance:
- Computed login methods avoid extra DB reads (calculate from existing data)
- MongoDB aggregation with $lookup for dashboard (efficient join alternative)
- Proper indexes for time-range queries (timestamp descending)
- Client-side state management reduces unnecessary API calls (cache app permissions)
- Optimistic UI updates with rollback on error (better perceived performance)

Testing Approach (Manual - Tests Prohibited):
- Test all linking scenarios: social→password, password→social, social→social
- Test unlinking with 2+ methods (should work) and 1 method (should fail)
- Test email mismatch on manual linking (should reject)
- Test concurrent unlinking attempts (race condition handling)
- Test activity dashboard filters and pagination (data correctness)
- Verify audit logs for all operations (compliance requirement)

Lessons Learned:
- Safety validation at every layer catches edge cases and race conditions
- Clear error messages dramatically improve user experience (reduce support burden)
- Computed fields prevent data inconsistency (don't store derived data)
- Confirmation dialogs reduce accidental destructive actions (user protection)
- Activity dashboard essential for admin visibility (debugging and compliance)
- Email consistency validation prevents serious security issues (account hijacking)
- Multi-layer validation seems redundant but catches real bugs (defense in depth)
- Dry-run mode for migrations builds confidence (preview before commit)
- Auto-refresh after mutations prevents stale UI state (data consistency)
