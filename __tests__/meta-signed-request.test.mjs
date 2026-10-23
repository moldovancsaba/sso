import { createHmac } from 'node:crypto'
import { MetaSignedRequestError, verifyMetaSignedRequest } from '../lib/privacy/metaSignedRequest.mjs'

const appSecret = 'test-app-secret'
const now = Date.parse('2026-10-23T12:00:00.000Z')

function signedRequest(payload, secret = appSecret) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(encodedPayload, 'ascii').digest('base64url')
  return `${signature}.${encodedPayload}`
}

function payload(overrides = {}) {
  return { algorithm: 'HMAC-SHA256', issued_at: Math.floor(now / 1_000), user_id: '1925918141394906', ...overrides }
}

describe('Meta signed deletion request verification', () => {
  test('accepts an authentic current-key request and returns only the app-scoped subject and timestamp', () => {
    expect(verifyMetaSignedRequest(signedRequest(payload()), { appSecret, now })).toEqual({
      userId: '1925918141394906',
      issuedAt: Math.floor(now / 1_000),
    })
  })

  test('rejects tampering, unsupported algorithms, malformed data and nonnumeric subjects', () => {
    const valid = signedRequest(payload())
    const [signature, encoded] = valid.split('.')
    expect(() => verifyMetaSignedRequest(`${signature}.${Buffer.from(JSON.stringify(payload({ user_id: '1' }))).toString('base64url')}`, { appSecret, now }))
      .toThrow(new MetaSignedRequestError('invalid_signature'))
    expect(() => verifyMetaSignedRequest(signedRequest(payload({ algorithm: 'none' })), { appSecret, now }))
      .toThrow(new MetaSignedRequestError('invalid_signed_request'))
    expect(() => verifyMetaSignedRequest(signedRequest(payload({ user_id: 'anonymous@event' })), { appSecret, now }))
      .toThrow(new MetaSignedRequestError('invalid_signed_request'))
    expect(() => verifyMetaSignedRequest(`${signature}.${encoded}.extra`, { appSecret, now }))
      .toThrow(new MetaSignedRequestError('invalid_signed_request'))
    expect(() => verifyMetaSignedRequest('invalid', { appSecret, now }))
      .toThrow(new MetaSignedRequestError('invalid_signed_request'))
  })

  test('accepts old callback payloads even when the embedded OAuth token has expired', () => {
    const oldIssuedAt = 1
    expect(verifyMetaSignedRequest(signedRequest(payload({ issued_at: oldIssuedAt, expires: 2 })), { appSecret, now }))
      .toEqual({ userId: '1925918141394906', issuedAt: oldIssuedAt })
  })

  test('rejects timestamps too far in the future', () => {
    expect(() => verifyMetaSignedRequest(signedRequest(payload({ issued_at: Math.floor(now / 1_000) + 301 })), { appSecret, now }))
      .toThrow(new MetaSignedRequestError('invalid_signed_request'))
  })

  test('accepts a previous secret only inside the configured rotation window', () => {
    const previous = 'previous-app-secret'
    const request = signedRequest(payload(), previous)
    expect(verifyMetaSignedRequest(request, {
      appSecret,
      previousAppSecret: previous,
      previousSecretExpiresAt: new Date(now + 60_000).toISOString(),
      now,
    }).userId).toBe('1925918141394906')
    expect(() => verifyMetaSignedRequest(request, {
      appSecret,
      previousAppSecret: previous,
      previousSecretExpiresAt: new Date(now - 1).toISOString(),
      now,
    })).toThrow(new MetaSignedRequestError('invalid_signature'))
  })
})
