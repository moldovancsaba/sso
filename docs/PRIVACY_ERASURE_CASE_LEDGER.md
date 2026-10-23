# Privacy Erasure Case Ledger

The SSO service owns the durable erasure case record and response deadline. Camera,
Fanmass, and Messmass own deletion of their own records and report a target receipt to
SSO. The ledger coordinates and records that work; it does not write directly into another
product's database.

## Data boundary

`privacyErasureCases` stores a request UUID, source category, state, timestamps, response
deadline, controlled reason codes, target receipts, revision, and an append-only case
history. The subject reference is AES-256-GCM encrypted in the same case document. Its
plaintext is never returned by the ordinary case list or case read. Idempotency keys and
verification evidence references are HMACed before storage. Case history and the separate
`privacyErasureAudit` access record contain opaque actor IDs and controlled values only;
they do not contain a name, e-mail, Facebook ID, image, or free-text evidence.

Canonical targets are `sso`, `camera`, `fanmass`, `messmass`, and `camera_backup`. Every case must
include all five. A product with no matching record reports `not_found`; it is not silently
omitted. FanMass receives only the photo references it needs to delete its per-photo
analytics. Identity resolution is available only to the single configured resolver client,
and only after subject verification and an approved deletion decision. The resolver receives
a versioned account proof, never a raw Facebook provider identifier. Guest email proof is
issued only after the requester confirms control of the inbox.

## State and safety rules

```text
received -> verification_required -> resolving -> awaiting_decision -> deleting
    |                |                  |                |
    +----------------+------------------+----------------+-> rejected

deleting <-> partially_failed -> completed
                         \-----> retained_exception
deleting ----------------------> retained_exception
```

- `request_verification` moves a new case to `verification_required`.
- `verify` records one supported verification method and an optional hashed evidence
  reference, then moves the case to `resolving`.
- `ready_for_decision` moves it to `awaiting_decision`; a freshly authenticated,
  request-bound SSO administrator must approve or reject it.
- `approve` moves it to `deleting`. Until then, the resolver cannot decrypt the subject
  reference and services cannot submit receipts.
- Product receipts are `deleted`, `not_found`, `retryable_failure`, or
  `permanent_failure`. The OAuth client-to-target allowlist prevents a product from
  writing another product's receipt. Receipt writes require an idempotency key.
- The system derives `completed` only when all five required targets are terminal and the
  backup target has verified deletion evidence (or an administrator-approved exception).
  Primary-image deletion never implies backup deletion.
- The system derives `completed` only when all targets are terminal and the backup receipt
  is verified `deleted`. `not_found` is terminal for ordinary product targets, but cannot
  satisfy the backup gate. Failure leaves the case open as `partially_failed` for retry.
- A target may be marked `retained_exception` only by a freshly authenticated
  administrator, with a controlled reason code. This is an explicit exception record; it
  is not proof that the legal request is satisfied.
- The Vercel Cron coordinator claims one approved case under a short lease and advances at
  most one Camera photo per invocation. It snapshots Camera's paged resolver one photo at
  a time, waits for Camera media verification, then sends the exact event/photo tuple to
  Fanmass and Messmass in sequence. A missing or ambiguous identity, missing partner link,
  provider review, or exhausted deletion causes a visible `needs_review` pause. It never
  sends an image or identity to Fanmass; Fanmass receives only the event/photo deletion
  reference. Retries are idempotent and use bounded exponential backoff.
- After all photo records and the SSO account target are terminal, the coordinator stops at
  `awaiting_backup_receipt`. It does not claim backup deletion. Camera must provide the
  separate evidence-backed backup receipt before SSO can issue a full completion record.
- An approved response-time extension is recorded once, with a controlled reason and a
  notice timestamp inside the original response period. It moves the response deadline to
  three calendar months after receipt.
- No API deletes SSO user accounts as a substitute for recording a cross-product case.
  The existing account deletion route remains a separate SSO-account operation until the
  coordinator issue wires it into this ledger.

GDPR Article 12(3) requires a response without undue delay and within one month; it permits
up to two further months where necessary, with notice and reasons within the first month.
This ledger therefore records a one-month response deadline and at most one extension to
the three-month total. The implementation is an operational control, not legal advice.
[Regulation (EU) 2016/679, Article 12(3)](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/).

## API contract

All routes are private and set `Cache-Control: private, no-store`.

