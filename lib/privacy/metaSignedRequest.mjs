import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_CLOCK_SKEW_SECONDS = 5 * 60
const BASE64URL = /^[A-Za-z0-9_-]+$/

export class MetaSignedRequestError extends Error {
  constructor(code) {
    super(code)
    this.name = 'MetaSignedRequestError'
    this.code = code
  }
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !BASE64URL.test(value)) return null
  try {
    const decoded = Buffer.from(value, 'base64url')
    return decoded.toString('base64url') === value ? decoded : null
  } catch {
    return null
  }
}

function signatureMatches(encodedPayload, encodedSignature, secret) {
  const actual = decodeBase64Url(encodedSignature)
  if (!actual || actual.length !== 32) return false
  const expected = createHmac('sha256', secret).update(encodedPayload, 'ascii').digest()
  return timingSafeEqual(actual, expected)
}

/** Verify Meta's HMAC-SHA256 signed_request before trusting its app-scoped user_id. */
export function verifyMetaSignedRequest(signedRequest, {
  appSecret,
  previousAppSecret,
  previousSecretExpiresAt,
  now = Date.now(),
} = {}) {
  if (typeof signedRequest !== 'string' || signedRequest.length < 1 || signedRequest.length > 8_192) {
    throw new MetaSignedRequestError('invalid_signed_request')
  }
  const parts = signedRequest.split('.')
  if (parts.length !== 2 || !BASE64URL.test(parts[0]) || !BASE64URL.test(parts[1])) {
    throw new MetaSignedRequestError('invalid_signed_request')
  }
  const payloadBytes = decodeBase64Url(parts[1])
  if (!payloadBytes) throw new MetaSignedRequestError('invalid_signed_request')

  let payload
  try {
    payload = JSON.parse(payloadBytes.toString('utf8'))
  } catch {
    throw new MetaSignedRequestError('invalid_signed_request')
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.algorithm !== 'HMAC-SHA256') {
    throw new MetaSignedRequestError('invalid_signed_request')
  }
  if (typeof payload.user_id !== 'string' || !/^[0-9]{1,32}$/.test(payload.user_id)) {
    throw new MetaSignedRequestError('invalid_signed_request')
  }
  if (!Number.isSafeInteger(payload.issued_at) || payload.issued_at < 1) {
    throw new MetaSignedRequestError('invalid_signed_request')
  }
  const nowSeconds = Math.floor(now / 1_000)
  // The callback's `expires` field, when present, belongs to the OAuth token
  // included in Meta's signed payload. It can predate the deletion request, so
  // it is not a callback expiry and must not reject a valid erasure request.
  // Likewise, an old issued_at is not rejected: provider retries and old
  // Facebook logins are valid. A signed retry maps to the same durable case via
  // the app + issued_at + subject idempotency key in the callback route.
  if (payload.issued_at > nowSeconds + MAX_CLOCK_SKEW_SECONDS) {
    throw new MetaSignedRequestError('invalid_signed_request')
  }

  const currentSecret = typeof appSecret === 'string' ? appSecret : ''
  const currentMatches = currentSecret.length > 0 && signatureMatches(parts[1], parts[0], currentSecret)
  const previousExpiry = typeof previousSecretExpiresAt === 'string' ? Date.parse(previousSecretExpiresAt) : NaN
  const previousAllowed = typeof previousAppSecret === 'string' && previousAppSecret.length > 0 &&
    Number.isFinite(previousExpiry) && now <= previousExpiry
  const previousMatches = !currentMatches && previousAllowed && signatureMatches(parts[1], parts[0], previousAppSecret)
  if (!currentMatches && !previousMatches) throw new MetaSignedRequestError('invalid_signature')

  return { userId: payload.user_id, issuedAt: payload.issued_at }
}
