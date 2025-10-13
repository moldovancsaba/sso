# SSO Documentation Comprehensive Rewrite Plan

**Status:** Planning  
**Priority:** HIGH  
**Version Target:** 5.5.1+  
**Created:** 2025-10-13T17:46:55.000Z  
**Owner:** moldovancsaba

---

## 🎯 Objectives

1. **Replace outdated v1.0.0 references** with dynamic version from package.json (currently 5.5.1)
2. **Migrate from old client.js approach** to OAuth 2.0 Authorization Code Flow
3. **Document app permissions system** (pending → approved → revoked lifecycle)
4. **Explain admin approval workflow** for new users accessing applications
5. **Provide clear integration guides** for developers building apps that use SSO
6. **Update all API endpoint references** to match current implementation

---

## 📋 Files Requiring Complete Rewrite

### Core Documentation (Must Update)
- [ ] `pages/docs/index.js` - Main landing page ✅ (Started - needs completion)
- [ ] `pages/docs/quickstart.js` - Quick start guide for developers
- [ ] `pages/docs/installation.js` - Integration setup instructions
- [ ] `pages/docs/authentication.js` - OAuth 2.0 authentication flow
- [ ] `pages/docs/session-management.js` - Token management and refresh

### API Reference (Must Update)
- [ ] `pages/docs/api/index.js` - API overview and introduction
- [ ] `pages/docs/api/endpoints.js` - Complete endpoint reference
- [ ] `pages/docs/api/responses.js` - Response formats and structures
- [ ] `pages/docs/api/errors.js` - Error codes and handling

### Supporting Documentation (Should Update)
- [ ] `pages/docs/error-handling.js` - Error handling patterns
- [ ] `pages/docs/security/best-practices.js` - Security guidelines
- [ ] `pages/docs/security/cors.js` - CORS configuration
- [ ] `pages/docs/security/permissions.js` - Permission system explanation

### Example Code (Must Update)
- [ ] `pages/docs/examples/react.js` - React OAuth integration example
- [ ] `pages/docs/examples/vue.js` - Vue.js OAuth integration example
- [ ] `pages/docs/examples/vanilla.js` - Vanilla JS OAuth integration example

---

## 🏗️ Documentation Structure

### 1. Getting Started Section
**Goal:** Help developers integrate in <15 minutes

#### a) Overview Page (`/docs`)
- **Current State:** Shows v1.0.0, mentions client.js ❌
- **Target State:**
  - Dynamic version badge from package.json
  - OAuth 2.0 flow diagram
  - Key features list (centralized auth, app permissions, admin approval)
  - Quick navigation to integration steps
- **Acceptance Criteria:**
  - Version shows 5.5.1 (or current)
  - Clear deprecation warning for old approach
  - OAuth 2.0 flow explained in 6 steps
  - Links to quickstart guide working

#### b) Quick Start Guide (`/docs/quickstart`)
- **Current State:** References @doneisbetter/sso-client package ❌
- **Target State:**
  - Step 1: Contact SSO admin to register OAuth client
  - Step 2: Receive client_id and client_secret
  - Step 3: Implement authorization redirect
  - Step 4: Handle callback and token exchange
  - Step 5: Decode ID token for user info
  - Step 6: Handle app permission status (pending/approved/revoked)
- **Acceptance Criteria:**
  - No references to sso-client.js
  - Code examples use OAuth 2.0 flow
  - Permission status handling documented
  - Works for both React and Node.js backends

#### c) Installation Guide (`/docs/installation`)
- **Current State:** Shows SSO deployment setup ❌
- **Target State:**
  - Focus on app developer integration (NOT SSO deployment)
  - OAuth client registration process
  - Environment variables needed (CLIENT_ID, CLIENT_SECRET, etc.)
  - Redirect URI configuration
  - CORS setup requirements
- **Acceptance Criteria:**
  - Clear distinction: "For app developers, not SSO operators"
  - Example .env file provided
  - Links to OAuth client registration form

---

### 2. Integration Guide Section
**Goal:** Deep dive into OAuth 2.0 implementation

#### a) Authentication Flow (`/docs/authentication`)
- **Current State:** Outdated ❌
- **Target State:**
  - Complete OAuth 2.0 Authorization Code Flow
  - Step-by-step with code examples
  - State parameter for CSRF protection
  - PKCE (Proof Key for Code Exchange) optional
  - Token refresh flow
  - Logout flow
- **Acceptance Criteria:**
  - Sequence diagram of full flow
  - Code samples for each step
  - Error handling at each step
  - Security considerations explained

#### b) App Permissions System (NEW)
- **Current State:** Not documented ❌
- **Target State:**
  - Explain two-level access control:
    - Level 1: SSO-managed app access (approved/pending/revoked)
    - Level 2: App-internal permissions (org memberships, page access, etc.)
  - Permission lifecycle diagram
  - How to handle "Access Pending" state
  - How to check user's app-level role (user vs admin)
- **Acceptance Criteria:**
  - Clear explanation of SSO admin vs app admin roles
  - Code example: Checking permission status
  - UI patterns for "Access Pending" message
  - Link to admin approval workflow

