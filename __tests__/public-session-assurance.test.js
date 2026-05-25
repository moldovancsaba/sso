import {
  buildPublicSessionDeviceFingerprint,
  getSessionRequestMetadata,
  isPublicSessionBoundToRequest,
} from '../lib/publicSessions.mjs'

describe('public session assurance helpers', () => {
  test('normalizes request metadata from forwarded headers', () => {
    const metadata = getSessionRequestMetadata({
      headers: {
        'x-forwarded-for': '203.0.113.42, 10.0.0.1',
        'user-agent': 'Mozilla/5.0',
      },
      socket: {},
      connection: {},
    })

    expect(metadata).toEqual({
      ip: '203.0.113.42',
      userAgent: 'Mozilla/5.0',
    })
  })

  test('builds a stable fingerprint for the same request metadata', () => {
    const first = buildPublicSessionDeviceFingerprint({
      ip: '203.0.113.42',
      userAgent: 'Mozilla/5.0',
    })
    const second = buildPublicSessionDeviceFingerprint({
      ip: '203.0.113.42',
      userAgent: 'Mozilla/5.0',
    })

    expect(first).toBe(second)
    expect(first).toHaveLength(32)
  })

  test('detects when a request no longer matches the stored session binding', () => {
    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.42',
        'user-agent': 'Mozilla/5.0',
      },
      socket: {},
      connection: {},
    }

    const session = {
      deviceFingerprint: buildPublicSessionDeviceFingerprint({
        ip: '203.0.113.42',
        userAgent: 'Mozilla/5.0',
      }),
    }

    expect(isPublicSessionBoundToRequest(session, req)).toBe(true)

    const changedRequest = {
      ...req,
      headers: {
        ...req.headers,
        'user-agent': 'Different Browser',
      },
    }

    expect(isPublicSessionBoundToRequest(session, changedRequest)).toBe(false)
  })
})
