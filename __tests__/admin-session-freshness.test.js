import { isFreshAuthenticationTimestamp } from '../lib/auth.mjs'

describe('admin session freshness gate', () => {
  const now = new Date('2026-05-20T10:00:00.000Z')
  const windowMs = 15 * 60 * 1000

  test('accepts authentication timestamps inside the freshness window', () => {
    const authenticatedAt = '2026-05-20T09:50:30.000Z'
    expect(isFreshAuthenticationTimestamp(authenticatedAt, windowMs, now)).toBe(true)
  })

  test('rejects authentication timestamps outside the freshness window', () => {
    const authenticatedAt = '2026-05-20T09:40:00.000Z'
    expect(isFreshAuthenticationTimestamp(authenticatedAt, windowMs, now)).toBe(false)
  })

  test('rejects missing or invalid authentication timestamps', () => {
    expect(isFreshAuthenticationTimestamp(null, windowMs, now)).toBe(false)
    expect(isFreshAuthenticationTimestamp('not-a-date', windowMs, now)).toBe(false)
  })
})