| Route | Access | Purpose |
| --- | --- | --- |
| `POST /api/internal/privacy/requests` | Fresh SSO admin session, or userless `sso` audience token with `sso:privacy.write` | Create an idempotent case. Requires `Idempotency-Key`; accepts source category and opaque `{kind,id}` subject reference. |
| `GET /api/internal/privacy/requests` | SSO admin, or `sso:privacy.read` | Paginated case list; filters by state or response due date. Excludes encrypted identity and idempotency values. |
| `GET /api/internal/privacy/requests/{requestId}` | SSO admin, or `sso:privacy.read` / `sso:privacy.resolve` | Read a safe case DTO. `includeSubject=true` additionally requires the exact resolver client, `sso:privacy.resolve`, and an approved case in deletion. It writes an access audit record before returning `subjectProof` v1. |
| `PATCH /api/internal/privacy/requests/{requestId}/decision` | Fresh, request-bound SSO admin | Verify, request verification, move to decision, approve/reject, extend once, or record an approved retained exception. |
| `PATCH /api/internal/privacy/requests/{requestId}/targets/{target}` | Userless `sso` audience token with `sso:privacy.write`; client must match the configured target | Submit an idempotent deletion receipt for that service's own target. |
| `POST /api/internal/privacy/requests/{requestId}/resume` | Fresh SSO admin session | Resume a coordinator paused for review, with a controlled reason recorded in case history. |
| `GET /api/internal/privacy/process-erasure` | Vercel Cron `Authorization: Bearer $CRON_SECRET` | Claim one approved case under a lease and execute one photo-sized step. A minute schedule is declared in `vercel.json`. |
| `POST /api/privacy/meta-data-deletion` | Meta signed request | Verify the provider signature and durably create or retrieve the corresponding Facebook erasure case. It does not synchronously call a product service. |
| `GET /api/public/privacy/deletion-status?confirmation_code={code}` | Public, unguessable confirmation code | Return only the case state, received/deadline timestamps, and target status values. No identity or evidence is returned. |
| `GET /api/public/privacy/deletion-certificate?confirmation_code={code}` | Public, unguessable confirmation code; terminal cases only | Download a one-page PDF listing sanitized target statuses, timestamps, and a digest of the receipt set. Retained exceptions are clearly labelled and are not called full deletion. |

OAuth service tokens must have no user subject and an `aud` of `sso`. Add scopes to a
confidential OAuth client only when the specific service is ready to integrate. The resolver
scope is more sensitive than status reads and must be assigned to one dedicated coordinator
client.

### Subject proof v1

`includeSubject=true` returns `case.subjectProof`, not the encrypted case reference or a
raw provider identifier:

```json
{
  "version": 1,
  "caseId": "opaque-case-uuid",
  "subject": { "kind": "sso_user", "id": "stable-sso-account-id" },
  "verifiedEmail": {
    "value": "normalized@example.test",
    "proof": "sso_account_email_verified",
    "verifiedAt": "2026-10-20T10:00:00.000Z"
  }
}
```

`verifiedEmail` is omitted unless the account's `emailVerified` field is exactly
`true` and the address is syntactically valid. `verifiedAt` is `null` when SSO has no
verification timestamp; SSO does not invent one. A `facebook_subject` is matched
exactly in SSO's `publicUsers.socialProviders.facebook.id` index and translated to its
stable SSO account id. Zero or multiple account matches return a safe `409` and no
candidate proof. The provider id, account name, and other profile fields never leave
SSO. `camera_photo` remains an exact photo reference and has no account email proof.
Products return only their own opaque record references and must not log the proof.

### Meta data-deletion callback

Configure `https://sso.doneisbetter.com/api/privacy/meta-data-deletion` as the Meta
Data Deletion Request Callback URL. The route accepts a bounded
`application/x-www-form-urlencoded` POST containing exactly one `signed_request` field.
It validates the HMAC-SHA256 signature using `SSO_FACEBOOK_APP_SECRET` before reading the
app-scoped `user_id`, then creates or retrieves a Facebook case in the SSO ledger. The
successful provider response is `{ "url": "…", "confirmation_code": "…" }`; the URL
returns a no-store JSON status summary and the confirmation code is the random ledger case
UUID without separators. Both values are returned only after durable case creation.

The callback does not contact Camera, Fanmass, or Messmass synchronously and does not claim
that data was deleted. The downstream coordinator and product receipts remain responsible
for completion. Repeated delivery of the same signed request maps to the same case using
the app id, signed subject, and `issued_at` as the idempotency material. `issued_at` is
required and future-skew is bounded; an old value is accepted because the request is signed
and retries must remain safe. If Meta includes `expires`, it describes the embedded OAuth
token and is deliberately not treated as the deletion request's expiry. The case ledger's
unique idempotency index prevents a replay from creating a second case.

