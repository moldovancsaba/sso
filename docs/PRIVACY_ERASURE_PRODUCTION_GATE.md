# Privacy Erasure Production Gate and Operator Runbook

**Document version:** 1.0.0  
**Effective date:** 2026-11-05  
**Governing specification:** [GDPR Right to Erasure - Production Delivery (#141)](https://github.com/moldovancsaba/sso/issues/141)  
**Canonical design system:** [Sovereign Squad GDS#81](https://github.com/sovereignsquad/general-design-system/issues/81)

---

## 1. Executive Summary

This runbook establishes the cross-product production gate and operational procedures for processing data subject right-to-erasure requests across Sovereign Squad products: **SSO**, **Camera**, **Fanmass**, and **Messmass**, including multi-provider storage and database backup replays.

No public intake or destructive processing may be enabled in production until every hard gate in this runbook is verified and signed off.

---

## 2. System Inventory & Ownership Boundaries

| System / Boundary | Responsibility | Downstream Data Stores | Deletion Evidence Type |
| :--- | :--- | :--- | :--- |
| **Universal SSO** (`sso`) | Durable case ledger, intake verification, coordinator orchestration, verifiable PDF certificate generation | MongoDB (`privacyErasureCases`, `privacyErasureAudit`, `privacyErasureTombstones`, `publicUsers`) | SHA-256 evidence digest, signed receipt metadata |
| **Camera** (`camera`) | Primary capture photos, submissions, participant linkages, provider media cleanup | MongoDB (`submissions`, `events`), Vercel Blob, ImgBB, Cloudflare R2 | Scrubbed row counts, deletion receipt digests, zero remaining objects |
| **Fanmass** (`fanmass`) | AI face embeddings, detection boxes, per-photo analytics | MongoDB (`photo_analyses`, `inference_results`, `vector_embeddings`) | Per-photo record removal receipt, `not_found` receipt |
| **Messmass** (`messmass`) | Event attendance rollups, sponsor analytics, report projections | MongoDB (`reports`, `projections`, `event_aggregates`) | Photo tombstone recording, aggregate metric recalculation receipt |
| **Camera Backup** (`camera_backup`) | Isolated cold storage, disaster recovery snapshots, R2 object mirrors | Cloudflare R2 backup bucket, Backblaze mirror | Cryptographic inventory digest, zero active object count receipt |

---

## 3. Production Release Gate Checklist

Every check is binary (PASS / FAIL). A single failure blocks production intake enablement.

### Gate A: Architecture & Identity Integrity
- [x] **A.1 Zero Raw PII Fan-out**: Subject references are encrypted at rest with AES-256-GCM. Fanmass receives only opaque event/photo ID pairs, never emails or identity tokens.
- [x] **A.2 Strict Resolver Boundary**: Identity resolution is accessible only to the configured resolver client ID via `sso:privacy.resolve` after case approval.
- [x] **A.3 Anti-Enumeration Intake**: Public guest intake (`pages/data-deletion.js`) returns generic responses preventing email existence probing.
- [x] **A.4 GDS-Only UI Standards**: Intake (`/data-deletion`), verification (`/data-deletion/verify`), and console (`/admin/privacy-erasure`) adhere strictly to GDS#81 tokens, semantic accessibility, and server-side authentication.

### Gate B: Downstream Execution & Resiliency
- [x] **B.1 Idempotent Fan-out**: All target receipt endpoints enforce unique idempotency keys (minimum 16 chars).
- [x] **B.2 Transient Failure Recovery**: Coordinator retries retryable downstream timeouts using bounded exponential backoff.
- [x] **B.3 Terminal State Derivation**: A case can only reach `completed` when all five required targets (`sso`, `camera`, `fanmass`, `messmass`, `camera_backup`) report terminal receipts.
- [x] **B.4 Backup Evidence Gate**: `camera_backup` requires explicit cryptographic evidence (complete inventory, zero remaining objects, SHA-256 receipt digests). `not_found` is rejected for backup targets.

### Gate C: Tamper-Evident Evidence & Anti-Resurrection
- [x] **C.1 PDF Generation Predicate**: Deletion certificates cannot be generated for non-terminal or failed cases.
- [x] **C.2 Identity-Free Certificates**: Deletion certificate PDFs contain zero raw emails, Facebook IDs, or photo contents; only SHA-256 evidence digests and case metadata.
- [x] **C.3 Restore Replay Gate**: Isolated preview database restores must execute `privacy:restore-replay --apply` to consume SSO tombstone feeds before releasing traffic.

---

## 4. Synthetic Drill Verification Evidence

The automated cross-product synthetic drill (`__tests__/privacy-production-gate-drill.test.mjs`) validates the entire operational lifecycle:

```text
PASS __tests__/privacy-production-gate-drill.test.mjs
  Privacy Erasure Production Gate: Synthetic Cross-Product Drill
    ✓ executes a complete end-to-end synthetic subject erasure drill with receipts and certificate (10 ms)
    ✓ handles lawful retention exceptions without false full-deletion confirmation (1 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
```

---

## 5. Staged Rollout & Enablement Procedure

1. **Phase 1: Dark Intake (Initial Deploy)**
   - Deploy backend coordinator, case ledger, and admin console.
   - Public intake forms remain behind feature flag `SSO_PRIVACY_INTAKE_ENABLED=false`.
   - Operators verify queue connectivity and target client authentication.

2. **Phase 2: Synthetic Verification (Staging)**
   - Run synthetic guest and authenticated test cases.
   - Verify downstream receipts from Camera, Fanmass, and Messmass.
   - Verify backup suppression replay via `scripts/privacy-restore-replay.ts`.

3. **Phase 3: Public Enablement (Production)**
   - Set `SSO_PRIVACY_INTAKE_ENABLED=true`.
   - Monitor case console at `/admin/privacy-erasure`.
   - Review first 10 requests with Data Protection Officer (DPO).

---

## 6. Incident Response & Rollback Runbook

### Incident A: Downstream Service Unreachable / Stuck in `partially_failed`
1. Access `/admin/privacy-erasure` in SSO.
2. Filter cases by `partially_failed` or `needs_review`.
3. Inspect downstream error codes and attempt counts.
4. Once downstream connectivity is restored, click **Resume coordinator** to re-dispatch pending targets.

### Incident B: Emergency Rollback
1. If coordinator or intake behaves erratically, set `SSO_PRIVACY_INTAKE_ENABLED=false`.
2. **DO NOT** delete `privacyErasureCases` or clear `privacyErasureTombstones`.
3. Existing cases remain intact in the database and retain their legal deadlines.
4. Once the issue is remediated, resume coordinator runs safely without duplicate target processing.
