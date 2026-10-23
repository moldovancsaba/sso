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

Canonical product targets are `sso`, `camera`, `fanmass`, and `messmass`. Every case must
include all four. A product with no matching record reports `not_found`; it is not silently
omitted. FanMass receives only the photo references it needs to delete its per-photo
analytics. Identity resolution is available only to the single configured resolver client,
and only after subject verification and an approved deletion decision.

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
- The system derives `completed` only when all four required targets are `deleted` or
  `not_found`. Failure leaves the case open as `partially_failed` for retry.
- A target may be marked `retained_exception` only by a freshly authenticated
  administrator, with a controlled reason code. This is an explicit exception record; it
  is not proof that the legal request is satisfied.
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
| `GET /api/internal/privacy/requests/{requestId}` | SSO admin, or `sso:privacy.read` / `sso:privacy.resolve` | Read a safe case DTO. `includeSubject=true` additionally requires the exact resolver client, `sso:privacy.resolve`, and an approved case in deletion. It writes an access audit record before returning the subject reference. |
| `PATCH /api/internal/privacy/requests/{requestId}/decision` | Fresh, request-bound SSO admin | Verify, request verification, move to decision, approve/reject, extend once, or record an approved retained exception. |
| `PATCH /api/internal/privacy/requests/{requestId}/targets/{target}` | Userless `sso` audience token with `sso:privacy.write`; client must match the configured target | Submit an idempotent deletion receipt for that service's own target. |

OAuth service tokens must have no user subject and an `aud` of `sso`. Add scopes to a
confidential OAuth client only when the specific service is ready to integrate. The resolver
scope is more sensitive than status reads and must be assigned to one dedicated coordinator
client.

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
  all four targets before enabling their receipts. Do not use the broad admin Atlas account
  as an application credential.

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
- Missing database access, key material, or target authorization fails closed. No state is
  marked complete after an unverified or unacknowledged target.
- A backup restore can resurrect erased data. Production backup inventory, retention, restore
  controls, and replay proof remain blocked on Camera #509; until that work is delivered,
  this ledger cannot certify that backup copies have been purged or made unrecoverable.
- There is no TTL deletion on case or audit records. Their retention and pseudonymization
  period must be approved in the evidence/retention issue before production operation.

## Verification

The unit suite covers authenticated states, encryption and key rotation behavior, idempotent
creation and receipts, deadline calculation, response extensions, cross-target completion,
identity-resolution gating, and safe DTOs. The full `npm run verify` gate remains required
before merge. This ledger does not by itself prove an end-to-end deletion across products;
that proof comes from the integration coordinator and each product adapter's receipt.