The callback uses `SSO_FACEBOOK_APP_ID` and `SSO_FACEBOOK_APP_SECRET`. During a planned
secret rotation, `SSO_FACEBOOK_APP_SECRET_PREVIOUS` is accepted only while
`SSO_FACEBOOK_APP_SECRET_PREVIOUS_EXPIRES_AT` is in the future. Remove the previous secret
after the overlap window. The endpoint fails closed with a retryable service error when
required credentials or ledger encryption keys are unavailable. Invalid signatures and
malformed requests create no case. Rate limiting is configured by
`SSO_RATE_LIMIT_META_DELETION_MAX` (default 600 per 15 minutes per client IP) and is shared
by the callback and public status endpoint; logs contain only a fixed event name, never the
provider subject, request body, confirmation code, or IP.

Protocol reference: [Meta Data Deletion Request Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/).
The official page returned HTTP 429 during this implementation on 2026-10-23, so app
dashboard setup and response acceptance must be confirmed in Meta's current dashboard
before production enablement. The implementation follows Meta's signed-request HMAC-SHA256
callback shape and response fields; this note does not represent a production smoke test.

## Configuration and rotation

Before accepting cases, configure these SSO-owned deployment variables (also listed in
`.env.example`):

- `SSO_PRIVACY_CASE_KEYRING`: JSON map from version (`v1`, `v2`, ...) to a 32-byte key in
  64-character hex. Generate each value independently with `openssl rand -hex 32`.
- `SSO_PRIVACY_CASE_ACTIVE_KEY_VERSION`: key version used for new case references.
- `SSO_PRIVACY_CASE_HMAC_KEY`: an independent, stable 32-byte hex key for idempotency and
  evidence-reference HMACs. Do not rotate it while cases may be retried without first
  implementing a hash migration.
- `SSO_PRIVACY_RESOLVER_CLIENT_ID`: exact OAuth client id allowed to request the encrypted
  subject reference after approval.
- `SSO_PRIVACY_TARGET_CLIENTS`: JSON object mapping each target name to its exact,
  confidential OAuth client id, for example `{"camera":"…","fanmass":"…"}`. Include
  all five targets before enabling their receipts. Do not use the broad admin Atlas account
  as an application credential.
- `SSO_PRIVACY_CAMERA_BASE_URL` and `SSO_PRIVACY_CAMERA_RESOLVER_SECRET`: the Camera base
  URL and its dedicated exact-subject resolver secret. This coordinator credential is not
  the Camera media encryption key.
- `SSO_PRIVACY_FANMASS_BASE_URL` and `SSO_PRIVACY_FANMASS_API_KEY`: Fanmass's API base and
  service API key. The coordinator sends only a request ID plus Camera event/photo IDs.
- `SSO_PRIVACY_MESSMASS_BASE_URL` and `SSO_PRIVACY_MESSMASS_SECRET`: Messmass's API base
  and dedicated SSO erasure secret. Messmass resolves its own event from Camera event and
  partner references, rejecting missing or ambiguous links.
- `CRON_SECRET`: Vercel platform secret used to authenticate the once-per-minute worker.

To rotate an encryption key, add a new version to the keyring, change the active version,
and retain every prior version until no open case uses it. The API fails closed when the
active or referenced key is missing. Do not remove an old version just because its key is no
longer active. No production secrets or OAuth client registrations are changed by a code
release; deployment configuration must be set separately before service-to-service calls
can succeed.

## Failure and recovery

- Case creation uses a unique `(source, idempotency-key HMAC)` index. A repeated key and
  identical request returns the original case; reuse with different content returns `409`.
- Case state changes use revision compare-and-set. Concurrent administrators receive `409`
  and must reload before acting.
- Target receipts use the case revision and retain up to 1,000 operation fingerprints per
  case. A conflict returns `409`; retry with the same idempotency key. At the bound, stop
  automated updates and have an administrator reconcile the product receipt.
- Missing database access, key material, or target configuration fails closed. The worker
  records a safe error code and pauses for retry or operator review; no state is marked
  complete after an unverified or unacknowledged target.
- A backup restore can resurrect erased data. Camera backup inventory, retention, restore
  controls, and replay proof remain blocked on Camera #509; until that work is delivered,
  the coordinator intentionally leaves `camera_backup` pending and this ledger cannot issue
  a full completion certificate.
- There is no TTL deletion on case or audit records. Their retention and pseudonymization
  period must be approved in the evidence/retention issue before production operation.

## Verification

The unit suite covers authenticated states, encryption and key rotation behavior, idempotent
creation and receipts, deadline calculation, response extensions, evidence-gated backup
completion, one-photo coordinator execution, certificate generation, identity-resolution
gating, and safe DTOs. The full `npm run verify` gate remains required
before merge. This ledger does not by itself prove an end-to-end deletion across products;
that proof comes from the integration coordinator and each product adapter's receipt.
