# Project board review and manual movement / Scrum journal

Version: 5.44.0

Reviewed: 2026-11-15 UTC. Repository: moldovancsaba/sso.

Canonical board: [project board](https://github.com/users/moldovancsaba/projects/13). **The board is the owner's source of truth and is read-only. Never add, remove, reorder or move cards or edit project fields.** This file records observations and conditional proposals for manual owner decisions only.

## Verified coverage and limitations

- Repository collection: 156 entries, including 76 issues and 80 pull requests; 12 issues are open.
- Board: all 76 returned items were read; totalCount matches the captured item count.
- Linked issue-state / Done-status discrepancies: 0. Open issues absent from this board snapshot: 0. Absence here does not prove absence from every board and does not authorize creating a card.
- Exact title-and-body duplicate groups among open issues: 0. Similar titles alone were not treated as duplicates.
- Issue and board reads succeeded. No access failure was observed for these captured collections. No board write was attempted.
- This is a documentation-only change. The required local validation chain was run as recorded below; no live production flow, user data mutation, external message, dependency upgrade or manual deployment was performed. Source presence and previous Done status are not fresh live acceptance evidence.

## Source observations and work clusters

## Current tracking and architecture

The repository has 76 issues and 80 pull requests in the full collection; 12 issues remain open. All 76 issue cards are on Project 13: 64 Done, four Todo, five Backlog, two Roadmap and one Ideabank. Linked issue states and board statuses agree. The old operating-rule text describing an absence of a formal board is not the current observation: Project 13 was read directly. This review neither introduces a new board nor imposes a status-label system.

The runtime is the existing Next.js Pages Router service with the native MongoDB driver. Do not import a sibling product's Mongoose assumptions or replace the existing identity authority merely because a newer hosted auth product is available. Current admin UI authorization uses the public-session plus app-permission path; legacy getAdminUser is not evidence of the current login contract. No user account, token, permission, session or OAuth client was read or changed.

## Open-work clusters and residual acceptance

- #99–105 are the asset ingestion, editor, audit/history/rollback and login/register branding UI lane. The source already has a versioned branding sub-document and expected-version update path through lib/oauth/branding.mjs, plus a shared validation module. Treat those foundations as implementation evidence; do not recreate them or claim upload/editor/rollback parity from their presence. Keep original asset, CSS safety, concurrency and attribution acceptance.
- #106 retains canonical consent-scope metadata work. The existing lib/oauth/scopes.mjs is the metadata baseline; check the exact duplicate consumer before consolidating. A new UI/form library does not establish consent correctness.
- #107 is documentation/contract/GDS-exception alignment; #108 is security/accessibility/rollback release evidence. Preserve these as acceptance work, not another implementation of the branding model.
- #109 is explicitly a decision-only RFC about client-scoped self-service. Keep its authorization decision separate from admin branding and do not enable customer mutation paths from this review.
- #124's environment-prefix work has an existing names-only enforcement script in scripts/check-env.mjs, including legacy fallback rules. Rebaseline residual references and deployment acceptance before closing; source-name validation does not prove live environment migration. No env file values were read.

Existing security, consent, revocation, actor attribution and scope contracts remain necessary regardless of framework age. No new auth provider, cloud service, model, dependency, account migration or permission policy was selected or activated.

## Verification and publication

CLAUDE.md requires the full npm run verify chain before push/merge and a PR for normal main delivery. Actual gate output or blockers are recorded below before publication; no full gate result is inferred. Documentation changes do not establish live OAuth, email, database or protected-browser acceptance. No board write was attempted.

Inspected sources: [README.md](../README.md), [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md), [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md), [lib/oauth/clients.mjs](../lib/oauth/clients.mjs), [lib/oauth/branding.mjs](../lib/oauth/branding.mjs), [lib/oauth/brandingValidation.mjs](../lib/oauth/brandingValidation.mjs), [lib/oauth/scopes.mjs](../lib/oauth/scopes.mjs), [scripts/check-env.mjs](../scripts/check-env.mjs). Documentation paths and register coverage were checked before publication. No new technology is selected or installed by this assessment.

## Per-card review register

A destination is a proposal, never an executed move. Historical closed cards stay historical; migrated or not-planned closures do not prove feature delivery. Open work remains subject to its issue's acceptance criteria and owner decision.

| Issue / card | Title | Issue state / reason | Observed current column | Proposed destination / next evidence | Owner decision / manual execution |
| --- | --- | --- | --- | --- | --- |
| [#3](https://github.com/moldovancsaba/sso/issues/3) | SSO Phase 1/7: Recover credential hygiene and remove duplicate active routes | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#4](https://github.com/moldovancsaba/sso/issues/4) | SSO Phase 2/7: Harden OAuth callback state and CSRF validation | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#5](https://github.com/moldovancsaba/sso/issues/5) | SSO Phase 3/7: Enforce bearer token validation in the app access request flow | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#6](https://github.com/moldovancsaba/sso/issues/6) | SSO Phase 4/7: Unify public session and cookie behavior across login paths | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#7](https://github.com/moldovancsaba/sso/issues/7) | SSO Phase 5/7: Complete admin role model consolidation in runtime code | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#8](https://github.com/moldovancsaba/sso/issues/8) | SSO Phase 6/7: Unify the app-permission contract across helpers, APIs, and docs | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#9](https://github.com/moldovancsaba/sso/issues/9) | SSO Phase 7/7: Reconcile core documentation and remove misleading doc drift | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#10](https://github.com/moldovancsaba/sso/issues/10) | SSO Step 1.1: Rotate the exposed MongoDB credential and invalidate the old access path | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#11](https://github.com/moldovancsaba/sso/issues/11) | SSO Step 1.2: Remove credential-bearing duplicate routes from the active routing tree | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#12](https://github.com/moldovancsaba/sso/issues/12) | SSO Step 1.3: Add repository guardrails for secrets and duplicate active-route files | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#13](https://github.com/moldovancsaba/sso/issues/13) | SSO Step 2.1: Define the canonical OAuth state and CSRF validation contract for social callbacks | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#14](https://github.com/moldovancsaba/sso/issues/14) | SSO Step 2.2: Implement canonical state and CSRF validation in the Google OAuth callback | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#15](https://github.com/moldovancsaba/sso/issues/15) | SSO Step 2.3: Implement canonical state and CSRF validation in the Facebook OAuth callback | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#16](https://github.com/moldovancsaba/sso/issues/16) | SSO Step 2.4: Add regression coverage for invalid, missing, and replayed callback state | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#17](https://github.com/moldovancsaba/sso/issues/17) | SSO Step 3.1: Validate bearer tokens in the app access request endpoint | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#18](https://github.com/moldovancsaba/sso/issues/18) | SSO Step 3.2: Enforce caller-to-client authorization rules in the app access request endpoint | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#19](https://github.com/moldovancsaba/sso/issues/19) | SSO Step 3.3: Update request-access docs, examples, and operator diagnostics to match the final security contract | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#20](https://github.com/moldovancsaba/sso/issues/20) | SSO Step 4.1: Define the canonical public session cookie contract | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#21](https://github.com/moldovancsaba/sso/issues/21) | SSO Step 4.2: Refactor password login to use the shared public session cookie helper path | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#22](https://github.com/moldovancsaba/sso/issues/22) | SSO Step 4.3: Normalize social login public session cookie behavior across providers | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#23](https://github.com/moldovancsaba/sso/issues/23) | SSO Step 4.4: Add regression coverage for public session cookie and cross-subdomain behavior | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#24](https://github.com/moldovancsaba/sso/issues/24) | SSO Step 5.1: Define the canonical admin role model and compatibility policy | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#25](https://github.com/moldovancsaba/sso/issues/25) | SSO Step 5.2: Remove super-admin runtime dependencies from shared auth, validation, and helper layers | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#26](https://github.com/moldovancsaba/sso/issues/26) | SSO Step 5.3: Align admin pages and admin APIs to the canonical role gates | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#27](https://github.com/moldovancsaba/sso/issues/27) | SSO Step 5.4: Reconcile role migration documentation and operator guidance with the live runtime model | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#28](https://github.com/moldovancsaba/sso/issues/28) | SSO Step 6.1: Decide the canonical app-permission role and status vocabulary | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#29](https://github.com/moldovancsaba/sso/issues/29) | SSO Step 6.2: Refactor shared app-permission helpers and DTO mapping to the canonical vocabulary | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#30](https://github.com/moldovancsaba/sso/issues/30) | SSO Step 6.3: Align the app-to-app permission API to the canonical contract | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#31](https://github.com/moldovancsaba/sso/issues/31) | SSO Step 6.4: Align the admin permission APIs to the canonical contract | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#32](https://github.com/moldovancsaba/sso/issues/32) | SSO Step 6.5: Add permission contract tests and canonical integration examples | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#33](https://github.com/moldovancsaba/sso/issues/33) | SSO Step 7.1: Reconcile core documentation versions and feature-completion claims | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#34](https://github.com/moldovancsaba/sso/issues/34) | SSO Step 7.2: Archive or clearly mark obsolete and duplicate documentation artifacts | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#35](https://github.com/moldovancsaba/sso/issues/35) | SSO Step 7.3: Rewrite source-of-truth docs for auth, sessions, permissions, and security claims | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#36](https://github.com/moldovancsaba/sso/issues/36) | SSO Step 7.4: Add a documentation maintenance and version-sync workflow | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#37](https://github.com/moldovancsaba/sso/issues/37) | SSO Backlog: Apple Sign In | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#38](https://github.com/moldovancsaba/sso/issues/38) | SSO Backlog: Passkey design and stronger session assurance | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#39](https://github.com/moldovancsaba/sso/issues/39) | SSO Roadmap: Enterprise federation groundwork | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#41](https://github.com/moldovancsaba/sso/issues/41) | SSO Roadmap: Zero-trust-oriented session hardening | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#40](https://github.com/moldovancsaba/sso/issues/40) | SSO Backlog: Provider expansion strategy | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#42](https://github.com/moldovancsaba/sso/issues/42) | Frontend Architecture: GDS-only adoption - canonical package/runtime convergence | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#43](https://github.com/moldovancsaba/sso/issues/43) | Frontend Architecture: GDS package compatibility - Mantine 9 + Pages Router consumer line | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#44](https://github.com/moldovancsaba/sso/issues/44) | Auth UI: Provider-branded identity controls - canonical GDS contract | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#45](https://github.com/moldovancsaba/sso/issues/45) | Docs UI: Documentation site shell - canonical GDS application shell | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#46](https://github.com/moldovancsaba/sso/issues/46) | Auth UI: SSO auth surface migration - canonical GDS auth-shell consumption | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#47](https://github.com/moldovancsaba/sso/issues/47) | Docs UI: SSO docs migration - canonical GDS shell and docs primitives | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#48](https://github.com/moldovancsaba/sso/issues/48) | Public UI: SSO public/legal migration - canonical GDS public composition | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#49](https://github.com/moldovancsaba/sso/issues/49) | Admin UI: SSO repeated state and data surfaces - canonical GDS primitive adoption | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#50](https://github.com/moldovancsaba/sso/issues/50) | Tooling: GDS compliance enforcement - manifest, lint, and drift checks | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#51](https://github.com/moldovancsaba/sso/issues/51) | Cleanup: Legacy UI authority deletion - remove remaining local design-system ownership | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#60](https://github.com/moldovancsaba/sso/issues/60) | Onboarding: step-by-step spotlight tour for new users (admin dashboard + public account pages) | closed / not_planned | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#62](https://github.com/moldovancsaba/sso/issues/62) | GDS upgrade: @doneisbetter/gds-*@3.0.0 → @sovereignsquad/gds-*@4.1.3 (package rescope + registry migration) | closed / not_planned | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#64](https://github.com/moldovancsaba/sso/issues/64) | GDS upgrade: @doneisbetter/gds-*@3.0.0 → @sovereignsquad/gds-*@6.0.0 (registry migration + required theme/auth-button governance changes) | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#76](https://github.com/moldovancsaba/sso/issues/76) | Docs sidebar navigation overlaps article content at narrow viewports | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#83](https://github.com/moldovancsaba/sso/issues/83) | sendViaNodemailer opens a new SMTP connection for every email | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#97](https://github.com/moldovancsaba/sso/issues/97) | Theming: OAuth client branding contract - schema, validation, and versioned storage | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#98](https://github.com/moldovancsaba/sso/issues/98) | Theming: Custom CSS validation pipeline - GDS CreatorThemeBoundary integration and contrast enforcement | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#99](https://github.com/moldovancsaba/sso/issues/99) | Theming: Logo asset ingestion pipeline - Vercel Blob upload with content validation | open / unspecified | Todo (NEXT) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#100](https://github.com/moldovancsaba/sso/issues/100) | Theming: Branding audit trail and rollback - versioned history with revert | open / unspecified | Todo (NEXT) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#101](https://github.com/moldovancsaba/sso/issues/101) | UI: OAuth client branding editor - color tokens and welcome text | open / unspecified | Backlog (SOONER) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#102](https://github.com/moldovancsaba/sso/issues/102) | UI: Logo upload widget - drag-and-drop capture with validation feedback | open / unspecified | Backlog (SOONER) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#103](https://github.com/moldovancsaba/sso/issues/103) | UI: Custom CSS editor - live validation diagnostics and scoped preview | open / unspecified | Backlog (SOONER) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#104](https://github.com/moldovancsaba/sso/issues/104) | UI: Branding history console - version diff and one-click rollback | open / unspecified | Backlog (SOONER) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#105](https://github.com/moldovancsaba/sso/issues/105) | Theming: Login and register branding parity - consistent client identity rendering | open / unspecified | Backlog (SOONER) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#106](https://github.com/moldovancsaba/sso/issues/106) | Consent: Canonical scope metadata - remove duplicate hardcoded scope map | open / unspecified | Todo (NEXT) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#107](https://github.com/moldovancsaba/sso/issues/107) | Docs: Client theming architecture, contract, and GDS exception record | open / unspecified | Roadmap (LATER) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#108](https://github.com/moldovancsaba/sso/issues/108) | Quality: Client theming release gate - security, accessibility, and rollback proof | open / unspecified | Roadmap (LATER) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#109](https://github.com/moldovancsaba/sso/issues/109) | RFC: Client-scoped branding self-service access model - decision record only | open / unspecified | IDEABANK (SOMEDAY) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#124](https://github.com/moldovancsaba/sso/issues/124) | Prefix the service's environment variables with SSO_ (with fallback to the old names) | open / unspecified | Todo (NEXT) | Remain; satisfy original issue acceptance before proposing Review or Done. | Pending / not executed |
| [#135](https://github.com/moldovancsaba/sso/issues/135) | Privacy: Erasure case ledger - durable request state and per-target evidence | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#136](https://github.com/moldovancsaba/sso/issues/136) | Privacy: Meta deletion callback - verified provider request intake | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#137](https://github.com/moldovancsaba/sso/issues/137) | Privacy: Erasure coordinator - durable fan-out and verified completion across owners | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#138](https://github.com/moldovancsaba/sso/issues/138) | Privacy UI: Erasure request intake - accessible verified request submission | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#139](https://github.com/moldovancsaba/sso/issues/139) | Privacy UI: Erasure case console - accessible cross-system status and safe recovery | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#140](https://github.com/moldovancsaba/sso/issues/140) | Privacy: Deletion evidence PDF - verifiable completion report from target receipts | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#141](https://github.com/moldovancsaba/sso/issues/141) | Privacy: Erasure production gate - end-to-end verification and operator runbook | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |
| [#143](https://github.com/moldovancsaba/sso/issues/143) | Privacy: Verified subject proof for product resolvers | closed / completed | Done | Remain; preserve historical evidence, no fresh completion claim. | Pending / not executed |

## Append-only Scrum / manual movement journal

| Date / Scrum reference | Board and issue | Verified current column | Proposed destination | Evidence / rationale | Dependency / blocker | Owner decision | Manual execution / person | Verified new column | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-15 review | Board and issues above | Snapshot above | No automatic move | Recorded source/issue/board review | See unresolved requirements | Pending | Not executed | Snapshot only | Preserve history |
| YYYY-MM-DD / meeting link | Board URL + issue URL | Exact observed value | Exact proposed value or remain | Acceptance link | Specific condition | Pending | Not executed | Not verified | — |

Read the issue and actual board before each future proposal. Retain previous observations when a decision changes. Record execution only after the owner performs it and the result is read back. Documentation rollback requires no product or board rollback.

## Actual publication verification

Node 24.22.1 and npm ci were used. npm run verify exited 0: lint, type-check, all 40 suites / 287 tests, production build, repository guardrails, the names-only environment check, documentation checks, GDS manifest and GDS checks completed. The GDS commands each reported the same existing identity.provider.custom-controls.warn in untouched pages/account.js; this is not a warning-free GDS result. npm ci also reported the existing eslint@9.39.5 package as deprecated; no dependency was added or changed here. These findings were not suppressed or repaired as unrelated UI/toolchain work. No live OAuth or account acceptance is claimed.