#### c) Admin Approval Workflow (NEW)
- **Current State:** Not documented ❌
- **Target State:**
  - For App Developers: What happens when user tries to login
  - For SSO Admins: How to grant/revoke access via admin UI
  - Notification strategies (email, in-app messages)
  - Automatic approval vs manual approval
- **Acceptance Criteria:**
  - Screenshots of admin UI (grant access flow)
  - Example "Access Pending" UI for end users
  - API endpoint to check permission status (if needed)

#### d) Session Management (`/docs/session-management`)
- **Current State:** Outdated ❌
- **Target State:**
  - Access token lifecycle (1 hour default)
  - Refresh token usage (30 days default)
  - How to refresh tokens before expiry
  - Session validation endpoint
  - Logout and token revocation
- **Acceptance Criteria:**
  - Token refresh code example
  - Expiry handling patterns
  - Best practices (when to refresh, when to logout)

---

### 3. API Reference Section
**Goal:** Complete, accurate API documentation

#### a) API Overview (`/docs/api`)
- **Current State:** Shows v1.0.0, outdated endpoints ❌
- **Target State:**
  - Current version (5.5.1)
  - Base URL: `https://sso.doneisbetter.com`
  - Authentication methods (OAuth 2.0, admin cookies)
  - Rate limiting info
  - CORS policy
- **Acceptance Criteria:**
  - Version is dynamic
  - Lists all endpoint categories
  - Includes OpenID Connect discovery endpoint

#### b) OAuth Endpoints (`/docs/api/endpoints`)
- **Current State:** Missing OAuth endpoints ❌
- **Target State:**
  ```
  Authorization:
  - GET /api/oauth/authorize
  - POST /api/oauth/token
  - POST /api/oauth/revoke
  
  OpenID Connect:
  - GET /.well-known/openid-configuration
  - GET /.well-known/jwks.json
  
  Public User Endpoints:
  - GET /api/public/session
  - POST /api/public/register
  - POST /api/public/login
  - POST /api/public/logout
  - POST /api/public/forgot-password
  - POST /api/public/request-magic-link
  - POST /api/public/verify-pin
  
  Admin Endpoints (Cookie Auth):
  - POST /api/admin/login
  - DELETE /api/admin/login (logout)
  - GET /api/admin/users
  - POST /api/admin/users
  - GET /api/admin/app-permissions/[userId]
  - POST /api/admin/app-permissions/[userId]
  - PATCH /api/admin/app-permissions/[userId]
  - DELETE /api/admin/app-permissions/[userId]
  ```
- **Acceptance Criteria:**
  - Every endpoint documented
  - Request/response examples
  - Error codes for each endpoint
  - Authentication requirements clear

#### c) Response Formats (`/docs/api/responses`)
- **Current State:** Outdated ❌
- **Target State:**
  - OAuth token response format
  - ID token payload structure (with `role` field!)
  - App permissions response format
  - Error response format
  - Pagination format (if applicable)
- **Acceptance Criteria:**
  - JSON schema for each response type
  - Example responses
  - Field descriptions

#### d) Error Codes (`/docs/api/errors`)
- **Current State:** Incomplete ❌
- **Target State:**
  ```
  OAuth Errors:
  - invalid_client
  - unauthorized_client
  - access_denied
  - invalid_grant
  - invalid_scope
  
  App Permission Errors:
  - APP_ACCESS_PENDING
  - APP_ACCESS_DENIED
  - APP_ACCESS_REVOKED
  
  General Errors:
  - UNAUTHORIZED
  - FORBIDDEN
  - VALIDATION_ERROR
  - INTERNAL_ERROR
  ```
- **Acceptance Criteria:**
  - HTTP status code for each error
  - Error code string
  - Description and resolution steps

---

### 4. Security Section
**Goal:** Help developers build secure integrations

#### a) Best Practices (`/docs/security/best-practices`)
- **Current State:** Generic advice ❌
- **Target State:**
  - Always use HTTPS
  - Store client_secret server-side only
  - Use state parameter for CSRF protection
  - Implement token refresh before expiry
  - Don't expose tokens in URLs
  - Handle app permission status securely
  - Validate ID token signature (optional but recommended)
- **Acceptance Criteria:**
  - Specific to OAuth 2.0
  - Links to relevant code examples
  - Explains common pitfalls

#### b) CORS Configuration (`/docs/security/cors`)
- **Current State:** Incomplete ❌
- **Target State:**
  - How SSO handles CORS
  - Which origins need to be registered
  - Credentials mode requirements
  - Preflight request handling
- **Acceptance Criteria:**
  - Example CORS setup for app backend
  - Link to OAuth client registration

#### c) Permissions System (`/docs/security/permissions`)
- **Current State:** Outdated ❌
- **Target State:**
  - App-level permissions (user vs admin)
  - How to check user's role from ID token
  - Best practices for role-based access in apps
  - When to call SSO for permission updates
- **Acceptance Criteria:**
  - Code example: Extracting role from ID token
  - Explanation of when permissions change
  - Cache invalidation strategies

---

