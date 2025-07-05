<agent_role>
You are an elite AI system developer tasked with building a privacy-first, ephemeral Single Sign-On (SSO) service named **Simple SSO** (formerly thanperfect).
Your work must enforce zero-profile identity, timestamp precision, token immutability, and admin auditability.
</agent_role>

<task_context>
Simple SSO replaces email or OAuth logins with arbitrary UTF-8 identifiers like `"."`, `"❤️"`, `"banana"`. These identifiers map to ephemeral, stateless session tokens (10-minute TTL, no renewal).

The goal is to offer **one-tap login** with minimal metadata, full audit logging, and seamless cross-domain redirect SSO integration.

All features must follow zero PII, ISO timestamping, and RBAC-admin principles.
</task_context>

<task_requirements>
- 🔐 **UTF-8 Identifier Auth**
  - Accept input like `"❤️"` or `"apple99"` as unique login keys
  - No password, email, or persistent session required
  - Stateless design, no database lookups for validation

- 🪪 **Token Generator**
  - Returns signed session token with `iat`, `exp`, and `identifier`
  - TTL: 10 minutes, non-refreshable
  - Format: JWT, HMAC, or similar secure scheme

- 🔁 **SSO Redirect API**
  - `GET /auth?token=...&redirect=https://...`
  - Verifies token and redirects if valid
  - Rejects expired or malformed tokens
  - Optional `origin` validation or nonce support for CSRF protection

- 🧾 **Activity Logging**
  - Log all auth actions as immutable JSON events:
    ```json
    {
      "identifier": "🧠",
      "action": "created" | "used" | "revoked",
      "timestamp": "2025-07-04T12:34:56.789Z",
      "source": "https://example.com"
    }
    ```
  - Timestamps in ISO 8601 UTC w/ milliseconds (`YYYY-MM-DDTHH:MM:SS.sssZ`)

- 👨‍💼 **Admin UI**
  - RBAC-restricted panel for:
    - Listing identifiers
    - Revoking or updating tokens
    - Inline metadata edits
  - Built in Next.js

- 🧩 **Integration Options**
  - RESTful or GraphQL API with:
    - `POST /auth/create`
    - `GET /auth/verify`
    - `POST /auth/revoke`

- 🔐 **Security Constraints**
  - No token refresh endpoints allowed
  - No identifier reuse unless explicitly updated
  - No long-term session storage permitted

</task_requirements>

<tech_stack>
- Backend: Next.js API routes
- Token: HMAC or JWT (with short TTL)
- Logging: MongoDB + write-ahead log
- Admin UI: Tailwind CSS + Next.js
- Hosting: Vercel
</tech_stack>

<working_mode>
- All timestamps must follow: `YYYY-MM-DDTHH:MM:SS.sssZ` format (UTC)
- Full logging in `LEARNINGS.md`, `TASKLIST.md`, `ROADMAP.md`
- No breadcrumbs in UI
- Reuse-first: Search before creating any component
- Versioning required: Bump PATCH before dev, MINOR before commit
</working_mode>

<goals>
- Deliver a 100% private, timestamp-accurate, zero-profile SSO
- Ensure traceable actions with no silent or extended auth
- Make integration seamless across domains
- Comply fully with AI Dev Rules 1–12
</goals>

## Project: Simple SSO (formerly ThanPerfect)
## Start Date: 2025-07-05T14:12:48Z

### Initial Setup and Planning

#### Current Status
- Starting fresh implementation from scratch
- Cleaned up git branches, maintaining only `main` branch
- Setting up initial project structure and documentation

#### Next Steps
1. Create basic project structure
2. Set up essential documentation files:
   - README.md
   - ARCHITECTURE.md
   - RELEASE_NOTES.md
   - LEARNINGS.md
   - TASKLIST.md
   - ROADMAP.md
3. Initialize project with basic dependencies
4. Implement JWT authentication system

#### Actions Completed
1. [2025-07-05T14:12:48Z] Project initialization
   - Cleaned up git repository
   - Created initial WARP.DEV_AI_CONVERSATION.md file

2. [2025-07-05T14:17:24Z] Fresh Project Setup
   - Removed all existing files for clean slate
   - MongoDB connection established:
     Database: mongodb-sso.zf2o0ix.mongodb.net
   - GitHub and Vercel connections configured

#### Implementation Plan

1. Project Setup [2025-07-05T14:17:24Z]
   - Initialize new Next.js project with TypeScript
   - Configure MongoDB connection
   - Set up JWT authentication infrastructure

2. Core Authentication System [Pending]
   - Implement JWT token generation
   - Create authentication middleware
   - Set up API routes for auth operations

3. Admin Interface [Pending]
   - Design and implement RBAC system
   - Create admin dashboard
   - Implement audit logging

4. SSO Integration [Pending]
   - Implement cross-domain authentication
   - Create redirect handling
   - Add CSRF protection

#### Security Notes
- All JWT tokens will have 10-minute TTL
- No refresh tokens implemented
- Audit logging with ISO 8601 timestamps
- Zero PII storage policy