### 5. Example Implementations
**Goal:** Copy-paste ready code for popular frameworks

#### a) React Example (`/docs/examples/react`)
- **Current State:** Uses old client.js ❌
- **Target State:**
  ```javascript
  // OAuth hook
  function useAuth() {
    const handleLogin = () => {
      const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize')
      authUrl.searchParams.append('client_id', CLIENT_ID)
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('scope', 'openid profile email')
      authUrl.searchParams.append('state', generateState())
      window.location.href = authUrl.toString()
    }
    
    // Callback handler (server-side route)
    // Token exchange, ID token decode, etc.
  }
  ```
- **Acceptance Criteria:**
  - Complete React hook example
  - Server-side callback route (Express/Next.js)
  - Protected route component
  - Handle app permission status

#### b) Vue.js Example (`/docs/examples/vue`)
- **Similar to React**

#### c) Vanilla JS Example (`/docs/examples/vanilla`)
- **Similar to React, but without framework-specific code**

---

## 🚀 Implementation Plan

### Phase 1: Core Documentation (CRITICAL)
**Timeline:** 2-3 hours  
**Priority:** Must complete before any app integration

1. ✅ Update `/docs/index.js` version and add OAuth warning (DONE)
2. Rewrite `/docs/quickstart.js` with OAuth flow
3. Rewrite `/docs/authentication.js` with OAuth 2.0
4. Create `/docs/app-permissions.md` (new file)
5. Create `/docs/admin-approval.md` (new file)

**Deliverable:** Developers can start integrating with SSO

### Phase 2: API Reference (HIGH)
**Timeline:** 2-3 hours  
**Priority:** Needed for troubleshooting

1. Update `/docs/api/index.js` with current version
2. Rewrite `/docs/api/endpoints.js` with all OAuth endpoints
3. Update `/docs/api/responses.js` with token structures
4. Update `/docs/api/errors.js` with app permission errors

**Deliverable:** Complete API reference

### Phase 3: Examples & Security (MEDIUM)
**Timeline:** 2-3 hours  
**Priority:** Helps adoption

1. Rewrite `/docs/examples/react.js`
2. Rewrite `/docs/examples/vue.js`
3. Rewrite `/docs/examples/vanilla.js`
4. Update `/docs/security/*` files

**Deliverable:** Copy-paste ready examples

### Phase 4: Supporting Documentation (LOW)
**Timeline:** 1-2 hours  
**Priority:** Nice to have

1. Update `/docs/session-management.js`
2. Update `/docs/error-handling.js`
3. Update `/docs/installation.js` (focus on app integration)

**Deliverable:** Complete documentation set

---

## ✅ Acceptance Criteria (Overall)

### For App Developers:
- [ ] Can understand OAuth 2.0 flow in <10 minutes
- [ ] Can implement integration in <1 hour (with examples)
- [ ] Knows how to handle app permission states
- [ ] Understands when/how users get approved

### For SSO Admins:
- [ ] Knows how to register OAuth clients
- [ ] Knows how to grant/revoke app access
- [ ] Understands admin UI features

### Technical Quality:
- [ ] All code examples are tested and working
- [ ] All links are valid (no 404s)
- [ ] Version is dynamic (reads from package.json)
- [ ] No references to deprecated client.js approach
- [ ] Responsive design maintained
- [ ] Accessible (WCAG AA)

---

## 📝 Content Guidelines

### Writing Style:
- **Clear & Concise:** No jargon unless necessary
- **Action-Oriented:** "Do X to achieve Y"
- **Example-Rich:** Show code, not just concepts
- **Error-Aware:** Anticipate common mistakes

### Code Examples:
- **Language:** JavaScript/TypeScript (primary), with notes for other languages
- **Comments:** Explain WHY, not just WHAT
- **Complete:** Include imports, error handling
- **Tested:** All examples must be verified working

### Diagrams:
- OAuth 2.0 flow sequence diagram
- App permissions lifecycle diagram
- Admin approval workflow diagram

---

## 🔄 Maintenance Plan

### Version Updates:
- **When:** After every minor/major version bump
- **What:** Update version badge, check for breaking changes
- **Who:** Developer making the version bump

### Quarterly Review:
- **When:** Every 3 months
- **What:** Review analytics, update examples, fix broken links
- **Who:** SSO maintainer

---

## 📊 Success Metrics

1. **Reduction in support tickets** about integration
2. **Time to first successful integration** (<1 hour target)
3. **Documentation completeness score** (all endpoints documented)
4. **Developer satisfaction** (via feedback form)

---

## 🎯 Next Actions

1. **Immediate:** Review and approve this plan
2. **Day 1:** Complete Phase 1 (Core Documentation)
3. **Day 2:** Complete Phase 2 (API Reference)
4. **Day 3:** Complete Phase 3 (Examples)
5. **Day 4:** Complete Phase 4 (Supporting Docs)
6. **Day 5:** QA, test all examples, deploy

---

**Status:** Ready for implementation  
**Estimated Total Time:** 8-11 hours  
**Target Completion:** Within 1 week  
**Assignee:** TBD
